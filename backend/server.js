require("dotenv").config();

const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const cors = require("cors");
const validator = require("validator");
const { DatabaseSync } = require("node:sqlite");

const app = express();
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}
const PORT = process.env.PORT || 3000;

// ===============================
// DATABASE
// ===============================

const db = new DatabaseSync(
    path.join(__dirname, "salon.db")
);

db.exec("PRAGMA foreign_keys = ON;");

console.log("Database connected successfully!");

// ===============================
// MIDDLEWARE
// ===============================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                "script-src": ["'self'"],
                "script-src-attr": ["'unsafe-inline'"]
            }
        }
    })
);

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
           secure: process.env.NODE_ENV === "production", 
            sameSite: "lax"
        }
    })
);

// ===============================
// RATE LIMITERS
// ===============================

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts. Please try again later."
    }
});

const customerRegisterLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many registration attempts. Please try again later."
    }
});

const customerLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts. Please try again later."
    }
});

// ===============================
// FRONTEND FILES
// ===============================

app.use(express.static(path.join(__dirname, "..")));

app.get("/login.html", function(req, res) {
    res.sendFile(
        path.join(__dirname, "login.html")
    );
});

app.get("/admin.html", function(req, res) {
    res.sendFile(
        path.join(__dirname, "admin.html")
    );
});

/* ===============================
   DATABASE TABLES
   =============================== */

// Users table
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        phone TEXT
    )
`);

// Safely add phone column to older users tables
const userColumns = db.prepare(
    "PRAGMA table_info(users)"
).all();

if (!userColumns.some(column => column.name === "phone")) {
    db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
}

// Customers table
db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT
    )
`);

