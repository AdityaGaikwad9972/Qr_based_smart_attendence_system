import { useState, useEffect } from "react";
import { attendanceAPI, authAPI } from "../services/api";
import "./StudentDashboard.css";

function StudentDashboard({
  currentUser,
  studentId = "1AY22CS001",
  onLogout,
  onMarkAttendance,
  onAttendanceHistory,
  onProfile,
}) {
  const [profile, setProfile] = useState(() => {
    if (currentUser) return currentUser;
    try {
      return JSON.parse(localStorage.getItem("currentUser")) || null;
    } catch {
      return null;
    }
  });

  const [historyData, setHistoryData] = useState({
    overallPercentage: 0,
    classesPresent: 0,
    classesAbsent: 0,
    totalClasses: 0,
    history: [],
  });

  const [allottedClasses, setAllottedClasses] = useState([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [selectedDayFilter, setSelectedDayFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  const activeId = profile?.identifier || currentUser?.identifier || studentId || "1AY23CS011";
  const studentName = profile?.name || currentUser?.name || "Student";
  const studentUSN = profile?.identifier || currentUser?.identifier || studentId || "1AY23CS011";
  const department = profile?.department || currentUser?.department || "Computer Science & Engineering";
  const semester = profile?.semester || currentUser?.semester || 7;
  const section = profile?.section || currentUser?.section || "A";

  const todayDayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const loadAllottedClasses = () => {
    setIsLoadingClasses(true);
    attendanceAPI
      .getStudentAllottedClasses(activeId, semester, section)
      .then((data) => {
        if (Array.isArray(data)) {
          setAllottedClasses(data);
        }
        setIsLoadingClasses(false);
      })
      .catch((err) => {
        console.warn("Could not fetch allotted classes:", err);
        setIsLoadingClasses(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // 1. Fetch real student attendance history from database
    attendanceAPI
      .getStudentHistory(activeId)
      .then((res) => {
        if (!isMounted) return;
        if (res) {
          setHistoryData({
            overallPercentage: typeof res.overallPercentage === "number" ? res.overallPercentage : 100,
            classesPresent: res.classesPresent || 0,
            classesAbsent: res.classesAbsent || 0,
            totalClasses: res.totalClasses || 0,
            history: Array.isArray(res.history) ? res.history : [],
          });

          if (res.student && !profile?.face_image) {
            setProfile((prev) => ({
              ...(prev || {}),
              ...res.student,
            }));
          }
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Could not fetch real attendance history:", err);
        if (isMounted) setIsLoading(false);
      });

    // 2. Fetch full student profile if missing
    if (!profile?.name || profile.name === "Student") {
      authAPI
        .getProfile(activeId)
        .then((userProfile) => {
          if (isMounted && userProfile) {
            setProfile(userProfile);
          }
        })
        .catch(() => {});
    }

    // 3. Fetch allotted classes
    loadAllottedClasses();

    const handleTimetableUpdate = () => {
      loadAllottedClasses();
    };

    window.addEventListener("timetable_updated", handleTimetableUpdate);
    window.addEventListener("focus", handleTimetableUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("timetable_updated", handleTimetableUpdate);
      window.removeEventListener("focus", handleTimetableUpdate);
    };
  }, [activeId, semester, section]);

  const recentRecords = historyData.history.slice(0, 5);
  const percentage = historyData.totalClasses > 0 ? historyData.overallPercentage : 0;
  const isEligible = percentage >= 75 || historyData.totalClasses === 0;

  // Filter allotted classes by selected day and search query
  const filteredClasses = allottedClasses.filter((c) => {
    // Day match
    if (selectedDayFilter === "TODAY") {
      if (c.day && c.day.toLowerCase() !== todayDayName.toLowerCase()) {
        return false;
      }
    } else if (selectedDayFilter !== "ALL") {
      if (c.day && c.day.toLowerCase() !== selectedDayFilter.toLowerCase()) {
        return false;
      }
    }

    // Search query match (Subject name, code, room, faculty name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (c.name || "").toLowerCase().includes(q);
      const matchCode = (c.code || "").toLowerCase().includes(q);
      const matchRoom = (c.room || "").toLowerCase().includes(q);
      const matchFac = (c.facultyName || "").toLowerCase().includes(q);
      return matchName || matchCode || matchRoom || matchFac;
    }

    return true;
  });

  const todayClassesCount = allottedClasses.filter(
    (c) => c.day && c.day.toLowerCase() === todayDayName.toLowerCase()
  ).length;

  // Helper to compute formatted calendar date for a given weekday (rolls to next week if day has already passed)
  const getWeekdayDate = (dayName, includeFull = false) => {
    const daysMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const targetDayIndex = daysMap[dayName?.toLowerCase() || "monday"] ?? 1;
    const now = new Date();
    const currentDayIndex = now.getDay();
    let diff = targetDayIndex - currentDayIndex;
    // If the day has passed earlier in the current week, show next week's date for that day
    if (diff < 0) {
      diff += 7;
    }
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + diff);

    if (includeFull) {
      return targetDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      }); // e.g. "Monday, Aug 24, 2026"
    }

    return targetDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }); // e.g. "Aug 24"
  };

  const availableDays = ["ALL", "TODAY", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];


  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <div className="dashboard-a">A</div>
          <div>
            <h2>Smart Attendance</h2>
            <span>Student Portal</span>
          </div>
        </div>

        <div className="student-header">
          <div
            className="student-info"
            onClick={onProfile}
            style={{ cursor: "pointer" }}
            title="Click to view full profile"
          >
            {profile?.face_image ? (
              <img
                src={profile.face_image}
                alt={studentName}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #7146e8",
                }}
              />
            ) : (
              <div className="student-avatar">
                {studentName.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <strong>{studentName}</strong>
              <span>USN: {studentUSN} • Sem {semester} ({section})</span>
            </div>
          </div>

          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-container">
        {/* Welcome Section */}
        <section className="welcome-section">
          <div>
            <p className="welcome-small">WELCOME BACK</p>
            <h1>
              Hello, <span>{studentName.split(" ")[0]}!</span>
            </h1>
            <p className="welcome-description">
              Department of {department} • Semester {semester} - Section {section} • Academic Session 2026
            </p>
          </div>

          <div className="college-badge">
            <strong>Acharya Institute of Technology</strong>
            <span>Biometric QR Smart Attendance System</span>
          </div>
        </section>

        {/* Statistics */}
        <section className="stats-grid">
          <div className="stat-card attendance-card">
            <div className="stat-icon">%</div>
            <div>
              <p>Overall Attendance</p>
              <h2>{percentage}%</h2>
              <span className={isEligible ? "positive-text" : "negative-text"}>
                {isEligible ? "✓ Eligible for exams (>=75%)" : "⚠ Shortage warning (<75%)"}
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">✓</div>
            <div>
              <p>Classes Present</p>
              <h2>{historyData.classesPresent}</h2>
              <span>Out of {historyData.totalClasses} recorded classes</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon red">!</div>
            <div>
              <p>Classes Absent</p>
              <h2>{historyData.classesAbsent}</h2>
              <span>Out of {historyData.totalClasses} recorded classes</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">📚</div>
            <div>
              <p>Allotted Classes</p>
              <h2>{allottedClasses.length}</h2>
              <span style={{ color: "#6366f1", fontWeight: "600" }}>
                {todayClassesCount > 0 ? `⚡ ${todayClassesCount} classes today (${todayDayName})` : "Active timetable"}
              </span>
            </div>
          </div>
        </section>

        {/* Action Cards */}
        <section className="action-section">
          <div className="section-heading">
            <h2>Quick Actions</h2>
            <p>Access your attendance and profile features</p>
          </div>

          <div className="action-grid">
            {/* MARK ATTENDANCE */}
            <button className="action-card" onClick={onMarkAttendance}>
              <div className="action-icon qr-icon">QR</div>
              <div>
                <h3>Mark Attendance</h3>
                <p>Scan classroom QR with live AI face verification</p>
              </div>
              <span className="action-arrow">→</span>
            </button>

            {/* ATTENDANCE HISTORY */}
            <button className="action-card" onClick={onAttendanceHistory}>
              <div className="action-icon history-icon">↺</div>
              <div>
                <h3>Attendance History</h3>
                <p>View all {historyData.history.length} attendance logs from DB</p>
              </div>
              <span className="action-arrow">→</span>
            </button>

            {/* MY PROFILE */}
            <button className="action-card" onClick={onProfile}>
              <div className="action-icon profile-icon">👤</div>
              <div>
                <h3>My Profile</h3>
                <p>USN, registered face, and enrollment info</p>
              </div>
              <span className="action-arrow">→</span>
            </button>
          </div>
        </section>

        {/* =========================================================
            ALLOTTED CLASSES & SCHEDULE SECTION (NEW FEATURE)
            ========================================================= */}
        <section className="allotted-classes-section">
          <div className="allotted-section-header">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2>My Allotted Classes & Schedule</h2>
                <span className="allotted-count-badge">
                  {allottedClasses.length} Allotted Classes
                </span>
              </div>
              <p>
                Classroom schedule with room codes, lecture timings, and faculty assigned for Semester {semester} ({section}).
              </p>
            </div>

            <div className="allotted-header-actions">
              <div className="allotted-search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search subject, room, faculty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="search-clear-btn"
                    onClick={() => setSearchQuery("")}
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                type="button"
                className="allotted-refresh-btn"
                onClick={loadAllottedClasses}
                disabled={isLoadingClasses}
                title="Refresh Allotted Classes"
              >
                <span>🔄</span>
                <span>{isLoadingClasses ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>

          {/* Day Filter Pills with Dates */}
          <div className="allotted-day-filters">
            {availableDays.map((day) => {
              const isActive = selectedDayFilter === day;
              let label = day;
              if (day === "ALL") {
                label = "All Days";
              } else if (day === "TODAY") {
                label = `Today (${getWeekdayDate(todayDayName)})`;
              } else {
                label = `${day} (${getWeekdayDate(day)})`;
              }

              return (
                <button
                  key={day}
                  type="button"
                  className={`day-filter-btn ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedDayFilter(day)}
                >
                  {day === "TODAY" && <span style={{ marginRight: "4px" }}>⚡</span>}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Classes Cards Grid */}
          {isLoadingClasses ? (
            <div className="allotted-loading-state">
              <div className="spinner"></div>
              <p>Loading your allotted timetable from database...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="allotted-empty-state">
              <div className="empty-icon">📅</div>
              <h3>No Allotted Classes Found</h3>
              <p>
                {searchQuery
                  ? `No classes matching "${searchQuery}" found.`
                  : selectedDayFilter === "TODAY"
                  ? `No classes scheduled for today (${getWeekdayDate(todayDayName, true)}). Enjoy your day!`
                  : selectedDayFilter !== "ALL"
                  ? `No classes scheduled on ${selectedDayFilter} (${getWeekdayDate(selectedDayFilter, true)}).`
                  : "No classes have been mapped for your semester and section yet."}
              </p>
              {selectedDayFilter !== "ALL" && (
                <button
                  type="button"
                  className="reset-filter-btn"
                  onClick={() => {
                    setSelectedDayFilter("ALL");
                    setSearchQuery("");
                  }}
                >
                  View All Days
                </button>
              )}
            </div>
          ) : (
            <div className="allotted-classes-grid">
              {filteredClasses.map((cls) => {
                const isTodayClass = cls.day && cls.day.toLowerCase() === todayDayName.toLowerCase();
                const classDateStr = getWeekdayDate(cls.day, true);
                const shortDateStr = getWeekdayDate(cls.day, false);

                return (
                  <div
                    key={cls.id || cls.code}
                    className={`student-class-card ${isTodayClass ? "is-today" : ""}`}
                  >
                    {/* Top Row: Icon + Code + Today/Date Tag */}
                    <div className="student-class-top">
                      <div className="student-class-icon">
                        {cls.icon || cls.code?.slice(0, 2) || "CL"}
                      </div>
                      <div className="student-class-title-wrap">
                        <div className="student-class-badges">
                          <span className="student-code-badge">{cls.code}</span>
                          {isTodayClass ? (
                            <span className="student-today-tag">⚡ TODAY • {shortDateStr}</span>
                          ) : (
                            <span className="student-date-badge">📅 {shortDateStr}</span>
                          )}
                        </div>
                        <h3 className="student-class-name" title={cls.name}>
                          {cls.name}
                        </h3>
                      </div>
                    </div>

                    {/* Metadata: Room Code, Scheduled Date & Day, Time, Faculty */}
                    <div className="student-class-meta-grid">
                      {/* Room Code */}
                      <div className="student-meta-item room-meta">
                        <span className="meta-label">Room Code</span>
                        <div className="meta-value room-value">
                          <span className="pin-icon">📍</span>
                          <strong>{cls.room || "Room 301"}</strong>
                        </div>
                      </div>

                      {/* Scheduled Date & Day */}
                      <div className="student-meta-item day-meta">
                        <span className="meta-label">Scheduled Date &amp; Day</span>
                        <div className="meta-value">
                          <span className="cal-icon">📅</span>
                          <strong title={classDateStr}>{classDateStr}</strong>
                        </div>
                      </div>

                      {/* Time Slot */}
                      <div className="student-meta-item time-meta">
                        <span className="meta-label">Lecture Timing</span>
                        <div className="meta-value">
                          <span className="clock-icon">🕐</span>
                          <strong>{cls.time || "10:00 AM - 11:00 AM"}</strong>
                        </div>
                      </div>

                      {/* Faculty Name (NO Faculty ID per user instruction) */}
                      <div className="student-meta-item faculty-meta">
                        <span className="meta-label">Faculty Instructor</span>
                        <div className="meta-value">
                          <span className="teacher-icon">👨‍🏫</span>
                          <strong>{cls.facultyName || "Faculty Member"}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Action */}
                    <div className="student-class-footer">
                      <span className="student-class-section-pill">
                        Sem {cls.semester || semester} • Sec {cls.section || section}
                      </span>

                      <button
                        type="button"
                        className="student-scan-class-btn"
                        onClick={onMarkAttendance}
                        title={`Scan classroom QR for ${cls.name} (${cls.room})`}
                      >
                        <span>📷 Scan QR</span>
                        <span className="arrow-icon">→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Attendance + Summary */}
        <section className="dashboard-lower">
          {/* Recent Attendance */}
          <div className="attendance-table-card">
            <div className="table-header">
              <div>
                <h2>Recent Attendance Records</h2>
                <p>Live synchronized attendance records from database</p>
              </div>

              <button className="view-all-btn" onClick={onAttendanceHistory}>
                View All ({historyData.history.length})
              </button>
            </div>

            <div className="table-wrapper">
              {isLoading ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#8b93a7" }}>
                  Loading database records...
                </div>
              ) : recentRecords.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "36px", marginBottom: "10px" }}>📋</div>
                  <h3 style={{ margin: "0 0 6px 0", color: "#18213a" }}>No Attendance Marked Yet</h3>
                  <p style={{ margin: 0, color: "#8b93a7", fontSize: "14px" }}>
                    Scan a live classroom QR code to record your first attendance with facial verification.
                  </p>
                  <button
                    onClick={onMarkAttendance}
                    style={{
                      marginTop: "16px",
                      padding: "10px 20px",
                      background: "#7146e8",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Scan Classroom QR
                  </button>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Subject</th>
                      <th>Code</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.map((record, index) => (
                      <tr key={record.id || index}>
                        <td>{record.date}</td>
                        <td>
                          <strong>{record.subject}</strong>
                        </td>
                        <td>
                          <span
                            style={{
                              background: "#f0f2f8",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontWeight: "600",
                              fontSize: "12px",
                              color: "#475569",
                            }}
                          >
                            {record.code || "CS501"}
                          </span>
                        </td>
                        <td>{record.time || "—"}</td>
                        <td>
                          <span
                            className={
                              record.status === "Present"
                                ? "status present"
                                : "status absent"
                            }
                          >
                            {record.status === "Present" ? "✓" : "!"}{" "}
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="summary-card">
            <div className="summary-header">
              <h2>Attendance Summary</h2>
              <span>Active Semester</span>
            </div>

            <div className="attendance-circle">
              <div className="circle-inner">
                <strong>{percentage}%</strong>
                <span>Attendance</span>
              </div>
            </div>

            <div className="summary-details">
              <div>
                <span className="summary-dot present-dot"></span>
                <span>Present</span>
                <strong>{historyData.classesPresent}</strong>
              </div>

              <div>
                <span className="summary-dot absent-dot"></span>
                <span>Absent</span>
                <strong>{historyData.classesAbsent}</strong>
              </div>
            </div>

            <div className="attendance-message">
              <strong>{isEligible ? "Status: Eligible" : "Status: Action Required"}</strong>
              <p>
                {isEligible
                  ? "Your attendance is above the 75% requirement. Keep up the consistent presence!"
                  : "Your attendance is currently below 75%. Please attend upcoming lectures to regain exam eligibility."}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <strong>Acharya Institute of Technology</strong>
        <span>Smart Attendance Management System • 2026</span>
      </footer>
    </div>
  );
}

export default StudentDashboard;