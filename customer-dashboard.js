
"use strict";

// =====================================================
// GLOW BEAUTY SALON — CUSTOMER DASHBOARD
// Step 35.6: Dashboard rendering and functionality
// =====================================================

const welcomeTitle = document.getElementById("welcomeTitle");
const welcomeText = document.getElementById("welcomeText");
const appointmentsContainer = document.getElementById("appointmentsContainer");
const dashboardMessage = document.getElementById("dashboardMessage");
const refreshButton = document.getElementById("refreshButton");
const logoutButton = document.getElementById("logoutButton");

// Statistics already exist in customer-dashboard.html.
const totalAppointmentsEl = document.getElementById("totalAppointments");
const upcomingAppointmentsEl = document.getElementById("upcomingAppointments");
const completedAppointmentsEl = document.getElementById("completedAppointments");
const cancelledAppointmentsEl = document.getElementById("cancelledAppointments");

let isLoadingAppointments = false;
let isLoggingOut = false;

// =====================================================
// MESSAGE HELPERS
// =====================================================

function showMessage(message, type = "success") {
  if (!dashboardMessage) return;

  dashboardMessage.textContent = message;
  dashboardMessage.className = `dashboard-message ${type}`;
}

function clearMessage() {
  if (!dashboardMessage) return;

  dashboardMessage.textContent = "";
  dashboardMessage.className = "dashboard-message";
}

// =====================================================
// HTML ESCAPING
// =====================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =====================================================
// NORMALIZE STATUS
// =====================================================

function normalizeStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();

  const knownStatuses = {
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    canceled: "Cancelled"
  };

  return knownStatuses[value] || "Pending";
}

function getStatusClass(status) {
  return normalizeStatus(status).toLowerCase();
}

// =====================================================
// DATE FORMATTING
// =====================================================

