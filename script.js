"use strict";

// 1. Car information
const cars = [
    { name: "Toyota Corolla", price: 80, image: "Toyota-Corolla.jpg" },
    { name: "Honda Civic", price: 90, image: "Honda-Civic.jpg" },
    { name: "Toyota RAV4", price: 110, image: "Toyota-RAV4.jpg" },
    { name: "BMW 3 Series", price: 130, image: "BMW-3-Series.jpg" }
];

const MINOR_DAMAGE_FEE = 100;
const SEVERE_DAMAGE_FEE = 200;
const STORAGE_KEY = "azoomRentalState";

// 2. Shared data stored in this browser
function getState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch (error) {
        console.error("Unable to read saved booking:", error);
        return null;
    }
}

function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(amount) {
    return "$" + Number(amount).toFixed(2);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function(character) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return entities[character];
    });
}

function getToday() {
    const now = new Date();
    const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    );
    return localDate.toISOString().slice(0, 10);
}

// 3. Shared bill display
function billHTML(state) {
    if (!state) {
        return "No booking has been made yet.";
    }

    if (!state.inspectionCompleted) {
        return "The final bill will appear after employee inspection.";
    }

    const total = state.rentalCost + state.damageFee;

    return `
        <h3>Final Bill</h3>
        <p><strong>Car:</strong> ${escapeHTML(state.carName)}</p>
        <p><strong>Return Location:</strong> ${escapeHTML(state.returnLocation)}</p>
        <p><strong>Vehicle Condition:</strong> ${escapeHTML(state.condition)}</p>
        <p><strong>Rental Days:</strong> ${state.rentalDays}</p>
        <p><strong>Rental Cost:</strong> ${money(state.rentalCost)}</p>
        <p><strong>Damage Fee:</strong> ${money(state.damageFee)}</p>
        <p><strong>Final Total:</strong> ${money(total)}</p>
        <p><strong>Payment Status:</strong> ${
            state.paymentCompleted ? "Paid" : "Pending"
        }</p>
    `;
}

