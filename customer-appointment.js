// ========================================
// CUSTOMER APPOINTMENT MANAGEMENT
// STEP 44
// RETURN-TO-APPOINTMENT LOGIN FLOW
// STATUS-AWARE APPOINTMENT UX
// SESSION-BASED BOOKING OWNERSHIP
// ========================================


// ================================
// ELEMENTS
// ================================

const appointmentForm =
    document.getElementById("appointmentForm");

const bookingIdInput =
    document.getElementById("bookingId");

const checkBtn =
    document.getElementById("checkBtn");

const searchMessage =
    document.getElementById("searchMessage");

const bookingSection =
    document.getElementById("bookingSection");

const bookingMessage =
    document.getElementById("bookingMessage");

const cancelBtn =
    document.getElementById("cancelBtn");

const cancelArea =
    document.getElementById("cancelArea");

const newSearchBtn =
    document.getElementById("newSearchBtn");

const bookingStatus =
    document.getElementById("bookingStatus");


// ================================
// AUTO REFRESH
// ================================

let autoRefreshTimer = null;


// ================================
// RESCHEDULE ELEMENTS
// ================================

const newDateInput =
    document.getElementById("newDate");

const newTimeInput =
    document.getElementById("newTime");

const checkSlotBtn =
    document.getElementById("checkSlotBtn");

const slotMessage =
    document.getElementById("slotMessage");

const rescheduleBtn =
    document.getElementById("rescheduleBtn");

const rescheduleArea =
    document.getElementById("rescheduleArea");


// ================================
// STATE
// ================================

let currentBooking = null;

let selectedNewSlot = null;


// ================================
// LOGIN REDIRECT
// ================================

function redirectToLogin(bookingId) {

    if (!bookingId) {

        window.location.href =
            "/customer-auth.html";

        return;

    }

    const returnTo =
        "/customer-appointment.html?bookingId=" +
        encodeURIComponent(bookingId);

    window.location.href =
        "/customer-auth.html?returnTo=" +
        encodeURIComponent(returnTo);

}


// ================================
// MESSAGE
// ================================

function showMessage(
    element,
    message,
    type
) {

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.className =
        "message " + type;

    element.style.display =
        "block";

}


function showSlotMessage(
    message,
    type
) {

    if (!slotMessage) {
        return;
    }

    slotMessage.textContent =
        message;

    slotMessage.className =
        "slot-message " + type;

    slotMessage.style.display =
        "block";

}


// ================================
// STOP AUTO REFRESH
// ================================

function stopAutoRefresh() {

    if (autoRefreshTimer) {

        clearInterval(
            autoRefreshTimer
        );

        autoRefreshTimer = null;

    }

}


// ================================
// RESET RESCHEDULE
// ================================

function resetReschedule() {

    selectedNewSlot = null;


    if (newDateInput) {
        newDateInput.value = "";
    }


    if (newTimeInput) {
        newTimeInput.value = "";
    }


    if (slotMessage) {

        slotMessage.textContent =
            "";

        slotMessage.className =
            "slot-message";

        slotMessage.style.display =
            "";

    }


    if (rescheduleBtn) {

        rescheduleBtn.classList.add(
            "hidden"
        );

        rescheduleBtn.disabled =
            false;

        rescheduleBtn.textContent =
            "✅ Confirm Reschedule";

    }


    if (checkSlotBtn) {

        checkSlotBtn.disabled =
            false;

        checkSlotBtn.textContent =
            "🔎 Check New Slot";

    }

}


// ================================
// NORMALIZE STATUS
// ================================

function normalizeStatus(status) {

    return String(
        status || "Pending"
    ).trim();

}


// ================================
// CHECK MANAGEMENT
// ================================

function canManageAppointment(status) {

    const normalizedStatus =
        normalizeStatus(status);

    return (
        normalizedStatus !== "Completed" &&
        normalizedStatus !== "Cancelled"
    );

}