function formatDate(dateString) {
  if (!dateString) return "—";

  const value = String(dateString).trim();
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  let date;

  if (match) {
    date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// =====================================================
// TIME FORMATTING
// =====================================================

function formatTime(timeString) {
  if (!timeString) return "—";

  const value = String(timeString).trim();
  const match = value.match(/^(\d{1,2}):(\d{2})/);

  if (!match) return escapeHtml(value);

  let hour = Number(match[1]);
  const minute = match[2];

  if (hour < 0 || hour > 23) {
    return escapeHtml(value);
  }

  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}

// =====================================================
// STATISTICS
// =====================================================

function updateDashboardStats(appointments) {
  const stats = {
    total: appointments.length,
    upcoming: 0,
    completed: 0,
    cancelled: 0
  };

  appointments.forEach((appointment) => {
    const status = normalizeStatus(appointment.status);

    if (status === "Pending" || status === "Confirmed") {
      stats.upcoming++;
    } else if (status === "Completed") {
      stats.completed++;
    } else if (status === "Cancelled") {
      stats.cancelled++;
    }
  });

  if (totalAppointmentsEl) {
    totalAppointmentsEl.textContent = stats.total;
  }

  if (upcomingAppointmentsEl) {
    upcomingAppointmentsEl.textContent = stats.upcoming;
  }

  if (completedAppointmentsEl) {
    completedAppointmentsEl.textContent = stats.completed;
  }

  if (cancelledAppointmentsEl) {
    cancelledAppointmentsEl.textContent = stats.cancelled;
  }
}

function resetDashboardStats() {
  updateDashboardStats([]);
}

// =====================================================
// APPOINTMENT SORTING
// =====================================================

function getAppointmentDateTime(appointment) {
  return `${appointment.date || ""} ${appointment.time || ""}`;
}

// =====================================================
// CREATE APPOINTMENT CARD
// =====================================================

function createAppointmentCard(appointment) {
  const status = normalizeStatus(appointment.status);
  const statusClass = getStatusClass(status);

  const bookingId = appointment.id;
  const safeBookingId = escapeHtml(bookingId);
  const bookingQuery = encodeURIComponent(String(bookingId ?? ""));

  const service = escapeHtml(appointment.service || "Salon Service");
  const priceValue = appointment.price ?? "—";
  const price = escapeHtml(priceValue);

  return `
    <article class="appointment-card">

      <div class="appointment-header">
        <div class="booking-info">
          <span class="booking-label">Booking</span>
          <h3>#${safeBookingId}</h3>
        </div>

        <span class="status status-${statusClass}">
          ${escapeHtml(status)}
        </span>
      </div>

      <div class="appointment-details">

        <div class="detail-item">
          <span class="detail-label">💇 Service</span>
          <strong>${service}</strong>
        </div>

        <div class="detail-item">
          <span class="detail-label">📅 Date</span>
          <strong>${formatDate(appointment.date)}</strong>
        </div>

        <div class="detail-item">
          <span class="detail-label">🕐 Time</span>
          <strong>${formatTime(appointment.time)}</strong>
        </div>

        <div class="detail-item">
          <span class="detail-label">💰 Price</span>
          <strong>₹${price}</strong>
        </div>

      </div>

      <div class="appointment-actions">
        <a
          href="/customer-appointment.html?bookingId=${bookingQuery}"
          class="manage-button"
        >
          📋 Manage Appointment
        </a>
      </div>

    </article>
  `;
}

// =====================================================
// CREATE APPOINTMENT SECTION
// =====================================================

function createAppointmentSection(
  title,
  icon,
  appointments,
  emptyText,
  sectionClass
) {
  const content = appointments.length
    ? appointments.map(createAppointmentCard).join("")
    : `
      <div class="section-empty">
        <div class="section-empty-icon">${icon}</div>
        <p>${escapeHtml(emptyText)}</p>
      </div>
    `;

  const countLabel =
    appointments.length === 1 ? "appointment" : "appointments";

  return `
    <section class="appointment-group ${sectionClass}">

      <div class="appointment-group-header">
        <div class="group-title">

          <span class="group-icon">${icon}</span>

          <div>
            <h2>${escapeHtml(title)}</h2>
            <p>${appointments.length} ${countLabel}</p>
          </div>

        </div>
      </div>

      <div class="appointment-group-grid">
        ${content}
      </div>

    </section>
  `;
}

// =====================================================
// CUSTOMER SESSION
// =====================================================

async function loadCustomer() {
  try {
    const response = await fetch("/customer/me", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json"
      }
    });

    if (response.status === 401 || response.status === 403) {
      window.location.replace("/customer-auth.html");
      return false;
    }

    if (!response.ok) {
      throw new Error("Unable to load customer information.");
    }

    const data = await response.json();
    const customer = data.customer || data.user || data;
    const name = customer.name || "Customer";

    if (welcomeTitle) {
      welcomeTitle.textContent = `Welcome, ${name} 👋`;
    }

    if (welcomeText) {
      welcomeText.textContent =
        "Manage your salon appointments from your dashboard.";
    }

    return true;
  } catch (error) {
    console.error("Customer loading error:", error);

    if (welcomeTitle) {
      welcomeTitle.textContent = "Welcome 👋";
    }

    if (welcomeText) {
      welcomeText.textContent =
        "Your appointments and account information are shown here.";
    }

    showMessage(
      "We couldn't verify your account information. Please refresh the dashboard.",
      "error"
    );

    return false;
  }
}

// =====================================================
// EMPTY STATE
// =====================================================

function renderEmptyAppointments() {
  appointmentsContainer.innerHTML = `
    <div class="empty-card">

      <div class="empty-icon">📅</div>

      <h3>No Appointments Yet</h3>

      <p>
        You don't have any appointments right now.
        Book a salon service whenever you're ready.
      </p>

      <a href="/#contact" class="empty-button">
        Book Your First Appointment
      </a>

    </div>
  `;
}

// =====================================================
// RENDER APPOINTMENTS
// =====================================================

