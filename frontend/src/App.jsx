import { useState, useEffect } from "react";
import { attendanceAPI } from "./services/api";

import StudentLogin from "./pages/StudentLogin";
import FacultyLogin from "./pages/FacultyLogin";
import AdminLogin from "./pages/AdminLogin";
import Register from "./pages/Register";
import FacultyDashboard from "./pages/FacultyDashboard";
import FacultyAttendance from "./pages/FacultyAttendance";
import FacultyReports from "./pages/FacultyReports";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import QRScanner from "./pages/QRScanner";
import SelfieVerification from "./pages/SelfieVerification";

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser")) || null;
    } catch {
      return null;
    }
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return Boolean(JSON.parse(localStorage.getItem("currentUser")));
    } catch {
      return false;
    }
  });

  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [registerRole, setRegisterRole] = useState("student"); // "student" | "faculty" | "admin"

  const [userRole, setUserRole] = useState(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem("currentUser"));
      return savedUser?.role || "student";
    } catch {
      return "student";
    }
  });

  const [studentId, setStudentId] = useState(
    currentUser?.identifier || "1AY22CS001"
  );
  const [facultyId, setFacultyId] = useState(
    localStorage.getItem("facultyId") || currentUser?.identifier || "FAC001"
  );
  const [adminId, setAdminId] = useState(
    localStorage.getItem("adminId") || currentUser?.identifier || "ADM001"
  );

  const [facultyPage, setFacultyPage] = useState("dashboard"); // "dashboard" | "attendance" | "reports"
  const [selectedClass, setSelectedClass] = useState({
    id: "cls-1",
    code: "CS501",
    icon: "DB",
    name: "Database Management Systems",
    time: "10:00 AM - 11:00 AM",
    room: "Room 301",
    students: 45,
  });

  const [currentPage, setCurrentPage] = useState("dashboard");

  // Attendance verification data
  const [qrData, setQrData] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [attendanceSuccessInfo, setAttendanceSuccessInfo] = useState(null);

  // Student history state for history page
  const [studentHistoryRecords, setStudentHistoryRecords] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  /*
   * STUDENT LOGIN
   */
  const handleStudentLogin = (user) => {
    setUserRole("student");
    const resolvedUser = typeof user === "object" ? user : { identifier: user, role: "student", name: "Student" };
    setStudentId(resolvedUser.identifier || "1AY22CS001");
    setCurrentUser(resolvedUser);
    localStorage.setItem("currentUser", JSON.stringify(resolvedUser));
    setIsLoggedIn(true);
    setCurrentPage("dashboard");
  };

  /*
   * FACULTY LOGIN
   */
  const handleFacultyLogin = (user) => {
    setUserRole("faculty");
    const resolvedUser = typeof user === "object" ? user : { identifier: user, role: "faculty", name: "Dr. Ramesh Sharma" };
    setFacultyId(resolvedUser.identifier || "FAC001");
    setCurrentUser(resolvedUser);
    localStorage.setItem("currentUser", JSON.stringify(resolvedUser));
    setFacultyPage("dashboard");
    setIsLoggedIn(true);
  };

  /*
   * ADMIN LOGIN
   */
  const handleAdminLogin = (user) => {
    setUserRole("admin");
    const resolvedUser = typeof user === "object" ? user : { identifier: user, role: "admin", name: "Institutional Administrator" };
    setAdminId(resolvedUser.identifier || "ADM001");
    setCurrentUser(resolvedUser);
    localStorage.setItem("currentUser", JSON.stringify(resolvedUser));
    setIsLoggedIn(true);
  };

  /*
   * LOGOUT
   */
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setAuthMode("login");
    setCurrentPage("dashboard");
    setFacultyPage("dashboard");

    setQrData(null);
    setSelfieImage(null);
    setAttendanceSuccessInfo(null);

    localStorage.removeItem("currentUser");
    localStorage.removeItem("facultyLoggedIn");
    localStorage.removeItem("facultyId");
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("adminId");
  };

  /*
   * Load history when opening history page
   */
  useEffect(() => {
    if (currentPage === "history") {
      const activeUSN = currentUser?.identifier || studentId || "1AY22CS001";
      setIsLoadingHistory(true);
      attendanceAPI
        .getStudentHistory(activeUSN)
        .then((res) => {
          if (res && Array.isArray(res.history)) {
            setStudentHistoryRecords(res.history);
          }
          setIsLoadingHistory(false);
        })
        .catch(() => {
          setIsLoadingHistory(false);
        });
    }
  }, [currentPage, currentUser, studentId]);

  /*
   * AUTHENTICATION FLOW: REGISTER OR LOGIN
   */
  if (!isLoggedIn) {
    if (authMode === "register") {
      return (
        <Register
          initialRole={registerRole}
          onBackToLogin={(role) => {
            if (role) {
              setUserRole(role);
            }
            setAuthMode("login");
          }}
          onRegisterSuccess={(role) => {
            if (role) {
              setUserRole(role);
            }
            setAuthMode("login");
          }}
        />
      );
    }

    if (userRole === "admin") {
      return (
        <AdminLogin
          onLogin={handleAdminLogin}
          onSwitchToStudent={() => setUserRole("student")}
          onSwitchToFaculty={() => setUserRole("faculty")}
          onSwitchRole={(r) => setUserRole(r)}
          onNavigateToSignup={() => {
            setRegisterRole("admin");
            setAuthMode("register");
          }}
        />
      );
    }

    if (userRole === "faculty") {
      return (
        <FacultyLogin
          onLogin={handleFacultyLogin}
          onSwitchToStudent={() => setUserRole("student")}
          onSwitchToAdmin={() => setUserRole("admin")}
          onSwitchRole={(r) => setUserRole(r)}
          onNavigateToSignup={() => {
            setRegisterRole("faculty");
            setAuthMode("register");
          }}
        />
      );
    }

    return (
      <StudentLogin
        onLogin={handleStudentLogin}
        onSwitchToFaculty={() => setUserRole("faculty")}
        onSwitchToAdmin={() => setUserRole("admin")}
        onSwitchRole={(r) => setUserRole(r)}
        onNavigateToSignup={() => {
          setRegisterRole("student");
          setAuthMode("register");
        }}
      />
    );
  }

  /*
   * ADMIN PORTAL
   */
  if (userRole === "admin") {
    return (
      <AdminDashboard
        adminId={currentUser?.identifier || adminId}
        onLogout={handleLogout}
      />
    );
  }

  /*
   * FACULTY PORTAL FLOW
   */
  if (userRole === "faculty") {
    if (facultyPage === "attendance") {
      return (
        <FacultyAttendance
          facultyId={currentUser?.identifier || facultyId}
          selectedClass={selectedClass}
          onBack={() => setFacultyPage("dashboard")}
          onLogout={handleLogout}
        />
      );
    }

    if (facultyPage === "reports") {
      return (
        <FacultyReports
          facultyId={currentUser?.identifier || facultyId}
          onBack={() => setFacultyPage("dashboard")}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <FacultyDashboard
        currentUser={currentUser}
        facultyId={currentUser?.identifier || facultyId}
        onLogout={handleLogout}
        onStartAttendance={(cls) => {
          setSelectedClass(cls);
          setFacultyPage("attendance");
        }}
        onViewReports={() => setFacultyPage("reports")}
      />
    );
  }

  /*
   * QR SCANNER (STEP 1)
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
   * SELFIE & AI BIOMETRIC VERIFICATION (STEP 2 -> DIRECT DB SUBMISSION)
   */
  if (currentPage === "selfie") {
    return (
      <SelfieVerification
        currentUser={currentUser}
        studentId={currentUser?.identifier || studentId || "1AY22CS001"}
        qrData={
          typeof qrData === "string"
            ? (() => {
                try {
                  return JSON.parse(qrData);
                } catch {
                  return { subject: qrData };
                }
              })()
            : qrData
        }
        onBack={() => {
          setCurrentPage("qr");
        }}
        onSuccess={async (image) => {
          console.log("Selfie verified in App, recording attendance in SQLite database:", image);
          setSelfieImage(image);

          let parsedQR = {};
          try {
            parsedQR = typeof qrData === "string" ? JSON.parse(qrData) : (qrData || {});
          } catch {
            parsedQR = {
              subject: qrData || "Database Management Systems",
              code: "CS501",
              sessionId: "SESSION-" + Date.now(),
            };
          }

          const activeStudentUSN = currentUser?.identifier || studentId || "1AY22CS001";
          const activeStudentName = currentUser?.name || "Student";

          try {
            const res = await attendanceAPI.verifyAndMarkAttendance({
              student_id: activeStudentUSN,
              student_name: activeStudentName,
              session_id: parsedQR.sessionId || "SESSION-LIVE",
              subject_code: parsedQR.code || "CS501",
              subject_name: parsedQR.subject || "Database Management Systems",
              selfie_image: image,
            });

            console.log("Attendance recorded successfully in SQLite database:", res);
            setAttendanceSuccessInfo(res);
            setCurrentPage("success");
          } catch (err) {
            console.error("Attendance submission error:", err);
            alert("Attendance Notice: " + (err.message || "Failed to mark attendance."));
            setCurrentPage("dashboard");
          }
        }}
      />
    );
  }

  /*
   * ATTENDANCE CONFIRMED (SUCCESS SCREEN)
   */
  if (currentPage === "success") {
    let parsedQR = {};
    try {
      parsedQR = typeof qrData === "string" ? JSON.parse(qrData) : (qrData || {});
    } catch {
      parsedQR = { subject: "Classroom Lecture", code: "CS501" };
    }

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f8fc",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "45px 35px",
            borderRadius: "20px",
            textAlign: "center",
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
            maxWidth: "460px",
            width: "100%",
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

          <h1 style={{ margin: "0 0 6px 0", fontSize: "24px", color: "#111827" }}>
            Attendance Confirmed!
          </h1>

          <p style={{ color: "#64748b", marginTop: "4px", fontSize: "14px" }}>
            Your attendance has been successfully recorded in the SQLite database.
          </p>

          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              textAlign: "left",
              fontSize: "13px",
              display: "grid",
              gap: "8px",
            }}
          >
            <div>
              <strong>Student:</strong> {currentUser?.name || "Student"} ({currentUser?.identifier || studentId})
            </div>
            <div>
              <strong>Subject:</strong> {parsedQR.subject || attendanceSuccessInfo?.record?.subject || "Database Management Systems"} ({parsedQR.code || attendanceSuccessInfo?.record?.code || "CS501"})
            </div>
            <div>
              <strong>QR Authentication:</strong> <span style={{ color: "#16a34a", fontWeight: "600" }}>Verified Active Session ✓</span>
            </div>
            <div>
              <strong>AI Biometric Match:</strong> <span style={{ color: "#16a34a", fontWeight: "600" }}>Deep Face Neural Match Verified ✓</span>
            </div>
            <div>
              <strong>Status:</strong> <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "12px", fontWeight: "700" }}>PRESENT</span>
            </div>
          </div>

          <button
            onClick={() => {
              setCurrentPage("dashboard");
              setQrData(null);
              setSelfieImage(null);
              setAttendanceSuccessInfo(null);
            }}
            style={{
              marginTop: "24px",
              padding: "13px 25px",
              border: "none",
              borderRadius: "10px",
              background: "#7146e8",
              color: "white",
              fontWeight: "600",
              fontSize: "15px",
              cursor: "pointer",
              width: "100%",
              transition: "background 0.2s",
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  /*
   * ATTENDANCE HISTORY (DYNAMIC FROM DATABASE)
   */
  if (currentPage === "history") {
    const activeUSN = currentUser?.identifier || studentId || "1AY22CS001";
    const activeName = currentUser?.name || "Student";

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f7f8fc",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            background: "white",
            padding: "35px",
            borderRadius: "20px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          }}
        >
          <button
            onClick={() => setCurrentPage("dashboard")}
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

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
            <div>
              <h1 style={{ margin: 0 }}>Attendance History</h1>
              <p style={{ color: "#8190ad", marginTop: "4px", margin: 0 }}>
                Live records for <strong>{activeName}</strong> ({activeUSN})
              </p>
            </div>

            <span
              style={{
                background: "#f0f2f8",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#475569",
              }}
            >
              Total Records: {studentHistoryRecords.length}
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            {isLoadingHistory ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#8b93a7" }}>
                Loading attendance history from database...
              </div>
            ) : studentHistoryRecords.length === 0 ? (
              <div style={{ padding: "50px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>📋</div>
                <h3 style={{ margin: "0 0 6px 0", color: "#18213a" }}>No Attendance Records Found</h3>
                <p style={{ margin: 0, color: "#8b93a7", fontSize: "14px" }}>
                  You have not marked attendance for any class sessions yet.
                </p>
              </div>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ background: "#f7f8fc" }}>
                    <th style={tableHeaderStyle}>Date</th>
                    <th style={tableHeaderStyle}>Subject</th>
                    <th style={tableHeaderStyle}>Code</th>
                    <th style={tableHeaderStyle}>Time</th>
                    <th style={tableHeaderStyle}>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {studentHistoryRecords.map((record, index) => (
                    <tr key={record.id || index}>
                      <td style={tableCellStyle}>{record.date}</td>
                      <td style={tableCellStyle}>
                        <strong>{record.subject}</strong>
                      </td>
                      <td style={tableCellStyle}>
                        <span
                          style={{
                            background: "#f0f2f8",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontWeight: "600",
                            fontSize: "12px",
                          }}
                        >
                          {record.code || "CS501"}
                        </span>
                      </td>
                      <td style={tableCellStyle}>{record.time || "—"}</td>
                      <td style={tableCellStyle}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 12px",
                            borderRadius: "20px",
                            background:
                              record.status === "Present"
                                ? "#dcf8e9"
                                : "#ffe3e3",
                            color:
                              record.status === "Present"
                                ? "#0c9b50"
                                : "#d93030",
                            fontWeight: "600",
                            fontSize: "13px",
                          }}
                        >
                          {record.status === "Present" ? "✓ Present" : "! Absent"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  /*
   * MY PROFILE (REAL DATA & REGISTERED FACE FROM DATABASE)
   */
  if (currentPage === "profile") {
    const studentName = currentUser?.name || "Student";
    const studentUSN = currentUser?.identifier || studentId || "1AY22CS001";
    const email = currentUser?.email || `${studentUSN.toLowerCase()}@acharya.ac.in`;
    const department = currentUser?.department || "Computer Science & Engineering";
    const semester = currentUser?.semester || 5;
    const section = currentUser?.section || "A";
    const faceImage = currentUser?.face_image;

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f7f8fc",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            background: "white",
            padding: "40px",
            borderRadius: "20px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          }}
        >
          <button
            onClick={() => setCurrentPage("dashboard")}
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
            {faceImage ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img
                  src={faceImage}
                  alt={studentName}
                  style={{
                    width: "110px",
                    height: "110px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "4px solid #7146e8",
                    boxShadow: "0 8px 24px rgba(113, 70, 232, 0.25)",
                    marginBottom: "12px",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: "16px",
                    right: "4px",
                    background: "#16a34a",
                    color: "white",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: "bold",
                  }}
                  title="Biometric Face Verified"
                >
                  ✓
                </span>
              </div>
            ) : (
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  margin: "0 auto 15px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #7146e8, #9333ea)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "42px",
                  fontWeight: "700",
                  boxShadow: "0 8px 24px rgba(113, 70, 232, 0.2)",
                }}
              >
                {studentName.charAt(0).toUpperCase()}
              </div>
            )}

            <h1 style={{ margin: "0 0 6px 0", fontSize: "26px", color: "#17223b" }}>
              {studentName}
            </h1>

            <p style={{ color: "#8190ad", margin: 0, fontSize: "14px" }}>
              USN: <strong>{studentUSN}</strong> • Department of {department}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            <ProfileRow label="Student Full Name" value={studentName} />
            <ProfileRow label="University Seat No (USN)" value={studentUSN} />
            <ProfileRow label="College / Institution" value="Acharya Institute of Technology" />
            <ProfileRow label="Department" value={department} />
            <ProfileRow label="Current Semester" value={`Semester ${semester}`} />
            <ProfileRow label="Section" value={`Section ${section}`} />
            <ProfileRow label="Official Email" value={email} />
            <ProfileRow
              label="Biometric Face Registration"
              value={
                faceImage || currentUser?.has_face_registered ? (
                  <span style={{ color: "#16a34a", fontWeight: "700" }}>✓ Enrolled & Stored in Database</span>
                ) : (
                  <span style={{ color: "#eab308", fontWeight: "700" }}>Pending Enrollment</span>
                )
              }
            />
            <ProfileRow label="Academic Year" value="2026 - 2027" />
          </div>
        </div>
      </div>
    );
  }

  /*
   * STUDENT DASHBOARD
   */
  return (
    <StudentDashboard
      currentUser={currentUser}
      studentId={currentUser?.identifier || studentId}
      onLogout={handleLogout}
      onMarkAttendance={() => {
        setQrData(null);
        setSelfieImage(null);
        setAttendanceSuccessInfo(null);
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
 * PROFILE ROW COMPONENT
 */
function ProfileRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        background: "#f7f8fc",
        borderRadius: "12px",
        gap: "20px",
      }}
    >
      <strong style={{ color: "#52627c", fontSize: "14px" }}>{label}</strong>
      <span style={{ color: "#17223b", fontWeight: "600", textAlign: "right", fontSize: "14px" }}>
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