// ================================
// UPDATE RESCHEDULE
// ================================

function updateRescheduleAvailability(
    status
) {

    if (!rescheduleArea) {
        return;
    }

    if (
        canManageAppointment(status)
    ) {

        rescheduleArea.classList.remove(
            "hidden"
        );

    } else {

        rescheduleArea.classList.add(
            "hidden"
        );

    }

}


// ================================
// UPDATE CANCEL
// ================================

function updateCancelAvailability(
    status
) {

    if (!cancelBtn) {
        return;
    }

    const normalizedStatus =
        normalizeStatus(status);


    if (
        normalizedStatus === "Cancelled"
    ) {

        cancelBtn.disabled =
            true;

        cancelBtn.textContent =
            "Appointment Cancelled";


        if (cancelArea) {

            cancelArea.style.background =
                "#f8fafc";

        }

        return;

    }


    if (
        normalizedStatus === "Completed"
    ) {

        cancelBtn.disabled =
            true;

        cancelBtn.textContent =
            "Appointment Completed";


        if (cancelArea) {

            cancelArea.style.background =
                "#f8fafc";

        }

        return;

    }


    cancelBtn.disabled =
        false;

    cancelBtn.textContent =
        "Cancel Appointment";


    if (cancelArea) {

        cancelArea.style.background =
            "#fff7ed";

    }

}


// ================================
// UPDATE STATUS UI
// ================================

function updateStatusUI(status) {

    if (!bookingStatus) {
        return;
    }

    const normalizedStatus =
        normalizeStatus(status);


    bookingStatus.textContent =
        normalizedStatus;


    bookingStatus.style.background =
        "#dcfce7";

    bookingStatus.style.color =
        "#166534";


    if (
        normalizedStatus === "Pending"
    ) {

        bookingStatus.style.background =
            "#fef3c7";

        bookingStatus.style.color =
            "#92400e";

    }


    if (
        normalizedStatus === "Confirmed"
    ) {

        bookingStatus.style.background =
            "#dbeafe";

        bookingStatus.style.color =
            "#1d4ed8";

    }


    if (
        normalizedStatus === "Completed"
    ) {

        bookingStatus.style.background =
            "#e2e8f0";

        bookingStatus.style.color =
            "#334155";

    }


    if (
        normalizedStatus === "Cancelled"
    ) {

        bookingStatus.style.background =
            "#fee2e2";

        bookingStatus.style.color =
            "#991b1b";

    }

}


// ================================
// DISPLAY BOOKING
// ================================

function displayBooking(booking) {

    if (!booking) {
        return;
    }


    currentBooking =
        booking;


    const status =
        normalizeStatus(
            booking.status
        );


    const detailId =
        document.getElementById(
            "detailId"
        );

    const detailName =
        document.getElementById(
            "detailName"
        );

    const detailService =
        document.getElementById(
            "detailService"
        );

    const detailPrice =
        document.getElementById(
            "detailPrice"
        );

    const detailDate =
        document.getElementById(
            "detailDate"
        );

    const detailTime =
        document.getElementById(
            "detailTime"
        );


    if (detailId) {

        detailId.textContent =
            booking.id ?? "-";

    }


    if (detailName) {

        detailName.textContent =
            booking.name ?? "-";

    }


    if (detailService) {

        detailService.textContent =
            booking.service ?? "-";

    }


    if (detailPrice) {

        detailPrice.textContent =
            booking.price != null
                ? "₹" + booking.price
                : "-";

    }


    if (detailDate) {

        detailDate.textContent =
            booking.date ?? "-";

    }


    if (detailTime) {

        detailTime.textContent =
            booking.time ?? "-";

    }


    updateStatusUI(status);

    updateCancelAvailability(status);

    updateRescheduleAvailability(status);


    if (
        !canManageAppointment(status)
    ) {

        resetReschedule();

        stopAutoRefresh();

    }


    if (bookingSection) {

        bookingSection.classList.remove(
            "hidden"
        );

    }

}


