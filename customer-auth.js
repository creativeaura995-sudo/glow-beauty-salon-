// ========================================
// CUSTOMER AUTHENTICATION
// STEP 44
// LOGIN RETURN FLOW
// ========================================


// ================================
// ELEMENTS
// ================================

const loginTab =
    document.getElementById("loginTab");

const registerTab =
    document.getElementById("registerTab");

const loginForm =
    document.getElementById("loginForm");

const registerForm =
    document.getElementById("registerForm");

const authMessage =
    document.getElementById("authMessage");

const loginButton =
    document.getElementById("loginButton");

const registerButton =
    document.getElementById("registerButton");


// ================================
// SAFE RETURN URL
// ================================

function getSafeReturnUrl() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const returnTo =
        params.get("returnTo");


    if (!returnTo) {

        return null;

    }


    // Only allow local paths.
    // Prevent external redirect URLs.

    if (
        !returnTo.startsWith("/") ||
        returnTo.startsWith("//")
    ) {

        return null;

    }


    return returnTo;

}


// ================================
// REDIRECT AFTER LOGIN
// ================================

function redirectAfterLogin() {

    const returnTo =
        getSafeReturnUrl();


    if (returnTo) {

        window.location.href =
            returnTo;

        return;

    }


    window.location.href =
        "/customer-dashboard.html";

}


// ================================
// MESSAGE
// ================================

function showMessage(
    message,
    type
) {

    authMessage.textContent =
        message;

    authMessage.className =
        "auth-message " + type;

}


// ================================
// CLEAR MESSAGE
// ================================

function clearMessage() {

    authMessage.textContent =
        "";

    authMessage.className =
        "auth-message";

}


// ================================
// LOGIN TAB
// ================================

loginTab.addEventListener(
    "click",
    function() {

        loginTab.classList.add(
            "active"
        );

        registerTab.classList.remove(
            "active"
        );

        loginForm.classList.remove(
            "hidden"
        );

        registerForm.classList.add(
            "hidden"
        );

        clearMessage();

    }
);


// ================================
// REGISTER TAB
// ================================

registerTab.addEventListener(
    "click",
    function() {

        registerTab.classList.add(
            "active"
        );

        loginTab.classList.remove(
            "active"
        );

        registerForm.classList.remove(
            "hidden"
        );

        loginForm.classList.add(
            "hidden"
        );

        clearMessage();

    }
);


// ================================
// CUSTOMER REGISTER
// ================================

registerForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const name =
            document
                .getElementById("registerName")
                .value
                .trim();


        const email =
            document
                .getElementById("registerEmail")
                .value
                .trim();


        const phone =
            document
                .getElementById("registerPhone")
                .value
                .trim();


        const password =
            document
                .getElementById("registerPassword")
                .value;


        const confirmPassword =
            document
                .getElementById("confirmPassword")
                .value;


        // ================================
        // BASIC VALIDATION
        // ================================

        if (
            !name ||
            !email ||
            !phone ||
            !password ||
            !confirmPassword
        ) {

            showMessage(
                "Please fill all fields.",
                "error"
            );

            return;

        }


        if (password.length < 8) {

            showMessage(
                "Password must contain at least 8 characters.",
                "error"
            );

            return;

        }


        if (password !== confirmPassword) {

            showMessage(
                "Passwords do not match.",
                "error"
            );

            return;

        }


        // ================================
        // BUTTON STATE
        // ================================

        registerButton.disabled =
            true;

        registerButton.textContent =
            "Creating Account...";


        try {

            const response =
                await fetch(
                    "/customer/register",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body: JSON.stringify({

                            name: name,

                            email: email,

                            phone: phone,

                            password: password

                        })

                    }
                );


            const data =
                await response.json();


            if (response.ok) {

                showMessage(
                    "Account created successfully! You can now login.",
                    "success"
                );


                registerForm.reset();


                setTimeout(
                    function() {

                        loginTab.click();


                        document
                            .getElementById("loginEmail")
                            .value = email;

                    },
                    1000
                );

            }

            else {

                showMessage(
                    data.message ||
                    "Unable to create account.",
                    "error"
                );

            }

        }

        catch (error) {

            console.error(error);


            showMessage(
                "Unable to connect to the server.",
                "error"
            );

        }

        finally {

            registerButton.disabled =
                false;

            registerButton.textContent =
                "Create Account";

        }

    }
);


// ================================
// CUSTOMER LOGIN
// ================================

loginForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const email =
            document
                .getElementById("loginEmail")
                .value
                .trim();


        const password =
            document
                .getElementById("loginPassword")
                .value;


        if (!email || !password) {

            showMessage(
                "Please enter email and password.",
                "error"
            );

            return;

        }


        // ================================
        // BUTTON STATE
        // ================================

        loginButton.disabled =
            true;

        loginButton.textContent =
            "Logging in...";


        try {

            const response =
                await fetch(
                    "/customer/login",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        credentials: "include",

                        body: JSON.stringify({

                            email: email,

                            password: password

                        })

                    }
                );


            const data =
                await response.json();


            if (response.ok) {

                showMessage(
                    "Login successful! Opening your appointment...",
                    "success"
                );


                setTimeout(
                    function() {

                        redirectAfterLogin();

                    },
                    700
                );

            }

            else {

                showMessage(
                    data.message ||
                    "Invalid email or password.",
                    "error"
                );

            }

        }

        catch (error) {

            console.error(error);


            showMessage(
                "Unable to connect to the server.",
                "error"
            );

        }

        finally {

            loginButton.disabled =
                false;

            loginButton.textContent =
                "Login";

        }

    }
);