// Appointments table
db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        service TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Confirmed',
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
`);

// Create admin account from Render environment variables
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    const existingAdmin = db.prepare(
        "SELECT id, role FROM users WHERE email = ?"
    ).get(adminEmail);

    if (!existingAdmin) {
        const hashedPassword = bcrypt.hashSync(adminPassword, 12);

        db.prepare(`
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, ?)
        `).run("Admin", adminEmail, hashedPassword, "admin");

        console.log("Admin account created from environment variables.");
    } else if (existingAdmin.role !== "admin") {
        console.error("ADMIN_EMAIL belongs to a non-admin user.");
    }
}

console.log("Users, customers and bookings tables ready!");


// ===============================
// HELPERS
// ===============================

const servicePrices = {
    "Hair Styling": 499,
    "Facial": 699,
    "Makeup": 999
};

const allowedStatuses = [
    "Pending",
    "Confirmed",
    "Completed",
    "Cancelled"
];

function getPrice(service) {
    return servicePrices[service] || 699;
}

function getIndiaDateTime() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date());

    const value = {};
    for (const part of parts) {
        if (part.type !== "literal") value[part.type] = part.value;
    }

    return {
        date: value.year + "-" + value.month + "-" + value.day,
        time: value.hour + ":" + value.minute
    };
}

function validateAppointmentSlot(date, time) {
    if (
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
        return "Please select a valid appointment date.";
    }

    const [year, month, day] = date.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
    ) {
        return "Please select a valid appointment date.";
    }

    if (
        typeof time !== "string" ||
        !/^(09|1[0-9]):00$/.test(time) ||
        time > "19:00"
    ) {
        return "Appointments must start hourly between 9:00 AM and 7:00 PM.";
    }

    const now = getIndiaDateTime();

    if (date < now.date || (date === now.date && time <= now.time)) {
        return "Please select a future appointment time.";
    }

    return null;
}


// ===============================
// AUTH MIDDLEWARE
// ===============================

function requireLogin(req, res, next) {

    if (!req.session.user) {

        return res.status(401).json({
            success: false,
            message: "Please login first."
        });

    }

    next();
}

function requireAdmin(req, res, next) {

    if (!req.session.user) {

        return res.status(401).json({
            success: false,
            message: "Please login first."
        });

    }

    if (req.session.user.role !== "admin") {

        return res.status(403).json({
            success: false,
            message: "Admin access required."
        });

    }

    next();
}

function requireCustomer(req, res, next) {

    if (!req.session.user) {

        return res.status(401).json({
            success: false,
            message: "Please login first."
        });

    }

    if (req.session.user.role !== "customer") {

        return res.status(403).json({
            success: false,
            message: "Customer access required."
        });

    }

    if (!req.session.user.phone) {

        return res.status(403).json({
            success: false,
            message: "Customer phone number is not connected."
        });

    }

    next();
}

// ===============================
// HOME
// ===============================

app.get("/", function(req, res) {

    res.sendFile(
        path.join(__dirname, "..", "index.html")
    );

});

// ===============================
// AVAILABILITY
// ===============================

app.get("/availability", function(req, res) {

    try {

        const {
            date,
            time
        } = req.query;

        if (!date || !time) {

            return res.status(400).json({
                success: false,
                message: "Date and time are required."
            });

        }

        const slotError = validateAppointmentSlot(date, time);

        if (slotError) {
            return res.status(400).json({
                success: false,
                available: false,
                message: slotError
            });
        }

        const booking = db.prepare(`
            SELECT id
            FROM bookings
            WHERE date = ?
            AND time = ?
            AND status != 'Cancelled'
            LIMIT 1
        `).get(
            date,
            time
        );

        if (booking) {

            return res.json({
                success: true,
                available: false,
                message: "This time slot is already booked."
            });

        }

        res.json({
            success: true,
            available: true,
            message: "This time slot is available."
        });

    } catch (error) {

        console.error(
            "Availability error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Availability check failed."
        });

    }

});

// ===============================
// CREATE BOOKING
// TRANSACTION ENABLED
// ===============================

app.post("/bookings", function(req, res) {

    let transactionStarted = false;

    try {

        const {
            name,
            phone,
            service,
            date,
            time
        } = req.body;

        if (
            !name ||
            !phone ||
            !service ||
            !date ||
            !time
        ) {

            return res.status(400).json({
                success: false,
                message: "All booking fields are required."
            });

        }

        const slotError = validateAppointmentSlot(date, time);

        if (slotError) {
            return res.status(400).json({
                success: false,
                message: slotError
            });
        }

        if (!servicePrices[service]) {

            return res.status(400).json({
                success: false,
                message: "Invalid service selected."
            });

        }

        const cleanPhone =
            String(phone).trim();

        if (
            !validator.isNumeric(cleanPhone) ||
            !validator.isLength(cleanPhone, {
                min: 10,
                max: 15
            })
        ) {

            return res.status(400).json({
                success: false,
                message: "Please enter a valid phone number."
            });

        }

        const cleanName =
            String(name).trim();

        if (
            !validator.isLength(cleanName, {
                min: 2,
                max: 50
            })
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Name must be between 2 and 50 characters."
            });

        }

        db.exec("BEGIN TRANSACTION");

        transactionStarted = true;

        const existingBooking = db.prepare(`
            SELECT id
            FROM bookings
            WHERE date = ?
            AND time = ?
            AND status != 'Cancelled'
            LIMIT 1
        `).get(
            date,
            time
        );

        if (existingBooking) {

            db.exec("ROLLBACK");

            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "This time slot is already booked."
            });

        }

        let customer = db.prepare(`
            SELECT id
            FROM customers
            WHERE phone = ?
            LIMIT 1
        `).get(
            cleanPhone
        );

        let customerId;

        if (customer) {

            customerId =
                customer.id;

            db.prepare(`
                UPDATE customers
                SET name = ?
                WHERE id = ?
            `).run(
                cleanName,
                customerId
            );

        } else {

            const customerResult =
                db.prepare(`
                    INSERT INTO customers
                    (
                        name,
                        phone
                    )
                    VALUES (?, ?)
                `).run(
                    cleanName,
                    cleanPhone
                );

            customerId =
                Number(
                    customerResult.lastInsertRowid
                );

        }

        const price =
            getPrice(service);

        const bookingResult =
            db.prepare(`
                INSERT INTO bookings
                (
                    customer_id,
                    service,
                    date,
                    time,
                    price,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                customerId,
                service,
                date,
                time,
                price,
                "Confirmed"
            );

        const bookingId =
            Number(
                bookingResult.lastInsertRowid
            );

        db.exec("COMMIT");

        transactionStarted = false;

        res.status(201).json({

            success: true,

            message:
                "Booking created successfully!",

            booking: {

                id: bookingId,

                name: cleanName,

                phone: cleanPhone,

                service: service,

                price: price,

                date: date,

                time: time,

                status: "Confirmed"

            }

        });

    } catch (error) {

        if (transactionStarted) {

            try {
                db.exec("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "Rollback error:",
                    rollbackError
                );
            }

        }

        console.error(
            "Booking error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Booking failed. No partial database changes were saved."

        });

    }

});