// 4. Customer page
function setupCustomerPage() {
    const carSelect = document.getElementById("car");
    const carList = document.getElementById("car-list");

    // Fill the car selection menu
    cars.forEach(function(car) {
        const option = document.createElement("option");
        option.value = car.name;
        option.textContent = car.name + " (" + money(car.price) + " per day)";
        carSelect.appendChild(option);
    });

    // Display car cards
    cars.forEach(function(car) {
        const card = document.createElement("div");
        card.className = "car-card";

        const image = document.createElement("img");
        image.src = "https://chloezzz07.github.io/AZoom-Car-Rental/" + car.image;
        image.alt = car.name;
        image.onerror = function() {
            this.style.display = "none";
        };

        const name = document.createElement("h3");
        name.textContent = car.name;

        const price = document.createElement("p");
        price.textContent = money(car.price) + " per day";

        const chooseButton = document.createElement("button");
        chooseButton.type = "button";
        chooseButton.textContent = "Choose This Car";
        chooseButton.addEventListener("click", function() {
            carSelect.value = car.name;
            document.getElementById("booking-form").scrollIntoView({
                behavior: "smooth"
            });
        });

        card.append(image, name, price, chooseButton);
        carList.appendChild(card);
    });

    // Set date limits
    const rentalInput = document.getElementById("rental-date");
    const returnInput = document.getElementById("return-date");

    rentalInput.min = getToday();
    returnInput.min = getToday();

    rentalInput.addEventListener("change", function() {
        returnInput.min = rentalInput.value || getToday();

        if (returnInput.value && returnInput.value <= rentalInput.value) {
            returnInput.value = "";
        }
    });

    // Booking form
    document.getElementById("booking-form").addEventListener("submit", function(event) {
        event.preventDefault();

        const carName = carSelect.value;
        const rentalDate = rentalInput.value;
        const returnDate = returnInput.value;

        // Validate dates
        if (rentalDate < getToday()) {
            alert("Rental date cannot be in the past.");
            return;
        }

        if (returnDate <= rentalDate) {
            alert("Return date must be after rental date.");
            return;
        }

        // Validate card details, but never save them
        const cardName = document.getElementById("card-name").value.trim();
        const cardNumber = document.getElementById("card-number").value.replace(/\s/g, "");
        const expiryDate = document.getElementById("expiry-date").value;
        const cvv = document.getElementById("cvv").value.trim();

        if (!cardName) {
            alert("Please enter the cardholder name.");
            return;
        }

        if (!/^\d{12,19}$/.test(cardNumber)) {
            alert("Enter 12 to 19 digits for the card number.");
            return;
        }

        if (!/^\d{3,4}$/.test(cvv)) {
            alert("Enter a 3 or 4 digit CVV.");
            return;
        }

        if (!expiryDate || expiryDate < getToday().slice(0, 7)) {
            alert("Please enter a valid card expiry date.");
            return;
        }

        const selectedCar = cars.find(function(car) {
            return car.name === carName;
        });

        if (!selectedCar) {
            alert("Please select a valid car.");
            return;
        }

        const start = new Date(rentalDate + "T00:00:00");
        const end = new Date(returnDate + "T00:00:00");
        const rentalDays = Math.round(
            (end - start) / (1000 * 60 * 60 * 24)
        );

        // Save booking information only.
        // Card name, card number, expiry and CVV are not saved.
        const state = {
            carName: selectedCar.name,
            pricePerDay: selectedCar.price,
            rentalDate: rentalDate,
            returnDate: returnDate,
            rentalDays: rentalDays,
            rentalCost: rentalDays * selectedCar.price,
            bookingConfirmed: true,
            carPickedUp: false,
            carReturned: false,
            returnLocation: "",
            inspectionCompleted: false,
            condition: "",
            damageFee: 0,
            paymentCompleted: false
        };

        saveState(state);

        // Clear card fields after validation
        document.getElementById("card-name").value = "";
        document.getElementById("card-number").value = "";
        document.getElementById("expiry-date").value = "";
        document.getElementById("cvv").value = "";

        renderCustomerPage();
        alert("Booking confirmed.");
    });

    // Pick up car
    document.getElementById("pickup-button").addEventListener("click", function() {
        const state = getState();

        if (!state || !state.bookingConfirmed) {
            alert("Please book a car first.");
            return;
        }

        if (state.carPickedUp) {
            alert("The car has already been picked up.");
            return;
        }

        state.carPickedUp = true;
        saveState(state);
        renderCustomerPage();
        alert("Car pickup confirmed at the AZoom office.");
    });

    // Return car
    document.getElementById("return-button").addEventListener("click", function() {
        const state = getState();

        if (!state || !state.carPickedUp) {
            alert("Please pick up the car before returning it.");
            return;
        }

        if (state.carReturned) {
            alert("The car has already been returned.");
            return;
        }

        state.returnLocation = document.getElementById("return-location").value;
        state.carReturned = true;
        saveState(state);
        renderCustomerPage();
        alert("Car return confirmed.");
    });

    // Final payment
    document.getElementById("payment-button").addEventListener("click", function() {
        const state = getState();

        if (!state || !state.inspectionCompleted) {
            alert("Please wait for the employee to inspect the car.");
            return;
        }

        if (state.paymentCompleted) {
            alert("Payment has already been confirmed.");
            return;
        }

        state.paymentCompleted = true;
        saveState(state);
        renderCustomerPage();
        alert("Final payment confirmed for this rent.");
    });

        // Start New Rental button
        document.getElementById("reset-button").addEventListener("click", function() {
            const confirmed = confirm(
                "Are you sure you want to clear the current rental and start a new one?"
            );

            if (!confirmed) {
                return;
            }

            localStorage.removeItem(STORAGE_KEY);

            document.getElementById("booking-form").reset();

            renderCustomerPage();

            alert("Rental record cleared. You can start a new booking.");
        });

    renderCustomerPage();
}

