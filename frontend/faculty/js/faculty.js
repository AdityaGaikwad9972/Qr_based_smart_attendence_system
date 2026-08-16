// ==========================================
// SMART ATTENDANCE - FACULTY JAVASCRIPT
// ==========================================


// ==========================================
// FACULTY LOGIN
// ==========================================

const loginForm = document.getElementById("facultyLoginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const facultyId =
            document.getElementById("facultyId").value.trim();

        const password =
            document.getElementById("password").value.trim();

        const loginMessage =
            document.getElementById("loginMessage");


        // Basic frontend validation for now
        // Backend authentication will be connected later.

        if (facultyId === "" || password === "") {

            loginMessage.textContent =
                "Please enter your Faculty ID and password.";

            loginMessage.style.color = "#dc2626";

            return;
        }


        // Temporary login for frontend testing
        localStorage.setItem("facultyLoggedIn", "true");

        localStorage.setItem(
            "facultyId",
            facultyId
        );


        loginMessage.textContent =
            "Login successful. Redirecting...";

        loginMessage.style.color = "#15803d";


        setTimeout(function () {

            window.location.href =
                "dashboard.html";

        }, 500);

    });
}



// ==========================================
// START ATTENDANCE
// ==========================================

function startAttendance(subject) {

    // Store selected subject
    localStorage.setItem(
        "selectedSubject",
        subject
    );

    // Open attendance page
    window.location.href =
        "attendance.html";
}



// ==========================================
// LOGOUT
// ==========================================

function logout() {

    localStorage.removeItem(
        "facultyLoggedIn"
    );

    localStorage.removeItem(
        "facultyId"
    );

    localStorage.removeItem(
        "selectedSubject"
    );

    window.location.href =
        "index.html";
}



// ==========================================
// DISPLAY CURRENT DATE
// ==========================================

const dateElement =
    document.getElementById("currentDate");

if (dateElement) {

    const today = new Date();

    const options = {
        day: "numeric",
        month: "long",
        year: "numeric"
    };

    dateElement.textContent =
        today.toLocaleDateString(
            "en-IN",
            options
        );
}



// ==========================================
// ATTENDANCE QR SESSION
// ==========================================

let attendanceTimer = null;

let remainingSeconds = 60;



// ==========================================
// INITIALIZE ATTENDANCE PAGE
// ==========================================

function initializeAttendance() {

    const qrContainer =
        document.getElementById("qrcode");

    // If QR container doesn't exist,
    // we are not on attendance.html.

    if (!qrContainer) {
        return;
    }


    // Get selected subject
    const selectedSubject =
        localStorage.getItem(
            "selectedSubject"
        );


    const subjectElement =
        document.getElementById(
            "subjectName"
        );


    if (
        selectedSubject &&
        subjectElement
    ) {

        subjectElement.textContent =
            selectedSubject;
    }


    // Generate first QR
    generateNewQR();
}



// ==========================================
// GENERATE QR CODE
// ==========================================

function generateNewQR() {

    const qrContainer =
        document.getElementById(
            "qrcode"
        );

    const timerElement =
        document.getElementById(
            "timer"
        );

    const expiredMessage =
        document.getElementById(
            "expiredMessage"
        );

    const activeMessage =
        document.getElementById(
            "activeMessage"
        );

    const stopButton =
        document.getElementById(
            "stopButton"
        );

    const sessionStatus =
        document.getElementById(
            "sessionStatus"
        );


    if (!qrContainer) {
        return;
    }


    // Clear previous QR
    qrContainer.innerHTML = "";


    // Create temporary session ID
    // This will later come from the backend.

    const sessionId =
        "SESSION-" + Date.now();


    // Get selected subject

    const selectedSubject =
        localStorage.getItem(
            "selectedSubject"
        ) ||
        "Database Management Systems";


    // Data stored inside the QR

    const qrData = JSON.stringify({

        sessionId: sessionId,

        subject: selectedSubject,

        expiresIn: 60

    });


    // Generate QR

    new QRCode(
        qrContainer,
        {
            text: qrData,

            width: 220,

            height: 220,

            colorDark: "#111827",

            colorLight: "#ffffff",

            correctLevel:
                QRCode.CorrectLevel.H
        }
    );


    // Reset timer

    remainingSeconds = 60;


    if (timerElement) {

        timerElement.textContent =
            remainingSeconds;
    }
    // Show timer again

    const timerContainer =
    document.querySelector(".timer-container");

    if (timerContainer) {

    timerContainer.classList.remove("hidden");
    }


    // Show active state

    if (expiredMessage) {

        expiredMessage.classList.add(
            "hidden"
        );
    }


    if (activeMessage) {

        activeMessage.classList.remove(
            "hidden"
        );
    }


    if (stopButton) {

        stopButton.classList.remove(
            "hidden"
        );
    }


    if (sessionStatus) {

        sessionStatus.textContent =
            "● Attendance Active";

        sessionStatus.className =
            "session-status active";
    }


    // Stop previous timer

    if (attendanceTimer) {

        clearInterval(
            attendanceTimer
        );
    }


    // Start new timer

    attendanceTimer =
        setInterval(
            updateTimer,
            1000
        );
}



// ==========================================
// UPDATE TIMER
// ==========================================

function updateTimer() {

    const timerElement =
        document.getElementById(
            "timer"
        );


    remainingSeconds--;


    if (timerElement) {

        timerElement.textContent =
            remainingSeconds;
    }


    // Timer reached zero

    if (remainingSeconds <= 0) {

        expireAttendance();
    }
}



// ==========================================
// EXPIRE ATTENDANCE
// ==========================================

function expireAttendance() {

    if (attendanceTimer) {

        clearInterval(
            attendanceTimer
        );

        attendanceTimer = null;
    }


    const qrContainer =
        document.getElementById(
            "qrcode"
        );

    const timerContainer =
        document.querySelector(
            ".timer-container"
        );

    const expiredMessage =
        document.getElementById(
            "expiredMessage"
        );

    const activeMessage =
        document.getElementById(
            "activeMessage"
        );

    const stopButton =
        document.getElementById(
            "stopButton"
        );

    const sessionStatus =
        document.getElementById(
            "sessionStatus"
        );


    // Remove QR

    if (qrContainer) {

        qrContainer.innerHTML = `
            <span style="
                color:#9ca3af;
                font-size:13px;
            ">
                QR Expired
            </span>
        `;
    }


    // Hide timer

    if (timerContainer) {

        timerContainer.classList.add(
            "hidden"
        );
    }


    // Show expired message

    if (expiredMessage) {

        expiredMessage.classList.remove(
            "hidden"
        );
    }


    // Hide active message

    if (activeMessage) {

        activeMessage.classList.add(
            "hidden"
        );
    }


    // Hide stop button

    if (stopButton) {

        stopButton.classList.add(
            "hidden"
        );
    }


    // Change status

    if (sessionStatus) {

        sessionStatus.textContent =
            "● Session Expired";

        sessionStatus.className =
            "session-status";
    }
}



// ==========================================
// STOP ATTENDANCE
// ==========================================

function stopAttendance() {

    if (attendanceTimer) {

        clearInterval(
            attendanceTimer
        );

        attendanceTimer = null;
    }


    const confirmed =
        confirm(
            "Are you sure you want to stop this attendance session?"
        );


    if (confirmed) {

        window.location.href =
            "dashboard.html";
    }
}



// ==========================================
// PAGE INITIALIZATION
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeAttendance();

    }
);