// ===============================
// GET ALL BOOKINGS
// ADMIN ONLY
// ===============================

app.get(
    "/bookings",
    requireAdmin,
    function(req, res) {

        try {

            const bookings =
                db.prepare(`
                    SELECT
                        b.id,
                        c.name,
                        c.phone,
                        c.email,
                        b.service,
                        b.date,
                        b.time,
                        b.price,
                        b.status,
                        b.customer_id
                    FROM bookings b
                    JOIN customers c
                        ON b.customer_id = c.id
                    ORDER BY b.id DESC
                `).all();

            res.json({
                success: true,
                bookings: bookings
            });

        } catch (error) {

            console.error(
                "Get bookings error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not load bookings."

            });

        }

    }
);

// ===============================
// GET ONE BOOKING
// ADMIN ONLY
// ===============================

app.get(
    "/bookings/:id",
    requireAdmin,
    function(req, res) {

        try {

            const id =
                Number(req.params.id);

            const booking =
                db.prepare(`
                    SELECT
                        b.id,
                        b.customer_id,
                        c.name,
                        c.phone,
                        c.email,
                        b.service,
                        b.date,
                        b.time,
                        b.price,
                        b.status
                    FROM bookings b
                    JOIN customers c
                        ON b.customer_id = c.id
                    WHERE b.id = ?
                `).get(id);

            if (!booking) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Booking not found."

                });

            }

            res.json({

                success: true,

                booking: booking

            });

        } catch (error) {

            console.error(
                "Get booking error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not load booking."

            });

        }

    }
);

// ===============================
// UPDATE BOOKING
// ADMIN ONLY
// TRANSACTION ENABLED
// ===============================

app.patch(
    "/bookings/:id",
    requireAdmin,
    function(req, res) {

        let transactionStarted = false;

        try {

            const id =
                Number(req.params.id);

            const {
                name,
                phone,
                service,
                date,
                time,
                status
            } = req.body;

            const existing =
                db.prepare(`
                    SELECT *
                    FROM bookings
                    WHERE id = ?
                `).get(id);

            if (!existing) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Booking not found."

                });

            }

            const newStatus =
                status || existing.status;

            if (
                !allowedStatuses.includes(
                    newStatus
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid booking status."

                });

            }

            const customer =
                db.prepare(`
                    SELECT *
                    FROM customers
                    WHERE id = ?
                `).get(
                    existing.customer_id
                );

            if (!customer) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Customer not found."

                });

            }

            const newName =
                name !== undefined
                    ? String(name).trim()
                    : customer.name;

            const newPhone =
                phone !== undefined
                    ? String(phone).trim()
                    : customer.phone;

            const newService =
                service || existing.service;

            const newDate =
                date || existing.date;

            const newTime =
                time || existing.time;

            if (
                newDate !== existing.date ||
                newTime !== existing.time
            ) {
                const slotError = validateAppointmentSlot(newDate, newTime);

                if (slotError) {
                    return res.status(400).json({
                        success: false,
                        message: slotError
                    });
                }
            }

            if (
                !newName ||
                !newPhone ||
                !newService ||
                !newDate ||
                !newTime
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Required booking information is missing."

                });

            }

            if (
                !validator.isLength(newName, {
                    min: 2,
                    max: 50
                })
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Name must be between 2 and 50 characters."

                });

            }

            if (!servicePrices[newService]) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid service."

                });

            }

            if (
                !validator.isNumeric(newPhone) ||
                !validator.isLength(newPhone, {
                    min: 10,
                    max: 15
                })
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid phone number."

                });

            }

            const anotherCustomer =
                db.prepare(`
                    SELECT id
                    FROM customers
                    WHERE phone = ?
                    AND id != ?
                    LIMIT 1
                `).get(
                    newPhone,
                    existing.customer_id
                );

            if (anotherCustomer) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Another customer already uses this phone number."

                });

            }

            db.exec("BEGIN TRANSACTION");

            transactionStarted = true;

            const conflict =
                db.prepare(`
                    SELECT id
                    FROM bookings
                    WHERE date = ?
                    AND time = ?
                    AND id != ?
                    AND status != 'Cancelled'
                    LIMIT 1
                `).get(
                    newDate,
                    newTime,
                    id
                );

            if (conflict) {

                db.exec("ROLLBACK");

                transactionStarted = false;

                return res.status(409).json({

                    success: false,

                    message:
                        "This time slot is already booked."

                });

            }

            db.prepare(`
                UPDATE customers
                SET
                    name = ?,
                    phone = ?
                WHERE id = ?
            `).run(
                newName,
                newPhone,
                existing.customer_id
            );

            const newPrice =
                getPrice(newService);

            db.prepare(`
                UPDATE bookings
                SET
                    service = ?,
                    date = ?,
                    time = ?,
                    price = ?,
                    status = ?
                WHERE id = ?
            `).run(
                newService,
                newDate,
                newTime,
                newPrice,
                newStatus,
                id
            );

            db.exec("COMMIT");

            transactionStarted = false;

            const updated =
                db.prepare(`
                    SELECT
                        b.id,
                        b.customer_id,
                        c.name,
                        c.phone,
                        c.email,
                        b.service,
                        b.date,
                        b.time,
                        b.price,
                        b.status
                    FROM bookings b
                    JOIN customers c
                        ON b.customer_id = c.id
                    WHERE b.id = ?
                `).get(id);

            res.json({

                success: true,

                message:
                    "Booking updated successfully!",

                booking: updated

            });

        } catch (error) {

            if (transactionStarted) {

                try {
                    db.exec("ROLLBACK");
                } catch (rollbackError) {
                    console.error(
                        "Rollback error:",
                        rollbackError
                    );
                }

            }

            console.error(
                "Update error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Booking update failed. No partial database changes were saved."

            });

        }

    }
);

