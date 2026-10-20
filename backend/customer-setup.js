const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync(
    path.join(__dirname, "salon.db")
);

console.log("Checking customer account database setup...");

try {

    // Check whether phone column already exists
    const columns = db.prepare(`
        PRAGMA table_info(users)
    `).all();

    const phoneColumnExists =
        columns.some(function(column) {
            return column.name === "phone";
        });

    if (phoneColumnExists) {

        console.log(
            "✅ Phone column already exists. No database change needed."
        );

    } else {

        db.exec(`
            ALTER TABLE users
            ADD COLUMN phone TEXT
        `);

        console.log(
            "✅ Phone column added successfully."
        );
    }

    // Verify final structure
    const updatedColumns =
        db.prepare(`
            PRAGMA table_info(users)
        `).all();

    console.log("");
    console.log("Current users table:");

    updatedColumns.forEach(function(column) {

        console.log(
            column.cid +
            " | " +
            column.name +
            " | " +
            column.type
        );

    });

    console.log("");
    console.log("✅ Customer account database setup completed.");

} catch (error) {

    console.error(
        "❌ Customer setup failed:",
        error
    );

} finally {

    db.close();

}