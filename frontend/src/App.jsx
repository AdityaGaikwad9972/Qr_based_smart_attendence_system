import { useState } from "react";

import StudentLogin from "./pages/StudentLogin";
import StudentDashboard from "./pages/StudentDashboard";
import QRScanner from "./pages/QRScanner";
import SelfieVerification from "./pages/SelfieVerification";
import LocationVerification from "./pages/LocationVerification";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [currentPage, setCurrentPage] = useState("dashboard");

  // Attendance verification data
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

    setQrData(null);
    setSelfieImage(null);
    setLocationData(null);
  };

  /*
   * LOGIN PAGE
   */
  if (!isLoggedIn) {
    return (
      <StudentLogin
        onLogin={handleLogin}
      />
    );
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

          setQrData(data);

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
          console.log(
            "Selfie received in App:",
            image
          );

          setSelfieImage(image);

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
          console.log(
            "Location verified:",
            location
          );

          setLocationData(location);

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
            boxShadow:
              "0 10px 40px rgba(0,0,0,0.08)",
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

          <h1>
            Attendance Confirmed
          </h1>

          <p
            style={{
              color: "#8190ad",
            }}
          >
            Your attendance has been successfully marked.
          </p>

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
              {qrData
                ? "Verified ✓"
                : "Not available"}
            </p>

            <p>
              <strong>Selfie:</strong>{" "}
              {selfieImage
                ? "Captured ✓"
                : "Not available"}
            </p>

            <p>
              <strong>Location:</strong>{" "}
              {locationData
                ? "Verified ✓"
                : "Not available"}
            </p>

          </div>

          <button
            onClick={() => {

              setCurrentPage("dashboard");

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
   * ATTENDANCE HISTORY
   */
  if (currentPage === "history") {

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f7f8fc",
          padding: "40px",
        }}
      >

        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            background: "white",
            padding: "35px",
            borderRadius: "20px",
            boxShadow:
              "0 10px 40px rgba(0,0,0,0.08)",
          }}
        >

          <button
            onClick={() => {
              setCurrentPage("dashboard");
            }}

            style={{
              border: "none",
              background: "transparent",
              color: "#7146e8",
              fontWeight: "600",
              cursor: "pointer",
              marginBottom: "20px",
              fontSize: "15px",
            }}
          >
            ← Back to Dashboard
          </button>

          <h1>
            Attendance History
          </h1>

          <p
            style={{
              color: "#8190ad",
              marginTop: "8px",
              marginBottom: "30px",
            }}
          >
            View your complete attendance records.
          </p>

          <div
            style={{
              overflowX: "auto",
            }}
          >

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >

              <thead>

                <tr
                  style={{
                    background: "#f7f8fc",
                  }}
                >

                  <th style={tableHeaderStyle}>
                    Date
                  </th>

                  <th style={tableHeaderStyle}>
                    Subject
                  </th>

                  <th style={tableHeaderStyle}>
                    Time
                  </th>

                  <th style={tableHeaderStyle}>
                    Status
                  </th>

                </tr>

              </thead>

              <tbody>

                <HistoryRow
                  date="16 Aug 2026"
                  subject="Java Programming"
                  time="10:00 AM"
                  status="Present"
                />

                <HistoryRow
                  date="15 Aug 2026"
                  subject="Database Management"
                  time="11:00 AM"
                  status="Present"
                />

                <HistoryRow
                  date="14 Aug 2026"
                  subject="Artificial Intelligence"
                  time="9:00 AM"
                  status="Absent"
                />

                <HistoryRow
                  date="13 Aug 2026"
                  subject="Computer Networks"
                  time="2:00 PM"
                  status="Present"
                />

                <HistoryRow
                  date="12 Aug 2026"
                  subject="Web Technology"
                  time="10:00 AM"
                  status="Present"
                />

              </tbody>

            </table>

          </div>

        </div>

      </div>
    );
  }


  /*
   * MY PROFILE
   */
  if (currentPage === "profile") {

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f7f8fc",
          padding: "40px",
        }}
      >

        <div
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            background: "white",
            padding: "40px",
            borderRadius: "20px",
            boxShadow:
              "0 10px 40px rgba(0,0,0,0.08)",
          }}
        >

          <button
            onClick={() => {
              setCurrentPage("dashboard");
            }}

            style={{
              border: "none",
              background: "transparent",
              color: "#7146e8",
              fontWeight: "600",
              cursor: "pointer",
              marginBottom: "25px",
              fontSize: "15px",
            }}
          >
            ← Back to Dashboard
          </button>


          <div
            style={{
              textAlign: "center",
              marginBottom: "30px",
            }}
          >

            <div
              style={{
                width: "90px",
                height: "90px",
                margin: "0 auto 15px",
                borderRadius: "50%",
                background: "#7146e8",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
                fontWeight: "700",
              }}
            >
              S
            </div>

            <h1>
              Student Profile
            </h1>

            <p
              style={{
                color: "#8190ad",
                marginTop: "8px",
              }}
            >
              Your student information
            </p>

          </div>


          <div
            style={{
              display: "grid",
              gap: "15px",
            }}
          >

            <ProfileRow
              label="Student Name"
              value="Student"
            />

            <ProfileRow
              label="Student ID"
              value="AIT2026001"
            />

            <ProfileRow
              label="College"
              value="Acharya Institute of Technology"
            />

            <ProfileRow
              label="Department"
              value="Computer Science and Engineering"
            />

            <ProfileRow
              label="Academic Year"
              value="2026"
            />

          </div>

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

        setQrData(null);
        setSelfieImage(null);
        setLocationData(null);

        setCurrentPage("qr");

      }}

      onAttendanceHistory={() => {

        setCurrentPage("history");

      }}

      onProfile={() => {

        setCurrentPage("profile");

      }}

    />
  );
}


/*
 * HISTORY ROW
 */
function HistoryRow({
  date,
  subject,
  time,
  status,
}) {

  return (
    <tr>

      <td style={tableCellStyle}>
        {date}
      </td>

      <td style={tableCellStyle}>
        <strong>
          {subject}
        </strong>
      </td>

      <td style={tableCellStyle}>
        {time}
      </td>

      <td style={tableCellStyle}>

        <span
          style={{
            display: "inline-block",
            padding: "6px 12px",
            borderRadius: "20px",
            background:
              status === "Present"
                ? "#dcf8e9"
                : "#ffe3e3",
            color:
              status === "Present"
                ? "#0c9b50"
                : "#d93030",
            fontWeight: "600",
            fontSize: "13px",
          }}
        >
          {status === "Present"
            ? "✓ Present"
            : "! Absent"}
        </span>

      </td>

    </tr>
  );
}


/*
 * PROFILE ROW
 */
function ProfileRow({
  label,
  value,
}) {

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "18px",
        background: "#f7f8fc",
        borderRadius: "10px",
        gap: "20px",
      }}
    >

      <strong
        style={{
          color: "#52627c",
        }}
      >
        {label}
      </strong>

      <span
        style={{
          color: "#17223b",
          fontWeight: "600",
          textAlign: "right",
        }}
      >
        {value}
      </span>

    </div>
  );
}


const tableHeaderStyle = {
  padding: "15px",
  textAlign: "left",
  color: "#52627c",
  fontSize: "14px",
};

const tableCellStyle = {
  padding: "16px 15px",
  borderBottom: "1px solid #e7eaf1",
  color: "#52627c",
  fontSize: "14px",
};


export default App;