// ===============================
// DELETE BOOKING
// ADMIN ONLY
// ===============================

app.delete(
    "/bookings/:id",
    requireAdmin,
    function(req, res) {

        try {

            const id =
                Number(req.params.id);

            const booking =
                db.prepare(`
                    SELECT customer_id
                    FROM bookings
                    WHERE id = ?
                `).get(id);

            if (!booking) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Booking not found."

                });

            }

            db.prepare(`
                DELETE FROM bookings
                WHERE id = ?
            `).run(id);

            res.json({

                success: true,

                message:
                    "Booking deleted successfully!"

            });

        } catch (error) {

            console.error(
                "Delete error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Delete failed."

            });

        }

    }
);

// ======================================================
// EXISTING ADMIN LOGIN
// DO NOT CHANGE
// ======================================================

app.post(
    "/login",
    loginLimiter,
    function(req, res) {

        try {

            const email =
                String(
                    req.body.email || ""
                )
                .trim()
                .toLowerCase();

            const password =
                String(
                    req.body.password || ""
                );

            if (!email || !password) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and password are required."

                });

            }

            const user =
                db.prepare(`
                    SELECT *
                    FROM users
                    WHERE email = ?
                    LIMIT 1
                `).get(email);

            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }

            const passwordCorrect =
                bcrypt.compareSync(
                    password,
                    user.password
                );

            if (!passwordCorrect) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }

            req.session.user = {

                id: user.id,

                name: user.name,

                email: user.email,

                role: user.role

            };

            res.json({

                success: true,

                message:
                    "Login successful!",

                user:
                    req.session.user

            });

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Login failed."

            });

        }

    }
);

// ======================================================
// STEP 39B
// CUSTOMER REGISTRATION
// ======================================================

