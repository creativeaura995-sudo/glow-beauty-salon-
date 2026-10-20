// ================================
// FAQ
// ================================

const faqQuestions = document.querySelectorAll(".faq-question");

faqQuestions.forEach(function(question) {

    question.addEventListener("click", function() {

        const faqItem = question.parentElement;

        faqItem.classList.toggle("active");

    });

});


// ================================
// MOBILE MENU
// ================================

const menuButton = document.getElementById("menuButton");
const navMenu = document.getElementById("navMenu");

if (menuButton && navMenu) {

    menuButton.addEventListener("click", function() {

        navMenu.classList.toggle("active");

    });

}

const navLinks = document.querySelectorAll("#navMenu a");

navLinks.forEach(function(link) {

    link.addEventListener("click", function() {

        navMenu.classList.remove("active");

    });

});


// ================================
// BOOKING ELEMENTS
// ================================

const bookingForm =
    document.getElementById("bookingForm");

const bookingMessage =
    document.getElementById("bookingMessage");

const dateInput =
    document.getElementById("date");

const now = new Date();
dateInput.min = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;


const timeSelect =
    document.getElementById("time");

const slotStatus =
    document.getElementById("slotStatus");


// ================================
// TIME SLOTS
// ================================

const timeOptions = [

    { value: "09:00", text: "09:00 AM" },
    { value: "09:30", text: "09:30 AM" },

    { value: "10:00", text: "10:00 AM" },
    { value: "10:30", text: "10:30 AM" },

    { value: "11:00", text: "11:00 AM" },
    { value: "11:30", text: "11:30 AM" },

    { value: "12:00", text: "12:00 PM" },
    { value: "12:30", text: "12:30 PM" },

    { value: "13:00", text: "01:00 PM" },
    { value: "13:30", text: "01:30 PM" },

    { value: "14:00", text: "02:00 PM" },
    { value: "14:30", text: "02:30 PM" },

    { value: "15:00", text: "03:00 PM" },
    { value: "15:30", text: "03:30 PM" },

    { value: "16:00", text: "04:00 PM" },
    { value: "16:30", text: "04:30 PM" },

    { value: "17:00", text: "05:00 PM" },
    { value: "17:20", text: "05:20 PM" },
    { value: "17:30", text: "05:30 PM" },

    { value: "18:00", text: "06:00 PM" },
    { value: "18:30", text: "06:30 PM" },

    { value: "19:00", text: "07:00 PM" },
    { value: "19:30", text: "07:30 PM" },

    { value: "20:00", text: "08:00 PM" }

];


// ================================
// FORMAT TIME
// ================================

function formatTime(time) {

    if (!time) {
        return "";
    }

    const parts = time.split(":");

    let hours = Number(parts[0]);

    const minutes = parts[1];

    const period = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;

    if (hours === 0) {
        hours = 12;
    }

    return hours + ":" + minutes + " " + period;

}


// ================================
// LOAD TIME SLOTS
// ================================

function loadTimeSlots() {

    const selectedDate = dateInput.value;

    if (!selectedDate) {

        timeSelect.innerHTML =
            '<option value="">Choose a time</option>';

        return;

    }

    timeSelect.innerHTML =
        '<option value="">Checking slots...</option>';

    timeSelect.disabled = true;


    const requests = timeOptions.map(function(slot) {

        return fetch(
            "/availability?date=" +
            encodeURIComponent(selectedDate) +
            "&time=" +
            encodeURIComponent(slot.value)
        )

        .then(function(response) {

            return response.json();

        })

        .then(function(data) {

            return {

                value: slot.value,

                text: slot.text,

                available: data.available === true

            };

        })

        .catch(function(error) {

            console.error(error);

            return {

                value: slot.value,

                text: slot.text,

                available: true

            };

        });

    });


    Promise.all(requests)

        .then(function(results) {

            timeSelect.innerHTML =
                '<option value="">Choose a time</option>';


            results.forEach(function(slot) {

                const option =
                    document.createElement("option");

                option.value = slot.value;


                if (slot.available) {

                    option.textContent =
                        slot.text + " — Available";

                    option.disabled = false;

                } else {

                    option.textContent =
                        slot.text + " — 🔒 Booked";

                    option.disabled = true;

                }

                timeSelect.appendChild(option);

            });


            timeSelect.disabled = false;


            slotStatus.textContent =
                "🟢 Available slots can be selected. 🔒 Booked slots are disabled.";

            slotStatus.style.display = "block";

        });

}


// ================================
// CHECK SELECTED SLOT
// ================================