function renderCustomerPage() {
    const state = getState();

    const bookingResult = document.getElementById("booking-result");
    const pickupStatus = document.getElementById("pickup-status");
    const returnStatus = document.getElementById("return-status");
    const finalBill = document.getElementById("final-bill");
    const paymentStatus = document.getElementById("payment-status");

    if (!state) {
        bookingResult.textContent = "No booking has been made yet.";
        pickupStatus.textContent = "Waiting for booking.";
        returnStatus.textContent = "Waiting for car pickup.";
        finalBill.textContent = "The final bill will appear after employee inspection.";
        paymentStatus.textContent = "Waiting for final bill.";

        document.getElementById("pickup-button").disabled = true;
        document.getElementById("return-button").disabled = true;
        document.getElementById("payment-button").disabled = true;
        return;
    }

    bookingResult.innerHTML = `
        <h3>Booking Details</h3>
        <p><strong>Car:</strong> ${escapeHTML(state.carName)}</p>
        <p><strong>Rental Date:</strong> ${escapeHTML(state.rentalDate)}</p>
        <p><strong>Return Date:</strong> ${escapeHTML(state.returnDate)}</p>
        <p><strong>Rental Days:</strong> ${state.rentalDays}</p>
        <p><strong>Price per Day:</strong> ${money(state.pricePerDay)}</p>
        <p><strong>Rental Cost:</strong> ${money(state.rentalCost)}</p>
        <p><strong>Status:</strong> Booking Confirmed</p>
    `;

    pickupStatus.textContent = state.carPickedUp
        ? "Car picked up from the AZoom office."
        : "Booking confirmed. Ready for pickup at the AZoom office.";

    returnStatus.textContent = state.carReturned
        ? "Car returned to " + state.returnLocation + "."
        : "Waiting for car return.";

    finalBill.innerHTML = billHTML(state);

    paymentStatus.textContent = state.paymentCompleted
        ? "Final payment confirmed."
        : state.inspectionCompleted
            ? "Final bill is ready. Please confirm payment."
            : "Waiting for employee inspection.";

    document.getElementById("pickup-button").disabled =
        !state.bookingConfirmed || state.carPickedUp;

    document.getElementById("return-button").disabled =
        !state.carPickedUp || state.carReturned;

    document.getElementById("payment-button").disabled =
        !state.inspectionCompleted || state.paymentCompleted;
}

// 5. Employee page
function setupEmployeePage() {
    document.getElementById("inspection-form").addEventListener("submit", function(event) {
        event.preventDefault();

        const state = getState();

        if (!state || !state.carReturned) {
            alert("The customer must return the car before inspection.");
            return;
        }

        if (state.inspectionCompleted) {
            alert("Inspection has already been completed.");
            return;
        }

        const condition = document.getElementById("damage-status").value;

        let damageFee = 0;

        if (condition === "Minor Damage") {
            damageFee = MINOR_DAMAGE_FEE;
        } else if (condition === "Severe Damage") {
            damageFee = SEVERE_DAMAGE_FEE;
        }

        state.condition = condition;
        state.damageFee = damageFee;
        state.inspectionCompleted = true;

        saveState(state);
        renderEmployeePage();

        alert("Inspection completed. Final bill has been updated.");
    });

    renderEmployeePage();
}

function renderEmployeePage() {
    const state = getState();

    const booking = document.getElementById("employee-booking");
    const pickup = document.getElementById("employee-pickup-status");
    const returned = document.getElementById("employee-return-status");
    const inspection = document.getElementById("inspection-result");
    const bill = document.getElementById("employee-final-bill");
    const inspectionButton = document.getElementById("inspection-button");

    if (!state) {
        booking.textContent = "No customer booking found.";
        pickup.textContent = "Waiting for pickup.";
        returned.textContent = "Waiting for return.";
        inspection.textContent = "Waiting for car return.";
        bill.textContent = "The final bill will appear after inspection.";
        inspectionButton.disabled = true;
        return;
    }

    booking.innerHTML = `
        <p><strong>Car:</strong> ${escapeHTML(state.carName)}</p>
        <p><strong>Rental Date:</strong> ${escapeHTML(state.rentalDate)}</p>
        <p><strong>Return Date:</strong> ${escapeHTML(state.returnDate)}</p>
        <p><strong>Rental Days:</strong> ${state.rentalDays}</p>
        <p><strong>Price per Day:</strong> ${money(state.pricePerDay)}</p>
        <p><strong>Rental Cost:</strong> ${money(state.rentalCost)}</p>
    `;

    pickup.textContent = state.carPickedUp
        ? "Status: Car picked up from the AZoom office."
        : "Status: Waiting for customer pickup.";

    returned.textContent = state.carReturned
        ? "Status: Returned to " + state.returnLocation + "."
        : "Status: Waiting for customer to return the car.";

    inspection.textContent = state.inspectionCompleted
        ? "Inspection completed. Condition: " + state.condition +
          ". Damage fee: " + money(state.damageFee) + "."
        : state.carReturned
            ? "Car returned. Ready for inspection."
            : "Waiting for car return.";

    bill.innerHTML = billHTML(state);

    inspectionButton.disabled =
        !state.carReturned || state.inspectionCompleted;

    document.getElementById("damage-status").disabled =
        !state.carReturned || state.inspectionCompleted;
}

// 6. Start the correct page
if (document.getElementById("booking-form")) {
    setupCustomerPage();
}