// ================================
// AUTO REFRESH
// ================================

async function refreshBookingStatus() {

    if (!currentBooking) {
        return;
    }


    if (
        !canManageAppointment(
            currentBooking.status
        )
    ) {

        stopAutoRefresh();

        return;

    }


    try {

        const response =
            await fetch(
                "/customer/booking?bookingId=" +
                encodeURIComponent(
                    currentBooking.id
                ),
                {
                    credentials: "include"
                }
            );


        const data =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            redirectToLogin(
                currentBooking.id
            );

            return;

        }


        if (
            !response.ok ||
            !data.success ||
            !data.booking
        ) {

            return;

        }


        const latestBooking =
            data.booking;


        const oldStatus =
            normalizeStatus(
                currentBooking.status
            );


        const newStatus =
            normalizeStatus(
                latestBooking.status
            );


        if (
            oldStatus !== newStatus
        ) {

            displayBooking(
                latestBooking
            );


            showMessage(
                bookingMessage,
                `Appointment status updated to ${newStatus}.`,
                "success"
            );


            if (
                !canManageAppointment(
                    newStatus
                )
            ) {

                stopAutoRefresh();

            }

        }

    } catch (error) {

        console.error(
            "Auto refresh error:",
            error
        );

    }

}


// ================================
// START AUTO REFRESH
// ================================

function startAutoRefresh() {

    stopAutoRefresh();


    if (
        !currentBooking ||
        !canManageAppointment(
            currentBooking.status
        )
    ) {

        return;

    }


    autoRefreshTimer =
        setInterval(
            refreshBookingStatus,
            10000
        );

}


// ================================
// LOAD BOOKING
// ================================

async function loadBooking(
    bookingId
) {

    if (!bookingId) {
        return false;
    }


    if (!checkBtn) {
        return false;
    }


    checkBtn.disabled =
        true;

    checkBtn.textContent =
        "Checking...";


    stopAutoRefresh();


    try {

        const response =
            await fetch(
                "/customer/booking?bookingId=" +
                encodeURIComponent(
                    bookingId
                ),
                {
                    credentials: "include"
                }
            );


        const data =
            await response.json();


        // ================================
        // LOGIN REQUIRED
        // ================================

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            redirectToLogin(
                bookingId
            );

            return false;

        }


        if (
            !response.ok ||
            !data.success ||
            !data.booking
        ) {

            throw new Error(
                data.message ||
                "Could not find appointment."
            );

        }


        displayBooking(
            data.booking
        );


        showMessage(
            bookingMessage,
            "Appointment loaded successfully.",
            "success"
        );


        if (
            canManageAppointment(
                data.booking.status
            )
        ) {

            startAutoRefresh();

        }


        return true;

    } catch (error) {

        showMessage(
            searchMessage,
            error.message ||
            "Could not load appointment.",
            "error"
        );

        return false;

    } finally {

        checkBtn.disabled =
            false;

        checkBtn.textContent =
            "Check Appointment";

    }

}


// ================================
// CHECK APPOINTMENT
// ================================

if (appointmentForm) {

    appointmentForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const bookingId =
                bookingIdInput
                    ? bookingIdInput.value.trim()
                    : "";


            if (!bookingId) {

                showMessage(
                    searchMessage,
                    "Please enter your Booking ID.",
                    "error"
                );

                return;

            }


            if (searchMessage) {

                searchMessage.style.display =
                    "none";

            }


            if (bookingSection) {

                bookingSection.classList.add(
                    "hidden"
                );

            }


            await loadBooking(
                bookingId
            );

        }
    );

}


// ================================
// CHECK NEW SLOT
// ================================