async function checkTimeAvailability() {

    const date = dateInput.value;

    const time = timeSelect.value;


    if (!date || !time) {

        return false;

    }


    slotStatus.textContent =
        "Checking this time slot...";

    slotStatus.style.display =
        "block";


    try {

        const response = await fetch(
            "/availability?date=" +
            encodeURIComponent(date) +
            "&time=" +
            encodeURIComponent(time)
        );


        const data =
            await response.json();


        if (data.available) {

            slotStatus.textContent =
                "🟢 This time slot is available.";

            return true;

        }


        slotStatus.textContent =
            "🔴 This time slot is already booked.";

        return false;

    }

    catch (error) {

        console.error(error);

        slotStatus.textContent =
            "Unable to check availability.";

        return false;

    }

}


// ================================
// DATE CHANGE
// ================================

dateInput.addEventListener(
    "change",
    function() {

        bookingMessage.style.display =
            "none";

        slotStatus.style.display =
            "none";

        timeSelect.innerHTML =
            '<option value="">Choose a time</option>';


        if (dateInput.value) {

            loadTimeSlots();

        }

    }
);


// ================================
// TIME CHANGE
// ================================

timeSelect.addEventListener(
    "change",
    async function() {

        await checkTimeAvailability();

    }
);


// ================================
// BOOKING SUBMIT
// ================================

bookingForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const name =
            document.getElementById("name").value.trim();

        const phone =
            document.getElementById("phone").value.trim();

        const service =
            document.getElementById("service").value;

        const date =
            dateInput.value;

        const time =
            timeSelect.value;


        if (
            !name ||
            !phone ||
            !service ||
            !date ||
            !time
        ) {

            bookingMessage.textContent =
                "Please fill all required fields.";

            bookingMessage.style.display =
                "block";

            return;

        }


        bookingMessage.textContent =
            "Confirming your appointment...";

        bookingMessage.style.display =
            "block";


        const available =
            await checkTimeAvailability();


        if (!available) {

            bookingMessage.textContent =
                "Booking failed: This time slot is already booked.";

            return;

        }


        try {

            const response = await fetch(
                "/bookings",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        name: name,

                        phone: phone,

                        service: service,

                        date: date,

                        time: time

                    })

                }
            );


            const data =
                await response.json();


            if (response.ok) {

                // ==================================
                // BOOKING ID
                // ==================================

                const bookingId =
                    data.booking &&
                    data.booking.id
                        ? data.booking.id
                        : "Confirmed";


                // ==================================
                // PRICE
                // ==================================

                let price = 0;


                if (data.booking &&
                    data.booking.price) {

                    price =
                        Number(data.booking.price);

                }

                else {

                    if (service === "Hair Styling") {

                        price = 499;

                    }

                    else if (service === "Facial") {

                        price = 699;

                    }

                    else if (service === "Makeup") {

                        price = 999;

                    }

                }


                // ==================================
                // PROFESSIONAL CONFIRMATION
                // ==================================

                bookingMessage.innerHTML =

                    "<div class='booking-confirmation'>" +

                    "<h3>🎉 Booking Confirmed!</h3>" +

                    "<p>Your appointment has been successfully booked.</p>" +

                    "<hr>" +

                    "<p><strong>🆔 Booking ID:</strong> " +
                    bookingId +
                    "</p>" +

                    "<p><strong>👤 Name:</strong> " +
                    name +
                    "</p>" +

                    "<p><strong>💇 Service:</strong> " +
                    service +
                    "</p>" +

                    "<p><strong>💰 Price:</strong> ₹" +
                    price +
                    "</p>" +

                    "<p><strong>📅 Date:</strong> " +
                    date +
                    "</p>" +

                    "<p><strong>⏰ Time:</strong> " +
                    formatTime(time) +
                    "</p>" +

                    "<p><strong>✅ Status:</strong> Confirmed</p>" +

                    "<hr>" +

"<p>Thank you for choosing Glow Beauty Salon ✨</p>" +

"<div class='manage-appointment-box'>" +

"<a href='/customer-appointment.html' " +
"class='manage-appointment-button'>" +
"📋 Manage My Appointment" +
"</a>" +

"</div>" +

"</div>";
              
                bookingMessage.style.display =
                    "block";


                // Reset form

                bookingForm.reset();


                timeSelect.innerHTML =
                    '<option value="">Choose a time</option>';


                slotStatus.textContent = "";

                slotStatus.style.display =
                    "none";


            }

            else {

                bookingMessage.textContent =
                    "Booking failed: " +
                    data.message;

                bookingMessage.style.display =
                    "block";

            }

        }

        catch (error) {

            console.error(error);

            bookingMessage.textContent =
                "Unable to connect to the booking server.";

            bookingMessage.style.display =
                "block";

        }

    }
);