if (document.getElementById("inspection-form")) {
    setupEmployeePage();
}

// Update the page when shared data changes in another browser tab
window.addEventListener("storage", function(event) {
    if (event.key === STORAGE_KEY || event.key === null) {
        if (document.getElementById("booking-form")) {
            renderCustomerPage();
        }

        if (document.getElementById("inspection-form")) {
            renderEmployeePage();
        }
    }
});


// 7. Login system
function setupLogin() {
    const loginForm = document.getElementById("login-form");

    if (!loginForm) {
        return;
    }

    loginForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const message = document.getElementById("login-message");

        // Employee login
        if (username === "employee" && password === "employee123") {
            sessionStorage.setItem("azoomUserRole", "employee");
            window.location.href = "employee.html";
            return;
        }

        // Registered customer login
        let accounts = {};

        try {
            accounts = JSON.parse(
                localStorage.getItem("azoomDemoAccounts") || "{}"
            );
        } catch (error) {
            message.textContent = "Unable to read customer accounts.";
            return;
        }


        if (
            Object.prototype.hasOwnProperty.call(accounts, username) &&
            accounts[username] === password
        ) {
            sessionStorage.setItem("azoomUserRole", "customer");
            sessionStorage.setItem("azoomUsername", username);
            window.location.href = "customer.html";
        } else {
            message.textContent = "Invalid username or password.";
            message.style.color = "red";
        }
    });
}

setupLogin();

// 8. Login Popup
function setupLoginPopup() {
    const modal = document.getElementById("login-modal");
    const openButton = document.getElementById("open-login");
    const closeButton = document.getElementById("close-login");

    if (!modal || !openButton || !closeButton) {
        return;
    }

    openButton.addEventListener("click", function() {
        modal.hidden = false;
    });

    closeButton.addEventListener("click", function() {
        modal.hidden = true;
    });

    modal.addEventListener("click", function(event) {
        if (event.target === modal) {
            modal.hidden = true;
        }
    });

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            modal.hidden = true;
        }
    });
}

setupLoginPopup();

// 9. Customer Registration
function setupRegistration() {
    const registerForm = document.getElementById("register-form");
    const loginForm = document.getElementById("login-form");
    const registerButton = document.getElementById("show-register");
    const registerMessage = document.getElementById("register-message");

    if (!registerForm || !loginForm || !registerButton) {
        return;
    }

    registerButton.addEventListener("click", function() {
        registerForm.hidden = !registerForm.hidden;
        loginForm.hidden = !registerForm.hidden;

        registerButton.textContent = registerForm.hidden
            ? "Register Now"
            : "Back to Login";

        registerMessage.textContent = "";
    });

    registerForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const username = document.getElementById("register-username").value.trim();
        const password = document.getElementById("register-password").value;
        const confirmPassword = document.getElementById("confirm-password").value;

        if (username.length < 3) {
            registerMessage.textContent = "Username must have at least 3 characters.";
            return;
        }

        if (username.toLowerCase() === "employee") {
            registerMessage.textContent = "This username is reserved.";
            return;
        }

        if (password !== confirmPassword) {
            registerMessage.textContent = "Passwords do not match.";
            return;
        }

        // Demo account stored locally in this browser
        const accounts = JSON.parse(
            localStorage.getItem("azoomDemoAccounts") || "{}"
        );

        if (accounts[username]) {
            registerMessage.textContent = "Username already exists.";
            return;
        }

        accounts[username] = password;
        localStorage.setItem("azoomDemoAccounts", JSON.stringify(accounts));

        registerMessage.textContent = "Registration successful! Please log in.";
        registerMessage.style.color = "green";

        registerForm.reset();
    });
}

setupRegistration();

// 10. Logout system
function setupLogout() {
    const logoutButton = document.getElementById("logout-button");

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener("click", function() {
        sessionStorage.removeItem("azoomUserRole");
        sessionStorage.removeItem("azoomUsername");

        window.location.replace("index.html");
    });
}

setupLogout();

// 11. Page Access Control
function checkPageAccess() {
    const role = sessionStorage.getItem("azoomUserRole");
    const page = window.location.pathname;

    if (page.endsWith("/customer.html") && role !== "customer") {
        alert("Please log in as a customer first.");
        window.location.replace("index.html");
        return;
    }

    if (page.endsWith("/employee.html") && role !== "employee") {
        alert("Please log in as an employee first.");
        window.location.replace("index.html");
        return;
    }
}

checkPageAccess();