if (checkSlotBtn) {

    checkSlotBtn.addEventListener(
        "click",
        async function() {

            if (!currentBooking) {
                return;
            }


            if (
                !canManageAppointment(
                    currentBooking.status
                )
            ) {

                showSlotMessage(
                    "This appointment cannot be rescheduled.",
                    "error"
                );

                return;

            }


            const newDate =
                newDateInput.value;

            const newTime =
                newTimeInput.value;


            if (
                !newDate ||
                !newTime
            ) {

                showSlotMessage(
                    "Please select a new date and time.",
                    "error"
                );

                rescheduleBtn.classList.add(
                    "hidden"
                );

                return;

            }


            if (
                newDate === currentBooking.date &&
                newTime === currentBooking.time
            ) {

                showSlotMessage(
                    "Please select a different date or time.",
                    "error"
                );

                rescheduleBtn.classList.add(
                    "hidden"
                );

                return;

            }


            checkSlotBtn.disabled =
                true;

            checkSlotBtn.textContent =
                "Checking Slot...";


            rescheduleBtn.classList.add(
                "hidden"
            );


            try {

                const response =
                    await fetch(
                        "/availability?date=" +
                        encodeURIComponent(
                            newDate
                        ) +
                        "&time=" +
                        encodeURIComponent(
                            newTime
                        ),
                        {
                            credentials: "include"
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Could not check slot."
                    );

                }


                if (!data.available) {

                    selectedNewSlot =
                        null;


                    showSlotMessage(
                        "❌ This time slot is already booked. Please choose another slot.",
                        "error"
                    );


                    rescheduleBtn.classList.add(
                        "hidden"
                    );

                    return;

                }


                selectedNewSlot = {

                    date:
                        newDate,

                    time:
                        newTime

                };


                showSlotMessage(
                    "✅ This time slot is available.",
                    "success"
                );


                rescheduleBtn.classList.remove(
                    "hidden"
                );


            } catch (error) {

                selectedNewSlot =
                    null;


                showSlotMessage(
                    error.message ||
                    "Could not check slot.",
                    "error"
                );


                rescheduleBtn.classList.add(
                    "hidden"
                );

            } finally {

                checkSlotBtn.disabled =
                    false;

                checkSlotBtn.textContent =
                    "🔎 Check New Slot";

            }

        }
    );

}


// ================================
// DATE CHANGE
// ================================

if (newDateInput) {

    newDateInput.addEventListener(
        "change",
        function() {

            selectedNewSlot =
                null;


            rescheduleBtn.classList.add(
                "hidden"
            );


            if (slotMessage) {

                slotMessage.textContent =
                    "";

                slotMessage.className =
                    "slot-message";

            }

        }
    );

}


// ================================
// TIME CHANGE
// ================================

if (newTimeInput) {

    newTimeInput.addEventListener(
        "change",
        function() {

            selectedNewSlot =
                null;


            rescheduleBtn.classList.add(
                "hidden"
            );


            if (slotMessage) {

                slotMessage.textContent =
                    "";

                slotMessage.className =
                    "slot-message";

            }

        }
    );

}


// ================================
// CONFIRM RESCHEDULE
// ================================

if (rescheduleBtn) {

    rescheduleBtn.addEventListener(
        "click",
        async function() {

            if (
                !currentBooking ||
                !selectedNewSlot
            ) {

                return;

            }


            if (
                !canManageAppointment(
                    currentBooking.status
                )
            ) {

                showMessage(
                    bookingMessage,
                    "This appointment cannot be rescheduled.",
                    "error"
                );

                return;

            }


            const confirmed =
                confirm(
                    "Are you sure you want to reschedule this appointment?"
                );


            if (!confirmed) {
                return;
            }


            rescheduleBtn.disabled =
                true;

            rescheduleBtn.textContent =
                "Rescheduling...";


            try {

                const response =
                    await fetch(
                        "/customer/booking/" +
                        currentBooking.id +
                        "/reschedule",
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            credentials:
                                "include",

                            body:
                                JSON.stringify({

                                    date:
                                        selectedNewSlot.date,

                                    time:
                                        selectedNewSlot.time

                                })

                        }
                    );


                const data =
                    await response.json();


                if (
                    response.status === 401 ||
                    response.status === 403
                ) {

                    redirectToLogin(
                        currentBooking.id
                    );

                    return;

                }


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Could not reschedule appointment."
                    );

                }


                currentBooking =
                    data.booking;


                displayBooking(
                    currentBooking
                );


                showMessage(
                    bookingMessage,
                    "Appointment rescheduled successfully.",
                    "success"
                );


                resetReschedule();

                startAutoRefresh();


            } catch (error) {

                showSlotMessage(
                    error.message ||
                    "Could not reschedule appointment.",
                    "error"
                );

            } finally {

                rescheduleBtn.disabled =
                    false;

                rescheduleBtn.textContent =
                    "✅ Confirm Reschedule";

            }

        }
    );

}


