import { useState } from "react";

import StudentLogin from "./pages/StudentLogin";
import StudentDashboard from "./pages/StudentDashboard";
import QRScanner from "./pages/QRScanner";
import SelfieVerification from "./pages/SelfieVerification";
import LocationVerification from "./pages/LocationVerification";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [currentPage, setCurrentPage] = useState("dashboard");

  // Store attendance verification data
  const [qrData, setQrData] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [locationData, setLocationData] = useState(null);

  /*
   * LOGIN
   */
  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage("dashboard");
  };

  /*
   * LOGOUT
   */
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage("dashboard");

    // Clear attendance data
    setQrData(null);
    setSelfieImage(null);
    setLocationData(null);
  };

  /*
   * LOGIN PAGE
   */
  if (!isLoggedIn) {
    return <StudentLogin onLogin={handleLogin} />;
  }

  /*
   * QR SCANNER
   */
  if (currentPage === "qr") {
    return (
      <QRScanner
        onBack={() => {
          setCurrentPage("dashboard");
        }}

        onQRDetected={(data) => {
          console.log("QR detected in App:", data);

          // Save QR data
          setQrData(data);

          // Move to selfie verification
          setCurrentPage("selfie");
        }}
      />
    );
  }

  /*
   * SELFIE VERIFICATION
   */
  if (currentPage === "selfie") {
    return (
      <SelfieVerification
        onBack={() => {
          setCurrentPage("qr");
        }}

        onSuccess={(image) => {
          console.log("Selfie received in App:", image);

          // Save selfie
          setSelfieImage(image);

          // Move to location verification
          setCurrentPage("location");
        }}
      />
    );
  }

  /*
   * LOCATION VERIFICATION
   */
  if (currentPage === "location") {
    return (
      <LocationVerification
        onBack={() => {
          setCurrentPage("selfie");
        }}

        onSuccess={(location) => {
          console.log("Location verified:", location);

          // Save location
          setLocationData(location);

          // Move to final success page
          setCurrentPage("success");
        }}
      />
    );
  }

  /*
   * ATTENDANCE SUCCESS
   */
  if (currentPage === "success") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f8fc",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "50px",
            borderRadius: "20px",
            textAlign: "center",
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 20px",
              borderRadius: "50%",
              background: "#dcf8e9",
              color: "#0c9b50",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              fontWeight: "700",
            }}
          >
            ✓
          </div>

          <h1>Attendance Confirmed</h1>

          <p
            style={{
              color: "#8190ad",
            }}
          >
            Your attendance has been successfully marked.
          </p>

          {/* DEBUG INFORMATION */}
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              background: "#f7f8fc",
              borderRadius: "10px",
              textAlign: "left",
              fontSize: "13px",
            }}
          >
            <p>
              <strong>QR:</strong>{" "}
              {qrData ? "Verified ✓" : "Not available"}
            </p>

            <p>
              <strong>Selfie:</strong>{" "}
              {selfieImage ? "Captured ✓" : "Not available"}
            </p>

            <p>
              <strong>Location:</strong>{" "}
              {locationData ? "Verified ✓" : "Not available"}
            </p>
          </div>

          <button
            onClick={() => {
              setCurrentPage("dashboard");

              // Clear previous attendance verification
              setQrData(null);
              setSelfieImage(null);
              setLocationData(null);
            }}
            style={{
              marginTop: "20px",
              padding: "12px 25px",
              border: "none",
              borderRadius: "9px",
              background: "#7146e8",
              color: "white",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  /*
   * DASHBOARD
   */
  return (
    <StudentDashboard
      onLogout={handleLogout}
      onMarkAttendance={() => {
        // Start fresh attendance process
        setQrData(null);
        setSelfieImage(null);
        setLocationData(null);

        setCurrentPage("qr");
      }}
    />
  );
}

export default App;