app.post(
    "/customer/register",
    customerRegisterLimiter,
    function(req, res) {

        try {

            const name =
                String(
                    req.body.name || ""
                ).trim();

            const email =
                String(
                    req.body.email || ""
                )
                .trim()
                .toLowerCase();

            const phone =
                String(
                    req.body.phone || ""
                ).trim();

            const password =
                String(
                    req.body.password || ""
                );

            // -------------------------------
            // NAME
            // -------------------------------

            if (
                !validator.isLength(name, {
                    min: 2,
                    max: 50
                })
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Name must be between 2 and 50 characters."

                });

            }

            // -------------------------------
            // EMAIL
            // -------------------------------

            if (!validator.isEmail(email)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a valid email address."

                });

            }

            // -------------------------------
            // PHONE
            // -------------------------------

            if (
                !validator.isNumeric(phone) ||
                !validator.isLength(phone, {
                    min: 10,
                    max: 15
                })
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a valid phone number."

                });

            }

            // -------------------------------
            // PASSWORD
            // -------------------------------

            if (
                password.length < 8 ||
                password.length > 128
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Password must be between 8 and 128 characters."

                });

            }

            // -------------------------------
            // CHECK EMAIL
            // -------------------------------

            const existingEmail =
                db.prepare(`
                    SELECT id, role
                    FROM users
                    WHERE email = ?
                    LIMIT 1
                `).get(email);

            if (existingEmail) {

                return res.status(409).json({

                    success: false,

                    message:
                        "An account with this email already exists."

                });

            }

            // -------------------------------
            // CHECK PHONE
            // -------------------------------

            const existingPhone =
                db.prepare(`
                    SELECT id
                    FROM users
                    WHERE phone = ?
                    LIMIT 1
                `).get(phone);

            if (existingPhone) {

                return res.status(409).json({

                    success: false,

                    message:
                        "An account with this phone number already exists."

                });

            }

            // -------------------------------
            // PASSWORD HASH
            // -------------------------------

            const hashedPassword =
                bcrypt.hashSync(
                    password,
                    12
                );

            // -------------------------------
            // CREATE CUSTOMER ACCOUNT
            // ROLE IS ALWAYS CUSTOMER
            // -------------------------------

            const result =
                db.prepare(`
                    INSERT INTO users
                    (
                        name,
                        email,
                        password,
                        role,
                        phone
                    )
                    VALUES (?, ?, ?, 'customer', ?)
                `).run(
                    name,
                    email,
                    hashedPassword,
                    phone
                );

            const userId =
                Number(
                    result.lastInsertRowid
                );

            res.status(201).json({

                success: true,

                message:
                    "Customer account created successfully!",

                user: {

                    id: userId,

                    name: name,

                    email: email,

                    phone: phone,

                    role: "customer"

                }

            });

        } catch (error) {

            console.error(
                "Customer registration error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Customer registration failed."

            });

        }

    }
);

// ======================================================
// CUSTOMER LOGIN
// SEPARATE FROM ADMIN LOGIN
// ======================================================

app.post(
    "/customer/login",
    customerLoginLimiter,
    function(req, res) {

        try {

            const email =
                String(
                    req.body.email || ""
                )
                .trim()
                .toLowerCase();

            const password =
                String(
                    req.body.password || ""
                );

            if (!email || !password) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and password are required."

                });

            }

            const user =
                db.prepare(`
                    SELECT
                        id,
                        name,
                        email,
                        password,
                        role,
                        phone
                    FROM users
                    WHERE email = ?
                    LIMIT 1
                `).get(email);

            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }

            if (user.role !== "customer") {

                return res.status(403).json({

                    success: false,

                    message:
                        "This login is only for customer accounts."

                });

            }

            const passwordCorrect =
                bcrypt.compareSync(
                    password,
                    user.password
                );

            if (!passwordCorrect) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }

            if (!user.phone) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Your customer account does not have a phone number connected."

                });

            }

            // Prevent session fixation
            req.session.regenerate(
                function(error) {

                    if (error) {

                        console.error(
                            "Customer session error:",
                            error
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Customer login failed."

                        });

                    }

                    req.session.user = {

                        id: user.id,

                        name: user.name,

                        email: user.email,

                        phone: user.phone,

                        role: "customer"

                    };

                    res.json({

                        success: true,

                        message:
                            "Customer login successful!",

                        user:
                            req.session.user

                    });

                }
            );

        } catch (error) {

            console.error(
                "Customer login error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Customer login failed."

            });

        }

    }
);

// ======================================================
// CUSTOMER CURRENT USER
// ======================================================

app.get(
    "/customer/me",
    requireCustomer,
    function(req, res) {

        res.json({

            success: true,

            user:
                req.session.user

        });

    }
);

