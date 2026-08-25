import { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { facultyAPI } from "../services/api";
import "./FacultyAttendance.css";

function FacultyAttendance({
  facultyId = "FAC001",
  selectedClass: initialClass = {
    code: "CS501",
    name: "Database Management Systems",
    time: "10:00 AM - 11:00 AM",
    room: "Room 301",
    students: 45,
    icon: "DB",
  },
  onBack,
  onLogout,
}) {
  const [activeClass, setActiveClass] = useState(initialClass);
  const [myAssignedClasses, setMyAssignedClasses] = useState([initialClass]);

  const [session, setSession] = useState({
    id: "SESSION-" + Date.now(),
    payload: JSON.stringify({
      sessionId: "SESSION-" + Date.now(),
      subject: initialClass.name,
      code: initialClass.code,
      facultyId: facultyId,
      room: initialClass.room,
      expiresIn: 60,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    }),
  });

  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [isExpired, setIsExpired] = useState(false);
  const [liveAttendees, setLiveAttendees] = useState([]);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  // Load assigned classes
  useEffect(() => {
    facultyAPI.getClasses(facultyId).then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setMyAssignedClasses(res);
      }
    }).catch(() => {});
  }, [facultyId]);

  // Synchronize when initialClass prop changes
  useEffect(() => {
    setActiveClass(initialClass);
  }, [initialClass]);

  // Function to initialize a new session with the backend
  const startNewSession = useCallback(async (targetClass) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);

    const cls = targetClass || activeClass;
    try {
      const res = await facultyAPI.startSession(cls, facultyId);
      const sessId = res?.sessionId || "SESSION-" + Date.now();
      const expiresAt = res?.expiresAt || new Date(Date.now() + 60000).toISOString();
      const payload = JSON.stringify({
        sessionId: sessId,
        subject: cls.name,
        code: cls.code,
        facultyId: facultyId,
        room: cls.room,
        expiresIn: 60,
        expiresAt: expiresAt,
        createdAt: new Date().toISOString(),
      });

      setSession({
        id: sessId,
        payload: payload,
        expiresAt: expiresAt,
      });
      localStorage.setItem("active_attendance_session", payload);
      setRemainingSeconds(60);
      setIsExpired(false);
      setLiveAttendees([]);
    } catch (err) {
      console.warn("Session init fallback notice:", err.message);
      const fallbackId = "SESSION-" + Date.now();
      const exp = new Date(Date.now() + 60000).toISOString();
      const fallbackPayload = JSON.stringify({
        sessionId: fallbackId,
        subject: cls.name,
        code: cls.code,
        facultyId: facultyId,
        room: cls.room,
        expiresIn: 60,
        expiresAt: exp,
      });
      setSession({
        id: fallbackId,
        payload: fallbackPayload,
        expiresAt: exp,
      });
      localStorage.setItem("active_attendance_session", fallbackPayload);
      setRemainingSeconds(60);
      setIsExpired(false);
      setLiveAttendees([]);
    }
  }, [activeClass, facultyId]);

  // Trigger new session when activeClass changes
  useEffect(() => {
    startNewSession(activeClass);
  }, [activeClass, startNewSession]);

  // Timer countdown effect & auto-expiry sync
  useEffect(() => {
    if (isExpired) {
      localStorage.removeItem("active_attendance_session");
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsExpired(true);
          localStorage.removeItem("active_attendance_session");
          // Strictly deactivate session in backend SQLite database
          if (session?.id) {
            facultyAPI.stopSession(session.id).catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.id, isExpired]);

  // Live attendees polling while session is active
  useEffect(() => {
    if (!session.id || isExpired) return;

    const fetchLiveAttendance = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/faculty/session/${encodeURIComponent(session.id)}/live`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.attendees)) {
            setLiveAttendees(data.attendees);
          }
        }
      } catch {}
    };

    fetchLiveAttendance();
    pollRef.current = setInterval(fetchLiveAttendance, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [session.id, isExpired]);

  // Handle manual session stop
  const handleStopAttendance = () => {
    const confirmed = window.confirm(
      "Are you sure you want to stop this attendance session?"
    );
    if (confirmed) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      setIsExpired(true);
      if (session?.id) {
        facultyAPI.stopSession(session.id).catch(() => {});
      }
      if (typeof onBack === "function") {
        onBack();
      }
    }
  };

  // Generate new QR button click
  const generateNewQR = () => {
    startNewSession(activeClass);
  };

  const qrPayload = session.payload;
  const progressPercent = Math.max(0, (remainingSeconds / 60) * 100);
  const timerStatusClass =
    remainingSeconds <= 10
      ? "critical"
      : remainingSeconds <= 25
      ? "warning"
      : "normal";

  return (
    <div className="faculty-attendance-page">
      {/* =========================
          NAVIGATION HEADER
      ========================== */}
      <header className="fac-att-header">
        <div className="fac-brand">
          <div className="fac-brand-logo">SA</div>
          <div>
            <h2>Smart Attendance</h2>
            <span>Faculty Portal</span>
          </div>
        </div>

        <div className="fac-faculty-profile">
          <div className="fac-profile-avatar">F</div>
          <div className="fac-profile-info">
            <strong>Faculty</strong>
            <span>Faculty ID: {facultyId}</span>
          </div>

          <button
            className="fac-logout-button"
            onClick={onLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      </header>

      {/* =========================
          MAIN CONTAINER
      ========================== */}
      <main className="fac-attendance-container">
        {/* Back Button */}
        <button
          className="fac-back-button"
          onClick={onBack}
          type="button"
        >
          ← Back to Dashboard
        </button>

        {/* Page Heading */}
        <section className="fac-attendance-heading">
          <div>
            <p className="fac-welcome-label">ATTENDANCE SESSION</p>
            <h1>Live QR Attendance</h1>
            <p>
              Display this QR code on the smart board. Students must scan and verify face biometrics to mark attendance.
            </p>
          </div>
        </section>

        {/* Class Switcher for Faculty Assigned Classes */}
        {myAssignedClasses.length > 1 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "18px", alignItems: "center" }}>
            <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#64748b" }}>
              Switch Assigned Class:
            </span>
            {myAssignedClasses.map((c) => (
              <button
                key={c.id || c.code}
                type="button"
                onClick={() => setActiveClass(c)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  border: activeClass.code === c.code ? "1.5px solid #2563eb" : "1px solid #d1d5db",
                  background: activeClass.code === c.code ? "#eff6ff" : "#ffffff",
                  color: activeClass.code === c.code ? "#2563eb" : "#374151",
                  fontFamily: "inherit",
                  transition: "all 0.2s ease",
                }}
              >
                🏷️ {c.code} - {c.name} ({c.room})
              </button>
            ))}
          </div>
        )}

        {/* =========================
            CLASS INFORMATION CARD
        ========================== */}
        <section className="fac-attendance-class-card">
          <div className="fac-subject-icon-large">
            {activeClass.icon || activeClass.code?.slice(0, 2) || "CL"}
          </div>

          <div className="fac-attendance-class-info">
            <h2 id="subjectName">{activeClass.name}</h2>
            <div className="fac-class-meta-row">
              <span>🕐 {activeClass.time}</span>
              <span>📍 {activeClass.room}</span>
              <span>🏷️ Code: {activeClass.code}</span>
              <span>🆔 Session: {session.id}</span>
            </div>
          </div>

          <div>
            <span
              id="sessionStatus"
              className={`fac-session-status ${isExpired ? "expired" : "active"}`}
            >
              {isExpired ? "● Session Expired" : "● Attendance Active"}
            </span>
          </div>
        </section>

        {/* =========================
            QR CODE SECTION
        ========================== */}
        <section className="fac-qr-section">
          <div className="fac-qr-card">
            <div className="fac-qr-header">
              <h2>Scan to Mark Attendance</h2>
              <p>
                Students must scan this live QR code using the Smart Attendance student portal.
              </p>
            </div>

            {/* QR CODE CONTAINER */}
            <div className="fac-qr-code-container" id="qrcode">
              {!isExpired ? (
                <QRCodeSVG
                  value={qrPayload}
                  size={210}
                  level="H"
                  includeMargin={false}
                  fgColor="#111827"
                  bgColor="#ffffff"
                />
              ) : (
                <div className="fac-qr-expired-placeholder">
                  <div className="fac-qr-expired-icon">✕</div>
                  <strong style={{ color: "#ef4444", fontSize: "16px" }}>QR Code Expired</strong>
                  <span style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                    The 60s timer has ended. Click &quot;Generate New QR&quot; below.
                  </span>
                </div>
              )}
            </div>

            {/* TIMER CONTAINER (WHEN ACTIVE) */}
            {!isExpired && (
              <div className="fac-timer-container">
                <div className="fac-timer-header">
                  <div className="fac-timer-label">
                    <span className="fac-timer-pulse"></span>
                    <span>Session Timer</span>
                  </div>
                  <strong className={`fac-timer-count ${timerStatusClass}`}>
                    00:{remainingSeconds.toString().padStart(2, "0")}
                  </strong>
                </div>

                <div className="fac-progress-bar">
                  <div
                    className={`fac-progress-fill ${timerStatusClass}`}
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="fac-qr-actions">
              <button
                className="fac-regen-btn"
                onClick={generateNewQR}
                type="button"
              >
                <span>🔄</span>
                <span>Generate New QR</span>
              </button>

              <button
                className="fac-stop-btn"
                onClick={handleStopAttendance}
                type="button"
              >
                <span>🛑</span>
                <span>Stop Attendance</span>
              </button>
            </div>
          </div>
        </section>

        {/* =========================
            LIVE ATTENDEES LIST
        ========================== */}
        <section style={{ maxWidth: "860px", margin: "25px auto 0", background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", color: "#111827" }}>
                👥 Live Marked Students ({liveAttendees.length})
              </h3>
              <span style={{ fontSize: "12.5px", color: "#6b7280" }}>
                Students who completed QR &amp; Face biometric verification
              </span>
            </div>
            <span style={{ background: "#ecfdf5", color: "#059669", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "700" }}>
              ● Live Sync
            </span>
          </div>

          {liveAttendees.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: "13px", background: "#f9fafb", borderRadius: "10px" }}>
              Waiting for students to scan the QR code and verify face...
            </div>
          ) : (
            <div style={{ display: "grid", gap: "8px" }}>
              {liveAttendees.map((att, idx) => (
                <div
                  key={att.id || idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#16a34a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}>
                      ✓
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: "13.5px", color: "#166534" }}>
                        {att.studentName}
                      </strong>
                      <span style={{ fontSize: "12px", color: "#15803d" }}>
                        USN: {att.studentId}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#166534" }}>
                    Verified Present
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* =========================
            SECURITY NOTICE
        ========================== */}
        <section className="fac-security-notice" style={{ marginTop: "25px" }}>
          <div className="fac-sec-icon">🔒</div>
          <div>
            <strong>Dynamic QR &amp; AI Biometrics Active</strong>
            <p>
              Each QR code contains a time-limited token with a 60-second validity window.
              Students must verify their live face biometrics to record attendance.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default FacultyAttendance;
