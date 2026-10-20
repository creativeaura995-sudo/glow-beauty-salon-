let currentBookings = [];
let currentFilter = "All";
let currentPage = 1;

const itemsPerPage = 5;

const AUTO_REFRESH_INTERVAL = 10000;

let autoRefreshTimer = null;
let dashboardLoading = false;


// ==========================================
// STATUS HELPERS
// ==========================================

function getStatusClass(status) {

    return String(status || "")
        .toLowerCase()
        .replace(/\s+/g, "-");
}


function getStatusIcon(status) {

    const icons = {
        Pending: "🟡",
        Confirmed: "🟢",
        Completed: "🔵",
        Cancelled: "🔴"
    };

    return icons[status] || "⚪";
}


// ==========================================
// DATE / TIME HELPERS
// ==========================================

function getTodayDate() {

    const today = new Date();

    const year =
        today.getFullYear();

    const month =
        String(today.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(today.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatAppointmentTime(timeString) {

    if (!timeString) {
        return "";
    }

    const parts =
        String(timeString).split(":");

    if (parts.length < 2) {
        return timeString;
    }

    let hour =
        Number(parts[0]);

    const minute =
        parts[1];

    if (Number.isNaN(hour)) {
        return timeString;
    }

    const suffix =
        hour >= 12 ? "PM" : "AM";

    hour = hour % 12;

    if (hour === 0) {
        hour = 12;
    }

    return `${String(hour).padStart(2, "0")}:${minute} ${suffix}`;
}


function formatAppointmentDate(dateString) {

    if (!dateString) {
        return "";
    }

    const parts =
        String(dateString).split("-");

    if (parts.length !== 3) {
        return dateString;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    if (
        Number.isNaN(year) ||
        Number.isNaN(month) ||
        Number.isNaN(day)
    ) {
        return dateString;
    }

    const date =
        new Date(
            year,
            month - 1,
            day
        );

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


// ==========================================
// TODAY + UPCOMING APPOINTMENTS
// ==========================================

function renderAppointmentOverview() {

    const todayContainer =
        document.getElementById(
            "todayAppointments"
        );

    const upcomingContainer =
        document.getElementById(
            "upcomingAppointments"
        );

    const todayCountElement =
        document.getElementById(
            "todayAppointmentCount"
        );

    const upcomingCountElement =
        document.getElementById(
            "upcomingAppointmentCount"
        );


    if (
        !todayContainer ||
        !upcomingContainer
    ) {
        return;
    }


    const today =
        getTodayDate();


    // ======================================
    // TODAY
    // ======================================

    const todayAppointments =
        currentBookings
            .filter(function(booking) {

                return (
                    booking.date === today &&
                    booking.status !== "Cancelled"
                );

            })
            .sort(function(a, b) {

                return String(a.time || "")
                    .localeCompare(
                        String(b.time || "")
                    );
            });


    if (todayCountElement) {

        todayCountElement.textContent =
            todayAppointments.length;
    }


    if (todayAppointments.length === 0) {

        todayContainer.innerHTML =
            `
            <div class="appointment-empty">
                📭 No active appointments scheduled for today.
            </div>
            `;

    } else {

        todayContainer.innerHTML =
            todayAppointments
                .map(function(booking) {

                    return createAppointmentItem(
                        booking,
                        false
                    );

                })
                .join("");
    }


    // ======================================
    // UPCOMING
    // ======================================

    const upcomingAppointments =
        currentBookings
            .filter(function(booking) {

                return (
                    String(booking.date || "") > today &&
                    booking.status !== "Cancelled"
                );

            })
            .sort(function(a, b) {

                const dateCompare =
                    String(a.date || "")
                        .localeCompare(
                            String(b.date || "")
                        );

                if (dateCompare !== 0) {
                    return dateCompare;
                }

                return String(a.time || "")
                    .localeCompare(
                        String(b.time || "")
                    );
            });


    if (upcomingCountElement) {

        upcomingCountElement.textContent =
            upcomingAppointments.length;
    }


    if (upcomingAppointments.length === 0) {

        upcomingContainer.innerHTML =
            `
            <div class="appointment-empty">
                📭 No upcoming appointments.
            </div>
            `;

    } else {

        const visibleAppointments =
            upcomingAppointments.slice(0, 5);


        let html =
            visibleAppointments
                .map(function(booking) {

                    return createAppointmentItem(
                        booking,
                        true
                    );

                })
                .join("");


        if (upcomingAppointments.length > 5) {

            const remaining =
                upcomingAppointments.length - 5;

            html +=
                `
                <div class="appointment-empty">
                    + ${remaining} more upcoming appointment${remaining === 1 ? "" : "s"}
                    available in the bookings list.
                </div>
                `;
        }


        upcomingContainer.innerHTML =
            html;
    }
}


function createAppointmentItem(
    booking,
    showDate
) {

    const status =
        booking.status || "Pending";

    const statusClass =
        getStatusClass(status);

    const statusIcon =
        getStatusIcon(status);

    const formattedTime =
        formatAppointmentTime(
            booking.time
        );

    const formattedDate =
        showDate
            ? formatAppointmentDate(
                booking.date
            )
            : "";


    return `
        <div class="appointment-item">

            <div class="appointment-time">
                ${formattedTime}
            </div>

            <div class="appointment-info">

                <div class="appointment-name">
                    ${booking.name || "Unknown"}
                    <span>#${booking.id}</span>
                </div>

                <div class="appointment-service">
                    💇 ${booking.service || "Service"}
                    ${
                        showDate
                            ? ` • 📅 ${formattedDate}`
                            : ""
                    }
                </div>

                <div class="appointment-phone">
                    📞 ${booking.phone || "N/A"}
                </div>

            </div>

            <div class="appointment-right">

                <div class="appointment-price">
                    ₹${Number(booking.price || 0)}
                </div>

                <span class="appointment-status appointment-status-${statusClass}">
                    ${statusIcon} ${status}
                </span>

            </div>

        </div>
    `;
}


// ==========================================
// STATISTICS
// ==========================================

function updateStatistics(bookings) {

    const totalBookings =
        bookings.length;


    const pendingBookings =
        bookings.filter(function(booking) {

            return booking.status === "Pending";

        }).length;


    const confirmedBookings =
        bookings.filter(function(booking) {

            return booking.status === "Confirmed";

        }).length;


    const completedBookings =
        bookings.filter(function(booking) {

            return booking.status === "Completed";

        }).length;


    const cancelledBookings =
        bookings.filter(function(booking) {

            return booking.status === "Cancelled";

        }).length;


    const revenue =
        bookings
            .filter(function(booking) {

                return booking.status !== "Cancelled";

            })
            .reduce(function(total, booking) {

                return total +
                    Number(booking.price || 0);

            }, 0);


    const uniqueCustomers =
        new Set(
            bookings.map(function(booking) {

                return booking.phone;

            })
        ).size;


    const totalBookingsElement =
        document.getElementById(
            "totalBookings"
        );

    const pendingBookingsElement =
        document.getElementById(
            "pendingBookings"
        );

    const confirmedBookingsElement =
        document.getElementById(
            "confirmedBookings"
        );

    const completedBookingsElement =
        document.getElementById(
            "completedBookings"
        );

    const cancelledBookingsElement =
        document.getElementById(
            "cancelledBookings"
        );

    const revenueElement =
        document.getElementById(
            "revenue"
        );

    const totalCustomersElement =
        document.getElementById(
            "totalCustomers"
        );


    if (totalBookingsElement) {
        totalBookingsElement.textContent =
            totalBookings;
    }

    if (pendingBookingsElement) {
        pendingBookingsElement.textContent =
            pendingBookings;
    }

    if (confirmedBookingsElement) {
        confirmedBookingsElement.textContent =
            confirmedBookings;
    }

    if (completedBookingsElement) {
        completedBookingsElement.textContent =
            completedBookings;
    }

    if (cancelledBookingsElement) {
        cancelledBookingsElement.textContent =
            cancelledBookings;
    }

    if (revenueElement) {
        revenueElement.textContent =
            "₹" + revenue;
    }

    if (totalCustomersElement) {
        totalCustomersElement.textContent =
            uniqueCustomers;
    }
}


// ==========================================
// FILTER BOOKINGS
// ==========================================

function getFilteredBookings() {

    let filtered =
        [...currentBookings];


    // ======================================
    // STATUS FILTER
    // ======================================

    if (currentFilter !== "All") {

        filtered =
            filtered.filter(
                function(booking) {

                    return booking.status ===
                        currentFilter;

                }
            );
    }


    // ======================================
    // SEARCH
    // ======================================

    const searchInput =
        document.getElementById(
            "searchInput"
        );


    const searchValue =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    if (searchValue) {

        filtered =
            filtered.filter(
                function(booking) {

                    return (

                        String(
                            booking.name || ""
                        )
                            .toLowerCase()
                            .includes(searchValue)

                        ||

                        String(
                            booking.phone || ""
                        )
                            .toLowerCase()
                            .includes(searchValue)

                        ||

                        String(
                            booking.service || ""
                        )
                            .toLowerCase()
                            .includes(searchValue)

                        ||

                        String(
                            booking.id || ""
                        )
                            .includes(searchValue)

                    );

                }
            );
    }


    // ======================================
    // DATE FILTER
    // ======================================

    const dateFilter =
        document.getElementById(
            "dateFilter"
        );


    if (
        dateFilter &&
        dateFilter.value
    ) {

        filtered =
            filtered.filter(
                function(booking) {

                    return booking.date ===
                        dateFilter.value;

                }
            );
    }


    // ======================================
    // SERVICE FILTER
    // ======================================

    const serviceFilter =
        document.getElementById(
            "serviceFilter"
        );


    /*
       IMPORTANT FIX:

       admin.html uses:

       <option value="All">
           All Services
       </option>

       Therefore "All" must NOT be treated
       as an actual service name.
    */

    if (
        serviceFilter &&
        serviceFilter.value &&
        serviceFilter.value !== "All"
    ) {

        filtered =
            filtered.filter(
                function(booking) {

                    return booking.service ===
                        serviceFilter.value;

                }
            );
    }


    // ======================================
    // SORT
    // ======================================

    const sortFilter =
        document.getElementById(
            "sortFilter"
        );


    const sortValue =
        sortFilter
            ? sortFilter.value
            : "newest";


    // Newest First

    if (
        sortValue === "newest" ||
        sortValue === "date-desc"
    ) {

        filtered.sort(
            function(a, b) {

                const dateCompare =
                    String(b.date || "")
                        .localeCompare(
                            String(a.date || "")
                        );

                if (dateCompare !== 0) {
                    return dateCompare;
                }

                return String(b.time || "")
                    .localeCompare(
                        String(a.time || "")
                    );
            }
        );
    }


    // Oldest First

    else if (
        sortValue === "oldest" ||
        sortValue === "date-asc"
    ) {

        filtered.sort(
            function(a, b) {

                const dateCompare =
                    String(a.date || "")
                        .localeCompare(
                            String(b.date || "")
                        );

                if (dateCompare !== 0) {
                    return dateCompare;
                }

                return String(a.time || "")
                    .localeCompare(
                        String(b.time || "")
                    );
            }
        );
    }


    // Name A-Z

    else if (
        sortValue === "nameAZ"
    ) {

        filtered.sort(
            function(a, b) {

                return String(a.name || "")
                    .localeCompare(
                        String(b.name || "")
                    );
            }
        );
    }


    // Name Z-A

    else if (
        sortValue === "nameZA"
    ) {

        filtered.sort(
            function(a, b) {

                return String(b.name || "")
                    .localeCompare(
                        String(a.name || "")
                    );
            }
        );
    }


    // Price High to Low

    else if (
        sortValue === "price-high"
    ) {

        filtered.sort(
            function(a, b) {

                return Number(b.price || 0) -
                    Number(a.price || 0);

            }
        );
    }


    // Price Low to High

    else if (
        sortValue === "price-low"
    ) {

        filtered.sort(
            function(a, b) {

                return Number(a.price || 0) -
                    Number(b.price || 0);

            }
        );
    }


    return filtered;
}


// ==========================================
// RENDER BOOKINGS
// ==========================================

function renderBookings() {

    const bookingList =
        document.getElementById(
            "bookingList"
        );


    const resultsInfo =
        document.getElementById(
            "resultsInfo"
        );


    if (!bookingList) {
        return;
    }


    const filteredBookings =
        getFilteredBookings();


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredBookings.length /
                itemsPerPage
            )
        );


    if (currentPage > totalPages) {
        currentPage = totalPages;
    }


    const startIndex =
        (currentPage - 1) *
        itemsPerPage;


    const endIndex =
        startIndex +
        itemsPerPage;


    const pageBookings =
        filteredBookings.slice(
            startIndex,
            endIndex
        );


    if (resultsInfo) {

        if (filteredBookings.length === 0) {

            resultsInfo.textContent =
                "No bookings found.";

        } else {

            resultsInfo.textContent =
                `Showing ${startIndex + 1}–${Math.min(
                    endIndex,
                    filteredBookings.length
                )} of ${filteredBookings.length} bookings`;
        }
    }


    if (pageBookings.length === 0) {

        bookingList.innerHTML =
            `
            <div class="empty-state">
                <h3>📭 No bookings found</h3>
                <p>Try changing your filters or search.</p>
            </div>
            `;

        renderPagination(
            filteredBookings.length
        );

        return;
    }


    bookingList.innerHTML =
        pageBookings
            .map(function(booking) {

                const status =
                    booking.status || "Pending";

                const statusClass =
                    getStatusClass(status);

                const statusIcon =
                    getStatusIcon(status);


                return `
                    <div class="booking-card">

                        <div class="booking-info">

                            <h3>
                                ${booking.name || "Unknown"}
                            </h3>

                            <p>
                                🆔 Booking ID:
                                ${booking.id}
                            </p>

                            <p>
                                📞
                                ${booking.phone || "N/A"}
                            </p>

                            <p>
                                💇
                                ${booking.service || "N/A"}
                            </p>

                            <p>
                                💰
                                ₹${Number(booking.price || 0)}
                            </p>

                            <p>
                                📅
                                ${booking.date || "N/A"}
                            </p>

                            <p>
                                ⏰
                                ${formatAppointmentTime(
                                    booking.time
                                )}
                            </p>

                            <span class="status-badge status-${statusClass}">
                                ${statusIcon}
                                ${status}
                            </span>

                        </div>

                        <div class="booking-actions">

                            <button
                                type="button"
                                class="edit-button js-edit-booking"
                                data-booking-id="${booking.id}"
                            >
                                ✏️ Edit
                            </button>

                            <button
                                type="button"
                                class="delete-button js-delete-booking"
                                data-booking-id="${booking.id}"
                            >
                                🗑️ Delete
                            </button>

                        </div>

                    </div>
                `;

            })
            .join("");


    renderPagination(
        filteredBookings.length
    );
}


// ==========================================
// PAGINATION
// ==========================================

function renderPagination(totalItems) {

    const pagination =
        document.getElementById(
            "pagination"
        );


    if (!pagination) {
        return;
    }


    const totalPages =
        Math.ceil(
            totalItems /
            itemsPerPage
        );


    if (totalPages <= 1) {

        pagination.innerHTML = "";

        return;
    }


    let html = "";


    html +=
        `
        <button
            type="button"
            class="js-page-button"
            data-page="${currentPage - 1}"
            ${currentPage === 1 ? "disabled" : ""}
        >
            ◀
        </button>
        `;


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        html +=
            `
            <button
                type="button"
                class="js-page-button ${page === currentPage ? "active" : ""}"
                data-page="${page}"
            >
                ${page}
            </button>
            `;
    }


    html +=
        `
        <button
            type="button"
            class="js-page-button"
            data-page="${currentPage + 1}"
            ${currentPage === totalPages ? "disabled" : ""}
        >
            ▶
        </button>
        `;


    pagination.innerHTML =
        html;
}


function changePage(page) {

    page =
        Number(page);


    if (
        !Number.isInteger(page) ||
        page < 1
    ) {
        return;
    }


    const filteredBookings =
        getFilteredBookings();


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredBookings.length /
                itemsPerPage
            )
        );


    if (page > totalPages) {
        return;
    }


    currentPage = page;

    renderBookings();
}