// ======================================================
// CUSTOMER DASHBOARD APPOINTMENTS
// ONLY LOGGED-IN CUSTOMER'S BOOKINGS
// ======================================================

app.get(
    "/customer/appointments",
    requireCustomer,
    function(req, res) {

        try {

            const phone =
                req.session.user.phone;

            const bookings =
                db.prepare(`
                    SELECT
                        b.id,
                        c.name,
                        c.phone,
                        b.service,
                        b.date,
                        b.time,
                        b.price,
                        b.status
                    FROM bookings b
                    JOIN customers c
                        ON b.customer_id = c.id
                    WHERE c.phone = ?
                    ORDER BY
                        b.date ASC,
                        b.time ASC,
                        b.id DESC
                `).all(phone);

            res.json({

                success: true,

                bookings: bookings

            });

        } catch (error) {

            console.error(
                "Customer appointments error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not load customer appointments."

            });

        }

    }
);

// ======================================================
// CUSTOMER BOOKING SEARCH
// SESSION-BASED OWNERSHIP
// ======================================================

app.get(
    "/customer/booking",
    requireCustomer,
    function(req, res) {

        try {

            const bookingId =
                Number(req.query.bookingId);

            if (
                !Number.isInteger(bookingId) ||
                bookingId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Valid booking ID is required."

                });

            }

            const customerPhone =
                req.session.user.phone;

            const booking =
                db.prepare(`
                    SELECT
                        b.id,
                        c.name,
                        c.phone,
                        b.service,
                        b.date,
                        b.time,
                        b.price,
                        b.status
                    FROM bookings b
                    JOIN customers c
                        ON b.customer_id = c.id
                    WHERE
                        b.id = ?
                        AND c.phone = ?
                    LIMIT 1
                `).get(
                    bookingId,
                    customerPhone
                );

            if (!booking) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Booking not found."

                });

            }

            res.json({

                success: true,

                booking: booking

            });

        } catch (error) {

            console.error(
                "Customer booking lookup error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not load booking."

            });

        }

    }
);

// ======================================================
// CUSTOMER CANCEL BOOKING
// SESSION-BASED OWNERSHIP
// DOES NOT DELETE RECORD
// ======================================================

app.post(
    "/customer/booking/:id/cancel",
    requireCustomer,
    function(req, res) {

        let transactionStarted = false;

        try {

            const bookingId =
                Number(req.params.id);

            if (
                !Number.isInteger(bookingId) ||
                bookingId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Valid booking ID is required."

                });

            }

            const customerPhone =
                req.session.user.phone;

            const booking =
                db.prepare(`
                    SELECT
                        b.id,
                        b.status,
                        c.phone
                    FROM bookings b
                    JOIN customers c
                        ON b.customer_id = c.id
                    WHERE
                        b.id = ?
                        AND c.phone = ?
                    LIMIT 1
                `).get(
                    bookingId,
                    customerPhone
                );

            if (!booking) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Booking not found."

                });

            }

            if (
                booking.status === "Cancelled"
            ) {

                return res.json({

                    success: true,

                    message:
                        "This booking is already cancelled."

                });

            }

            if (
                booking.status === "Completed"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Completed bookings cannot be cancelled."

                });

            }

            db.exec("BEGIN TRANSACTION");

            transactionStarted = true;

            db.prepare(`
                UPDATE bookings
                SET status = 'Cancelled'
                WHERE id = ?
            `).run(bookingId);

            db.exec("COMMIT");

            transactionStarted = false;

            res.json({

                success: true,

                message:
                    "Booking cancelled successfully."

            });

        } catch (error) {

            if (transactionStarted) {

                try {

                    db.exec("ROLLBACK");

                } catch (rollbackError) {

                    console.error(
                        "Rollback error:",
                        rollbackError
                    );

                }

            }

            console.error(
                "Customer cancellation error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Booking cancellation failed."

            });

        }

    }
);

// ======================================================
// CUSTOMER RESCHEDULE BOOKING
// SESSION-BASED OWNERSHIP
// ======================================================