// ================================
// CANCEL APPOINTMENT
// ================================

if (cancelBtn) {

    cancelBtn.addEventListener(
        "click",
        async function() {

            if (!currentBooking) {
                return;
            }


            if (
                !canManageAppointment(
                    currentBooking.status
                )
            ) {

                return;

            }


            const confirmed =
                confirm(
                    "Are you sure you want to cancel this appointment?"
                );


            if (!confirmed) {
                return;
            }


            cancelBtn.disabled =
                true;

            cancelBtn.textContent =
                "Cancelling...";


            try {

                const response =
                    await fetch(
                        "/customer/booking/" +
                        currentBooking.id +
                        "/cancel",
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            credentials:
                                "include",

                            body:
                                JSON.stringify({})

                        }
                    );


                const data =
                    await response.json();


                if (
                    response.status === 401 ||
                    response.status === 403
                ) {

                    redirectToLogin(
                        currentBooking.id
                    );

                    return;

                }


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Could not cancel appointment."
                    );

                }


                currentBooking =
                    data.booking ||
                    {
                        ...currentBooking,
                        status: "Cancelled"
                    };


                displayBooking(
                    currentBooking
                );


                showMessage(
                    bookingMessage,
                    "Appointment cancelled successfully.",
                    "success"
                );


            } catch (error) {

                cancelBtn.disabled =
                    false;

                cancelBtn.textContent =
                    "Cancel Appointment";


                showMessage(
                    bookingMessage,
                    error.message ||
                    "Could not cancel appointment.",
                    "error"
                );

            }

        }
    );

}


// ================================
// NEW SEARCH
// ================================

if (newSearchBtn) {

    newSearchBtn.addEventListener(
        "click",
        function() {

            stopAutoRefresh();


            currentBooking =
                null;


            bookingSection.classList.add(
                "hidden"
            );


            if (bookingMessage) {

                bookingMessage.textContent =
                    "";

                bookingMessage.className =
                    "message";

            }


            if (searchMessage) {

                searchMessage.textContent =
                    "";

                searchMessage.className =
                    "message";

            }


            if (appointmentForm) {

                appointmentForm.reset();

                appointmentForm.style.display =
                    "";

            }


            resetReschedule();


            if (bookingIdInput) {

                bookingIdInput.focus();

            }

        }
    );

}


// ======================================================
// DIRECT BOOKING OPEN
// FROM CUSTOMER DASHBOARD
// ======================================================

async function openBookingFromDashboard() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const bookingId =
        params.get("bookingId");


    if (!bookingId) {
        return;
    }


    if (bookingIdInput) {

        bookingIdInput.value =
            bookingId;

    }


    if (appointmentForm) {

        appointmentForm.style.display =
            "none";

    }


    const loaded =
        await loadBooking(
            bookingId
        );


    // Only clean the URL if
    // booking was successfully loaded.

    if (loaded) {

        window.history.replaceState(
            {},
            document.title,
            "/customer-appointment.html"
        );

    }

}


// ================================
// START
// ================================

openBookingFromDashboard();