// ==========================================
// EDIT BOOKING
// ==========================================

function openEdit(id) {

    const booking =
        currentBookings.find(
            function(item) {

                return Number(item.id) ===
                    Number(id);

            }
        );


    if (!booking) {

        console.error(
            "Booking not found:",
            id
        );

        return;
    }


    const editId =
        document.getElementById(
            "editId"
        );

    const editName =
        document.getElementById(
            "editName"
        );

    const editPhone =
        document.getElementById(
            "editPhone"
        );

    const editService =
        document.getElementById(
            "editService"
        );

    const editDate =
        document.getElementById(
            "editDate"
        );

    const editTime =
        document.getElementById(
            "editTime"
        );

    const editStatus =
        document.getElementById(
            "editStatus"
        );

    const editModal =
        document.getElementById(
            "editModal"
        );


    if (editId) {
        editId.value =
            booking.id;
    }

    if (editName) {
        editName.value =
            booking.name || "";
    }

    if (editPhone) {
        editPhone.value =
            booking.phone || "";
    }

    if (editService) {
        editService.value =
            booking.service || "";
    }

    if (editDate) {
        editDate.value =
            booking.date || "";
    }

    if (editTime) {
        editTime.value =
            booking.time || "";
    }

    if (editStatus) {
        editStatus.value =
            booking.status || "Pending";
    }


    if (editModal) {

        editModal.style.display =
            "flex";
    }
}