app.post(
    "/customer/booking/:id/reschedule",
    requireCustomer,
    function(req, res) {

        let transactionStarted = false;

        try {

            const bookingId =
                Number(req.params.id);

            const newDate =
                String(
                    req.body.date || ""
                ).trim();

            const newTime =
                String(
                    req.body.time || ""
                ).trim();

            if (
                !Number.isInteger(bookingId) ||
                bookingId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Valid booking ID is required."

                });

            }

            if (!newDate || !newTime) {

                return res.status(400).json({

                    success: false,

                    message:
                        "New date and time are required."

                });

            }

            const slotError = validateAppointmentSlot(newDate, newTime);

            if (slotError) {
                return res.status(400).json({
                    success: false,
                    message: slotError
                });
            }

            const customerPhone =
                req.session.user.phone;

            const booking =
                db.prepare(`
                    SELECT
                        b.id,
                        b.date,
                        b.time,
                        b.status,
                        c.phone
                    FROM bookings b
                    JOIN customers c
                        ON b.customer_id = c.id
                    WHERE
                        b.id = ?
                        AND c.phone = ?
                    LIMIT 1
                `).get(
                    bookingId,
                    customerPhone
                );

            if (!booking) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Booking not found."

                });

            }

            if (
                booking.status === "Cancelled"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Cancelled bookings cannot be rescheduled."

                });

            }

            if (
                booking.status === "Completed"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Completed bookings cannot be rescheduled."

                });

            }

            if (
                booking.date === newDate &&
                booking.time === newTime
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select a different date or time."

                });

            }

            db.exec("BEGIN TRANSACTION");

            transactionStarted = true;

            const conflict =
                db.prepare(`
                    SELECT id
                    FROM bookings
                    WHERE
                        date = ?
                        AND time = ?
                        AND id != ?
                        AND status != 'Cancelled'
                    LIMIT 1
                `).get(
                    newDate,
                    newTime,
                    bookingId
                );

            if (conflict) {

                db.exec("ROLLBACK");

                transactionStarted = false;

                return res.status(409).json({

                    success: false,

                    message:
                        "This time slot is already booked."

                });

            }

            db.prepare(`
                UPDATE bookings
                SET
                    date = ?,
                    time = ?
                WHERE id = ?
            `).run(
                newDate,
                newTime,
                bookingId
            );

            db.exec("COMMIT");

            transactionStarted = false;

            const updated =
                db.prepare(`
                    SELECT
                        b.id,
                        c.name,
                        c.phone,
                        b.service,
                        b.date,
                        b.time,
                        b.price,
                        b.status
                    FROM bookings b
                    JOIN customers c
                        ON b.customer_id = c.id
                    WHERE b.id = ?
                `).get(bookingId);

            res.json({

                success: true,

                message:
                    "Booking rescheduled successfully.",

                booking:
                    updated

            });

        } catch (error) {

            if (transactionStarted) {

                try {

                    db.exec("ROLLBACK");

                } catch (rollbackError) {

                    console.error(
                        "Rollback error:",
                        rollbackError
                    );

                }

            }

            console.error(
                "Customer reschedule error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Booking reschedule failed."

            });

        }

    }
);

// ===============================
// ADMIN CHECK
// ===============================

app.get(
    "/admin",
    requireAdmin,
    function(req, res) {

        res.json({

            success: true,

            message:
                "Admin access granted.",

            user:
                req.session.user

        });

    }
);

// ===============================
// CURRENT USER
// EXISTING ROUTE
// ===============================

app.get(
    "/me",
    requireLogin,
    function(req, res) {

        res.json({

            success: true,

            user:
                req.session.user

        });

    }
);

// ===============================
// LOGOUT
// ===============================

app.post(
    "/logout",
    function(req, res) {

        req.session.destroy(
            function(error) {

                if (error) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Logout failed."

                    });

                }

                res.clearCookie(
                    "connect.sid"
                );

                res.json({

                    success: true,

                    message:
                        "Logout successful!"

                });

            }
        );

    }
);

// ===============================
// 404
// ===============================

app.use(
    function(req, res) {

        res.status(404).json({

            success: false,

            message:
                "Route not found."

        });

    }
);

// ===============================
// ERROR HANDLER
// ===============================

app.use(
    function(error, req, res, next) {

        console.error(
            "Server error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Internal server error."

        });

    }
);

// ===============================
// START SERVER
// ===============================

app.listen(
    PORT,
    function() {

        console.log(
            "Server running on port " +
            PORT
        );

    }
);
