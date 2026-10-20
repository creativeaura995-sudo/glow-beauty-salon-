const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    message.textContent = "Logging in...";

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!data.success) {
            message.textContent = "❌ " + data.message;
            return;
        }

        message.textContent = "✅ Login successful!";

        setTimeout(function() {
            window.location.href = "/admin.html";
        }, 500);

    } catch (error) {
        message.textContent = "❌ Could not connect to server.";
        console.log(error);
    }
});