// ==========================================
// CANCEL EDIT
// ==========================================

function cancelEdit() {

    const editModal =
        document.getElementById(
            "editModal"
        );


    if (editModal) {

        editModal.style.display =
            "none";
    }
}


// ==========================================
// DELETE BOOKING
// ==========================================

async function deleteBooking(id) {

    const confirmed =
        window.confirm(
            "Are you sure you want to delete this booking?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `/bookings/${id}`,
                {
                    method: "DELETE",
                    credentials: "include"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Could not delete booking."
            );
        }


        await loadDashboard();


    } catch (error) {

        console.error(
            "Delete booking error:",
            error
        );


        alert(
            error.message ||
            "Could not delete booking."
        );
    }
}


// ==========================================
// EVENT DELEGATION
// ==========================================

// BOOKING LIST: EDIT + DELETE

const bookingListElement =
    document.getElementById(
        "bookingList"
    );


if (bookingListElement) {

    bookingListElement.addEventListener(
        "click",
        function(event) {

            const editButton =
                event.target.closest(
                    ".js-edit-booking"
                );


            if (editButton) {

                const id =
                    editButton.dataset.bookingId;

                openEdit(id);

                return;
            }


            const deleteButton =
                event.target.closest(
                    ".js-delete-booking"
                );


            if (deleteButton) {

                const id =
                    deleteButton.dataset.bookingId;

                deleteBooking(id);

                return;
            }

        }
    );
}