function renderAppointments(appointments) {
  if (appointments.length === 0) {
    renderEmptyAppointments();
    return;
  }

  const upcoming = appointments
    .filter((appointment) => {
      const status = normalizeStatus(appointment.status);
      return status === "Pending" || status === "Confirmed";
    })
    .sort((a, b) =>
      getAppointmentDateTime(a).localeCompare(getAppointmentDateTime(b))
    );

  const completed = appointments
    .filter((appointment) =>
      normalizeStatus(appointment.status) === "Completed"
    )
    .sort((a, b) =>
      getAppointmentDateTime(b).localeCompare(getAppointmentDateTime(a))
    );

  const cancelled = appointments
    .filter((appointment) =>
      normalizeStatus(appointment.status) === "Cancelled"
    )
    .sort((a, b) =>
      getAppointmentDateTime(b).localeCompare(getAppointmentDateTime(a))
    );

  appointmentsContainer.innerHTML = `
    ${createAppointmentSection(
      "Upcoming Appointments",
      "📅",
      upcoming,
      "You have no upcoming appointments.",
      "upcoming-group"
    )}

    ${createAppointmentSection(
      "Completed Appointments",
      "✅",
      completed,
      "You don't have any completed appointments yet.",
      "completed-group"
    )}

    ${createAppointmentSection(
      "Cancelled Appointments",
      "❌",
      cancelled,
      "You don't have any cancelled appointments.",
      "cancelled-group"
    )}
  `;
}

// =====================================================
// LOAD APPOINTMENTS FROM BACKEND
// =====================================================

async function loadAppointments() {
  if (isLoadingAppointments) return;

  isLoadingAppointments = true;
  clearMessage();

  if (refreshButton) {
    refreshButton.disabled = true;
  }

  appointmentsContainer.innerHTML = `
    <div class="loading-card">
      <div class="loading-spinner"></div>
      <p>Loading your appointments...</p>
    </div>
  `;

  try {
    const response = await fetch("/customer/appointments", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (response.status === 401 || response.status === 403) {
      window.location.replace("/customer-auth.html");
      return;
    }

    if (!response.ok) {
      throw new Error("Unable to load appointments.");
    }

    const data = await response.json();

    const appointments = Array.isArray(data)
      ? data
      : Array.isArray(data.bookings)
        ? data.bookings
        : Array.isArray(data.appointments)
          ? data.appointments
          : null;

    if (!appointments) {
      throw new Error("The server returned an unexpected appointment format.");
    }

    console.log("Customer dashboard bookings:", appointments);

    // Update the existing statistics in the HTML.
    updateDashboardStats(appointments);

    // Render only the appointment groups inside this container.
    renderAppointments(appointments);
  } catch (error) {
    console.error("Appointments loading error:", error);

    resetDashboardStats();

    appointmentsContainer.innerHTML = `
      <div class="error-card">

        <div class="error-icon">⚠️</div>

        <h3>Unable to Load Appointments</h3>

        <p>
          Something went wrong while loading your appointments.
          Please check your connection and try again.
        </p>

        <button type="button" class="retry-button" id="retryAppointmentsButton">
          🔄 Try Again
        </button>

      </div>
    `;

    showMessage(
      "Unable to load appointments. Please try again.",
      "error"
    );
  } finally {
    isLoadingAppointments = false;

    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "🔄 Refresh";
    }
  }
}

// =====================================================
// RETRY BUTTON
// =====================================================

appointmentsContainer.addEventListener("click", (event) => {
  const retryButton = event.target.closest("#retryAppointmentsButton");

  if (retryButton) {
    loadAppointments();
  }
});

// =====================================================
// MANUAL REFRESH
// =====================================================

if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    loadAppointments();
  });
}

// =====================================================
// REFRESH WHEN RETURNING TO DASHBOARD
// =====================================================

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    loadAppointments();
  }
});

// =====================================================
// LOGOUT
// =====================================================

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    if (isLoggingOut) return;

    isLoggingOut = true;
    logoutButton.disabled = true;
    logoutButton.textContent = "Logging out...";

    try {
      const response = await fetch("/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      window.location.replace("/customer-auth.html");
    } catch (error) {
      console.error("Logout error:", error);

      showMessage(
        "Logout failed. Please try again.",
        "error"
      );

      isLoggingOut = false;
      logoutButton.disabled = false;
      logoutButton.textContent = "Logout";
    }
  });
}

// =====================================================
// INITIALIZE DASHBOARD
// =====================================================

async function initializeDashboard() {
  resetDashboardStats();

  const customerLoaded = await loadCustomer();

  if (!customerLoaded) {
    return;
  }

  await loadAppointments();
}

initializeDashboard();
