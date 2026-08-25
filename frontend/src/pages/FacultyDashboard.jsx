import { useState, useEffect } from "react";
import { facultyAPI, authAPI } from "../services/api";
import "./FacultyDashboard.css";

function FacultyDashboard({
  currentUser,
  facultyId = "FAC001",
  onLogout,
  onStartAttendance,
  onViewReports,
}) {
  const [profile, setProfile] = useState(() => {
    if (currentUser) return currentUser;
    try {
      return JSON.parse(localStorage.getItem("currentUser")) || null;
    } catch {
      return null;
    }
  });

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const activeFacultyId = profile?.identifier || facultyId || "FAC001";
  const facultyName = profile?.name || (activeFacultyId === "FAC001" ? "Dr. Ramesh Sharma" : "Faculty Member");
  const department = profile?.department || "Computer Science & Engineering";

  const defaultClasses = [
    {
      id: "cls-7m1",
      code: "CS701",
      icon: "ML",
      name: "Machine Learning",
      facultyId: activeFacultyId,
      facultyName: facultyName,
      day: "Monday",
      time: "09:00 AM - 10:00 AM",
      room: "Room 301",
      semester: "7",
      section: "A",
      students: 45,
    },
    {
      id: "cls-7m4",
      code: "CS704",
      icon: "AI",
      name: "AI & ML",
      facultyId: activeFacultyId,
      facultyName: facultyName,
      day: "Monday",
      time: "12:15 PM - 01:15 PM",
      room: "Room 301",
      semester: "7",
      section: "A",
      students: 45,
    },
    {
      id: "cls-7w5",
      code: "CS707",
      icon: "PW",
      name: "Project Work",
      facultyId: activeFacultyId,
      facultyName: facultyName,
      day: "Wednesday",
      time: "02:00 PM - 04:00 PM",
      room: "Room 301",
      semester: "7",
      section: "A",
      students: 45,
    },
  ];

  const [classes, setClasses] = useState([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState("ALL");

  // Load real assigned classes from backend or clean master schedule
  const loadAssignedClasses = () => {
    setIsLoadingClasses(true);
    facultyAPI
      .getClasses(activeFacultyId)
      .then((data) => {
        let cleanList = Array.isArray(data) ? data : [];
        if (
          cleanList.length === 0 &&
          facultyName &&
          facultyName !== "Faculty Member" &&
          facultyName !== "Faculty"
        ) {
          return facultyAPI.getClasses(facultyName);
        }
        return cleanList;
      })
      .then((finalList) => {
        let list = Array.isArray(finalList) ? finalList : [];

        // Strict conflict prevention: Ensure no two classes on the same day share the same time slot
        const seenSlots = new Set();
        const nonConflicting = [];
        for (const cls of list) {
          const dayKey = (cls.day || "").trim().toLowerCase();
          const timeKey = (cls.time || cls.time_slot || "").trim().toLowerCase();
          const slotKey = `${dayKey}___${timeKey}`;

          if (!seenSlots.has(slotKey)) {
            seenSlots.add(slotKey);
            nonConflicting.push(cls);
          } else {
            console.warn(
              "[Faculty Dashboard] Overlapping time slot prevented:",
              cls.day,
              cls.time,
              cls.code,
              cls.name
            );
          }
        }

        setClasses(nonConflicting);
        setIsLoadingClasses(false);
      })
      .catch((err) => {
        console.warn("Could not fetch assigned classes:", err.message);
        setClasses([]);
        setIsLoadingClasses(false);
      });
  };

  useEffect(() => {
    let isMounted = true;

    // Clear any obsolete conflicting timetable cache in localStorage to ensure live conflict-free sync
    try {
      const savedTT = localStorage.getItem("institution_timetable");
      if (savedTT) {
        const parsed = JSON.parse(savedTT);
        const hasClash = parsed.some(
          (c1, idx) =>
            parsed.some(
              (c2, idx2) =>
                idx < idx2 &&
                (c1.facultyId || "").toLowerCase() === (c2.facultyId || "").toLowerCase() &&
                (c1.day || "").toLowerCase() === (c2.day || "").toLowerCase() &&
                (c1.time || "").toLowerCase() === (c2.time || "").toLowerCase()
            )
        );
        const sem5Entries = parsed.filter((t) => String(t.semester) === "5");
        const sem5UniqueFac = new Set(sem5Entries.map((t) => (t.facultyId || "").toLowerCase()));
        const isSem5Mono = sem5Entries.length > 5 && sem5UniqueFac.size <= 1;

        if (hasClash || isSem5Mono) {
          console.log("[Faculty] Stale conflicting timetable detected in localStorage. Clearing cache.");
          localStorage.removeItem("institution_timetable");
        }
      }
    } catch {}

    loadAssignedClasses();

    // Also fetch faculty profile if not present
    if (!profile?.name || profile.name === "Faculty") {
      authAPI
        .getProfile(activeFacultyId)
        .then((userProf) => {
          if (isMounted && userProf) {
            setProfile(userProf);
          }
        })
        .catch(() => {});
    }

    const handleUpdate = () => {
      loadAssignedClasses();
    };

    window.addEventListener("timetable_updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("timetable_updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, [activeFacultyId, profile?.name]);

  const todayDayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const [selectedDay, setSelectedDay] = useState("ALL");

  const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Helper to compute calendar date for a given weekday (rolls to next week if day has already passed)
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
      });
    }

    return targetDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handlePrevDay = () => {
    if (selectedDay === "ALL") {
      setSelectedDay(todayDayName);
      return;
    }
    const currentIdx = WEEK_DAYS.indexOf(selectedDay);
    if (currentIdx <= 0) {
      setSelectedDay(WEEK_DAYS[WEEK_DAYS.length - 1]);
    } else {
      setSelectedDay(WEEK_DAYS[currentIdx - 1]);
    }
  };

  const handleNextDay = () => {
    if (selectedDay === "ALL") {
      setSelectedDay(todayDayName);
      return;
    }
    const currentIdx = WEEK_DAYS.indexOf(selectedDay);
    if (currentIdx === -1 || currentIdx >= WEEK_DAYS.length - 1) {
      setSelectedDay(WEEK_DAYS[0]);
    } else {
      setSelectedDay(WEEK_DAYS[currentIdx + 1]);
    }
  };

  // Available semesters for this faculty
  const availableSemesters = Array.from(
    new Set(classes.map((c) => String(c.semester || "7")).filter(Boolean))
  ).sort();

  // Filter classes by selected day and semester
  const filteredClasses = classes.filter((cls) => {
    const matchDay = selectedDay === "ALL" || (cls.day && cls.day.toLowerCase() === selectedDay.toLowerCase());
    const matchSem = selectedSemesterFilter === "ALL" || String(cls.semester) === String(selectedSemesterFilter);
    return matchDay && matchSem;
  });

  // Dynamic calculations for stat cards
  const totalStudentsEnrolled = classes.reduce((sum, c) => sum + (c.students || 0), 0);

  // Recent attendance records filtered to this faculty's subjects
  const mySubjectNames = classes.map((c) => c.name);
  const allRecentSessions = [
    { subject: "Database Management Systems", date: "Today", time: "10:00 AM", present: 42, absent: 3, status: "Completed" },
    { subject: "Computer Networks", date: "Yesterday", time: "11:15 AM", present: 39, absent: 3, status: "Completed" },
    { subject: "Software Engineering", date: "15 Aug 2026", time: "02:45 PM", present: 44, absent: 2, status: "Completed" },
    { subject: "Web Technology", date: "14 Aug 2026", time: "09:00 AM", present: 46, absent: 2, status: "Completed" },
    { subject: "Artificial Intelligence", date: "13 Aug 2026", time: "10:15 AM", present: 38, absent: 2, status: "Completed" },
  ];

  const recentSessions = allRecentSessions.filter(
    (s) => mySubjectNames.length === 0 || mySubjectNames.includes(s.subject)
  );

  return (
    <div className="faculty-dashboard-page">
      {/* =========================
          NAVIGATION BAR
      ========================== */}
      <header className="fac-dashboard-header">
        <div className="fac-brand">
          <div className="fac-brand-logo">SA</div>
          <div>
            <h2>Smart Attendance</h2>
            <span>Faculty Portal</span>
          </div>
        </div>

        <div className="fac-faculty-profile">
          <div className="fac-profile-avatar">
            {facultyName.charAt(0).toUpperCase()}
          </div>
          <div className="fac-profile-info">
            <strong>{facultyName}</strong>
            <span>Faculty ID: {activeFacultyId} • {department}</span>
          </div>

          <div className="fac-header-actions">
            {onViewReports && (
              <button
                className="fac-report-nav-btn"
                onClick={onViewReports}
                type="button"
              >
                📊 Reports
              </button>
            )}

            <button
              className="fac-logout-button"
              onClick={onLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* =========================
          MAIN DASHBOARD CONTAINER
      ========================== */}
      <main className="fac-dashboard-container">
        {/* Welcome Section */}
        <section className="fac-welcome-section">
          <div>
            <p className="fac-welcome-label">FACULTY DASHBOARD</p>
            <h1>Welcome back, {facultyName}!</h1>
            <p>
              Department of {department} • Scheduled lectures and live classroom attendance sessions.
            </p>
          </div>

          <div className="fac-date-card">
            <span>Current Date</span>
            <strong>{todayFormatted}</strong>
          </div>
        </section>

        {/* =========================
            STATISTICS
        ========================== */}
        <section className="fac-stats-grid">
          <div className="fac-stat-card">
            <div className="fac-stat-icon classes">📚</div>
            <div>
              <span>My Total Classes</span>
              <h2>{classes.length}</h2>
            </div>
          </div>

          <div className="fac-stat-card">
            <div className="fac-stat-icon sessions">👥</div>
            <div>
              <span>Total Students Enrolled</span>
              <h2>{totalStudentsEnrolled}</h2>
            </div>
          </div>

          <div className="fac-stat-card">
            <div className="fac-stat-icon students">👨‍🏫</div>
            <div>
              <span>Active Department</span>
              <h2 style={{ fontSize: "16px", marginTop: "4px" }}>CSE</h2>
            </div>
          </div>

          <div className="fac-stat-card">
            <div className="fac-stat-icon average">%</div>
            <div>
              <span>Average Attendance</span>
              <h2>89.4%</h2>
            </div>
          </div>
        </section>

        {/* =========================
            MY SCHEDULED CLASSES (DAY-BY-DAY WITH DATES)
        ========================== */}
        <section className="fac-classes-section">
          <div className="fac-section-heading">
            <div>
              <h2>Daily Teaching Schedule (Faculty ID: {activeFacultyId})</h2>
              <p>Select a date or choose the next day to view your specific lectures and launch QR attendance.</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={loadAssignedClasses}
                disabled={isLoadingClasses}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "12.5px",
                  fontWeight: "600",
                  color: "#475569",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span>🔄</span>
                <span>{isLoadingClasses ? "Refreshing..." : "Refresh"}</span>
              </button>
              <span className="fac-class-count">
                {selectedDay === "ALL"
                  ? `${classes.length} Total Weekly Classes`
                  : `${filteredClasses.length} Lecture${filteredClasses.length === 1 ? "" : "s"} on ${selectedDay}`}
              </span>
            </div>
          </div>

          {/* DAY & DATE NAVIGATION CONTROLS */}
          <div className="fac-day-nav-container">
            <div className="fac-day-nav-header">
              <button
                type="button"
                className="fac-nav-arrow-btn"
                onClick={handlePrevDay}
                title="View Previous Day"
              >
                ◀ Previous Day
              </button>

              <div className="fac-day-banner">
                <span className="fac-banner-icon">📅</span>
                <div className="fac-banner-text">
                  <strong>
                    {selectedDay === "ALL"
                      ? "All Days (Weekly Schedule Overview)"
                      : `${getWeekdayDate(selectedDay, true)} ${
                          selectedDay.toLowerCase() === todayDayName.toLowerCase() ? "• TODAY" : ""
                        }`}
                  </strong>
                  <span>
                    {selectedDay === "ALL"
                      ? `Viewing all ${classes.length} mapped lectures across Monday–Saturday`
                      : `${filteredClasses.length} class${
                          filteredClasses.length === 1 ? "" : "es"
                        } scheduled for this day`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="fac-nav-arrow-btn next"
                onClick={handleNextDay}
                title="View Next Day"
              >
                Next Day ▶
              </button>
            </div>

            {/* DAY PILLS SELECTOR */}
            <div className="fac-day-pills">
              {/* Today Quick Jump */}
              <button
                type="button"
                className={`fac-day-pill today-pill ${
                  selectedDay.toLowerCase() === todayDayName.toLowerCase() ? "active" : ""
                }`}
                onClick={() => setSelectedDay(todayDayName)}
              >
                <span>⚡ Today ({getWeekdayDate(todayDayName)})</span>
              </button>

              {WEEK_DAYS.map((day) => {
                const isActive = selectedDay === day;
                const isToday = day.toLowerCase() === todayDayName.toLowerCase();
                const dayDateStr = getWeekdayDate(day);
                const classCountForDay = classes.filter(
                  (c) => c.day && c.day.toLowerCase() === day.toLowerCase()
                ).length;

                return (
                  <button
                    key={day}
                    type="button"
                    className={`fac-day-pill ${isActive ? "active" : ""} ${
                      isToday ? "is-today" : ""
                    }`}
                    onClick={() => setSelectedDay(day)}
                  >
                    <span>{day}</span>
                    <span className="pill-date">({dayDateStr})</span>
                    {classCountForDay > 0 && (
                      <span className="pill-badge">{classCountForDay}</span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                className={`fac-day-pill all-pill ${selectedDay === "ALL" ? "active" : ""}`}
                onClick={() => setSelectedDay("ALL")}
              >
                <span>All Days ({classes.length})</span>
              </button>
            </div>

            {/* SEMESTER FILTER PILLS (IF MULTI-SEMESTER CLASSES EXIST) */}
            {availableSemesters.length > 0 && (
              <div style={{ display: "flex", gap: "8px", marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #edf2f7", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Filter by Semester:</span>
                <button
                  type="button"
                  onClick={() => setSelectedSemesterFilter("ALL")}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "6px",
                    border: selectedSemesterFilter === "ALL" ? "1.5px solid #4f46e5" : "1px solid #cbd5e1",
                    background: selectedSemesterFilter === "ALL" ? "#4f46e5" : "#ffffff",
                    color: selectedSemesterFilter === "ALL" ? "#ffffff" : "#475569",
                    fontWeight: "700",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  All Allocated Semesters ({classes.length})
                </button>
                {availableSemesters.map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setSelectedSemesterFilter(sem)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "6px",
                      border: selectedSemesterFilter === sem ? "1.5px solid #4f46e5" : "1px solid #cbd5e1",
                      background: selectedSemesterFilter === sem ? "#4f46e5" : "#ffffff",
                      color: selectedSemesterFilter === sem ? "#ffffff" : "#475569",
                      fontWeight: "700",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Semester {sem} ({classes.filter((c) => String(c.semester) === String(sem)).length})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CLASS CARDS LIST */}
          {filteredClasses.length > 0 ? (
            filteredClasses.map((cls) => {
              const isToday = cls.day && cls.day.toLowerCase() === todayDayName.toLowerCase();
              const fullDateStr = getWeekdayDate(cls.day, true);

              return (
                <div key={cls.id || cls.code} className={`fac-class-card ${isToday ? "is-today" : ""}`}>
                  <div className="fac-class-main">
                    <div className="fac-subject-icon">{cls.icon || cls.code?.slice(0, 2) || "CL"}</div>
                    <div className="fac-class-details">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                        <h3 style={{ margin: 0 }}>{cls.name}</h3>
                        <span
                          style={{
                            background: "#e0e7ff",
                            color: "#3730a3",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "700",
                            fontFamily: "monospace",
                          }}
                        >
                          {cls.code}
                        </span>
                        <span
                          style={{
                            background: String(cls.semester) === "7" ? "#e0e7ff" : "#dcfce7",
                            color: String(cls.semester) === "7" ? "#3730a3" : "#166534",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "800",
                          }}
                        >
                          Sem {cls.semester} {cls.section ? `• Sec ${cls.section}` : ""}
                        </span>
                        {isToday && (
                          <span
                            style={{
                              background: "#fdf2f8",
                              color: "#db2777",
                              border: "1px solid #fbcfe8",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: "800",
                            }}
                          >
                            ⚡ TODAY
                          </span>
                        )}
                      </div>

                      <div className="fac-class-meta">
                        <span>📅 <strong>{fullDateStr}</strong></span>
                        <span>🕐 <strong>{cls.time}</strong></span>
                        <span>📍 Classroom: <strong style={{ color: "#2563eb" }}>{cls.room}</strong></span>
                        <span>👥 {cls.students} Students</span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="fac-start-button"
                    onClick={() => {
                      if (typeof onStartAttendance === "function") {
                        onStartAttendance(cls);
                      }
                    }}
                    type="button"
                  >
                    <span>▶ Start Attendance</span>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="fac-empty-day-card">
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>📅</div>
              <h3>No Lectures Scheduled on {selectedDay === "ALL" ? "Selected Days" : `${getWeekdayDate(selectedDay, true)}`}</h3>
              <p>
                You do not have any classes assigned for {selectedDay}. You can choose another day above or view the next scheduled day.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedDay(todayDayName)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#4f46e5",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  ⚡ View Today ({getWeekdayDate(todayDayName)})
                </button>
                <button
                  type="button"
                  onClick={handleNextDay}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#334155",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Next Day ▶
                </button>
              </div>
            </div>
          )}
        </section>

        {/* =========================
            RECENT ATTENDANCE SESSIONS
        ========================== */}
        <section className="fac-recent-section">
          <div className="fac-section-heading">
            <div>
              <h2>My Recent Attendance Sessions</h2>
              <p>Recently completed attendance sessions for your subjects.</p>
            </div>

            {onViewReports && (
              <button
                className="fac-view-report"
                onClick={onViewReports}
                type="button"
              >
                View All Reports →
              </button>
            )}
          </div>

          <div className="fac-recent-table-container">
            <table className="fac-recent-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Attendance %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session, idx) => {
                  const total = session.present + session.absent;
                  const percentage = Math.round((session.present / total) * 100);
                  return (
                    <tr key={idx}>
                      <td>
                        <strong>{session.subject}</strong>
                      </td>
                      <td>{session.date}</td>
                      <td>{session.time}</td>
                      <td style={{ color: "#15803d", fontWeight: "600" }}>
                        {session.present}
                      </td>
                      <td style={{ color: "#dc2626", fontWeight: "600" }}>
                        {session.absent}
                      </td>
                      <td>
                        <strong style={{ color: percentage >= 85 ? "#15803d" : "#ea580c" }}>
                          {percentage}%
                        </strong>
                      </td>
                      <td>
                        <span className="fac-status completed">
                          ✓ {session.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {recentSessions.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "30px 20px", color: "#64748b" }}>
                      No recent session history recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default FacultyDashboard;