// PAGINATION

const paginationElement =
    document.getElementById(
        "pagination"
    );


if (paginationElement) {

    paginationElement.addEventListener(
        "click",
        function(event) {

            const pageButton =
                event.target.closest(
                    ".js-page-button"
                );


            if (!pageButton) {
                return;
            }


            if (
                pageButton.disabled
            ) {
                return;
            }


            const page =
                pageButton.dataset.page;


            changePage(page);
        }
    );
}


// ==========================================
// SAVE EDIT
// ==========================================

const saveButton =
    document.getElementById(
        "saveButton"
    );


if (saveButton) {

    saveButton.addEventListener(
        "click",
        async function() {

            const id =
                document.getElementById(
                    "editId"
                )?.value;


            const name =
                document.getElementById(
                    "editName"
                )?.value.trim();


            const phone =
                document.getElementById(
                    "editPhone"
                )?.value.trim();


            const service =
                document.getElementById(
                    "editService"
                )?.value;


            const date =
                document.getElementById(
                    "editDate"
                )?.value;


            const time =
                document.getElementById(
                    "editTime"
                )?.value;


            const status =
                document.getElementById(
                    "editStatus"
                )?.value;


            const message =
                document.getElementById(
                    "message"
                );


            try {

                saveButton.disabled =
                    true;


                const response =
                    await fetch(
                        `/bookings/${id}`,
                        {
                            method: "PATCH",

                            credentials: "include",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                name,
                                phone,
                                service,
                                date,
                                time,
                                status
                            })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Could not update booking."
                    );
                }


                if (message) {

                    message.textContent =
                        "Booking updated successfully.";

                    message.style.color =
                        "green";
                }


                await loadDashboard();


                setTimeout(
                    function() {

                        cancelEdit();

                    },
                    500
                );


            } catch (error) {

                console.error(
                    "Save booking error:",
                    error
                );


                if (message) {

                    message.textContent =
                        error.message;

                    message.style.color =
                        "red";
                }

            } finally {

                saveButton.disabled =
                    false;
            }

        }
    );
}


// ==========================================
// FILTER BUTTONS
// ==========================================

document
    .querySelectorAll(
        ".status-filter"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    document
                        .querySelectorAll(
                            ".status-filter"
                        )
                        .forEach(
                            function(item) {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                    this.classList.add(
                        "active"
                    );


                    currentFilter =
                        this.dataset.status ||
                        "All";


                    currentPage = 1;

                    renderBookings();
                }
            );

        }
    );


// ==========================================
// SEARCH
// ==========================================

const searchInput =
    document.getElementById(
        "searchInput"
    );


if (searchInput) {

    searchInput.addEventListener(
        "input",
        function() {

            currentPage = 1;

            renderBookings();

        }
    );
}


// ==========================================
// DATE FILTER
// ==========================================

const dateFilter =
    document.getElementById(
        "dateFilter"
    );


if (dateFilter) {

    dateFilter.addEventListener(
        "change",
        function() {

            currentPage = 1;

            renderBookings();

        }
    );
}


// ==========================================
// SERVICE FILTER
// ==========================================

const serviceFilter =
    document.getElementById(
        "serviceFilter"
    );


if (serviceFilter) {

    serviceFilter.addEventListener(
        "change",
        function() {

            currentPage = 1;

            renderBookings();

        }
    );
}


// ==========================================
// SORT
// ==========================================

const sortFilter =
    document.getElementById(
        "sortFilter"
    );


if (sortFilter) {

    sortFilter.addEventListener(
        "change",
        function() {

            currentPage = 1;

            renderBookings();

        }
    );
}


// ==========================================
// RESET FILTERS
// ==========================================

const resetButton =
    document.getElementById(
        "resetButton"
    );


if (resetButton) {

    resetButton.addEventListener(
        "click",
        function() {

            if (searchInput) {
                searchInput.value = "";
            }

            if (dateFilter) {
                dateFilter.value = "";
            }

            if (serviceFilter) {
                serviceFilter.value = "All";
            }

            if (sortFilter) {
                sortFilter.value = "newest";
            }


            currentFilter = "All";

            currentPage = 1;


            document
                .querySelectorAll(
                    ".status-filter"
                )
                .forEach(
                    function(button) {

                        button.classList.remove(
                            "active"
                        );

                    }
                );


            const allButton =
                document.querySelector(
                    '.status-filter[data-status="All"]'
                );


            if (allButton) {

                allButton.classList.add(
                    "active"
                );
            }


            renderBookings();
        }
    );
}


// ==========================================
// LOGOUT
// ==========================================

const logoutButton =
    document.getElementById(
        "logoutButton"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function() {

            try {

                stopAutoRefresh();


                await fetch(
                    "/logout",
                    {
                        method: "POST",
                        credentials: "include"
                    }
                );


            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            } finally {

                window.location.href =
                    "/login.html";
            }

        }
    );
}


// ==========================================
// AUTO REFRESH
// ==========================================

function startAutoRefresh() {

    if (autoRefreshTimer !== null) {
        return;
    }


    autoRefreshTimer =
        setInterval(
            async function() {

                await loadDashboard();

            },
            AUTO_REFRESH_INTERVAL
        );
}


function stopAutoRefresh() {

    if (autoRefreshTimer !== null) {

        clearInterval(
            autoRefreshTimer
        );

        autoRefreshTimer = null;
    }
}


// ==========================================
// LOAD DASHBOARD
// ==========================================

async function loadDashboard() {

    if (dashboardLoading) {
        return;
    }


    dashboardLoading = true;


    try {

        const adminResponse =
            await fetch(
                "/admin",
                {
                    credentials: "include",
                    cache: "no-store"
                }
            );


        if (!adminResponse.ok) {

            stopAutoRefresh();

            window.location.href =
                "/login.html";

            return;
        }


        const response =
            await fetch(
                "/bookings",
                {
                    credentials: "include",
                    cache: "no-store"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Could not load bookings."
            );
        }


        currentBookings =
            Array.isArray(data.bookings)
                ? data.bookings
                : [];


        updateStatistics(
            currentBookings
        );


        renderAppointmentOverview();


        renderBookings();


        startAutoRefresh();


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );


        const bookingList =
            document.getElementById(
                "bookingList"
            );


        if (bookingList) {

            bookingList.innerHTML =
                `
                <div class="empty-state">
                    <h3>⚠️ Could not load bookings</h3>
                    <p>
                        ${error.message || "Please try again."}
                    </p>
                </div>
                `;
        }

    } finally {

        dashboardLoading = false;
    }
}


// ==========================================
// START
// ==========================================

loadDashboard();