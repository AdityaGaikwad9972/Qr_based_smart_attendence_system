import React from "react";
import "./StudentDashboard.css";

function StudentDashboard({
  onLogout,
  onMarkAttendance,
  onAttendanceHistory,
  onProfile,
}) {
  const attendanceData = [
    {
      date: "16 Aug 2026",
      subject: "Java Programming",
      time: "10:00 AM",
      status: "Present",
    },
    {
      date: "15 Aug 2026",
      subject: "Database Management",
      time: "11:00 AM",
      status: "Present",
    },
    {
      date: "14 Aug 2026",
      subject: "Artificial Intelligence",
      time: "9:00 AM",
      status: "Absent",
    },
    {
      date: "13 Aug 2026",
      subject: "Computer Networks",
      time: "2:00 PM",
      status: "Present",
    },
    {
      date: "12 Aug 2026",
      subject: "Web Technology",
      time: "10:00 AM",
      status: "Present",
    },
  ];

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

          <div className="student-info">
            <div className="student-avatar">S</div>

            <div>
              <strong>Student</strong>
              <span>Student ID: AIT2026001</span>
            </div>
          </div>

          <button
            className="logout-btn"
            onClick={onLogout}
          >
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
              Hello, <span>Student!</span>
            </h1>

            <p className="welcome-description">
              Here's your attendance overview and recent attendance activity.
            </p>
          </div>

          <div className="college-badge">
            <strong>Acharya Institute of Technology</strong>
            <span>Student Attendance Management System</span>
          </div>

        </section>

        {/* Statistics */}
        <section className="stats-grid">

          <div className="stat-card attendance-card">

            <div className="stat-icon">%</div>

            <div>
              <p>Overall Attendance</p>
              <h2>87%</h2>
              <span className="positive-text">
                Good attendance
              </span>
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon green">✓</div>

            <div>
              <p>Classes Present</p>
              <h2>26</h2>
              <span>Out of 30 classes</span>
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon red">!</div>

            <div>
              <p>Classes Absent</p>
              <h2>4</h2>
              <span>Out of 30 classes</span>
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon orange">↗</div>

            <div>
              <p>Current Streak</p>
              <h2>5</h2>
              <span>Days present</span>
            </div>

          </div>

        </section>

        {/* Action Cards */}
        <section className="action-section">

          <div className="section-heading">
            <h2>Quick Actions</h2>
            <p>Access your attendance features</p>
          </div>

          <div className="action-grid">

            {/* MARK ATTENDANCE */}
            <button
              className="action-card"
              onClick={onMarkAttendance}
            >

              <div className="action-icon qr-icon">
                QR
              </div>

              <div>
                <h3>Mark Attendance</h3>
                <p>Scan the classroom QR code</p>
              </div>

              <span className="action-arrow">→</span>

            </button>


            {/* ATTENDANCE HISTORY */}
            <button
              className="action-card"
              onClick={onAttendanceHistory}
            >

              <div className="action-icon history-icon">
                ↺
              </div>

              <div>
                <h3>Attendance History</h3>
                <p>View your complete attendance</p>
              </div>

              <span className="action-arrow">→</span>

            </button>


            {/* MY PROFILE */}
            <button
              className="action-card"
              onClick={onProfile}
            >

              <div className="action-icon profile-icon">
                👤
              </div>

              <div>
                <h3>My Profile</h3>
                <p>View your student information</p>
              </div>

              <span className="action-arrow">→</span>

            </button>

          </div>

        </section>

        {/* Attendance + Summary */}
        <section className="dashboard-lower">

          {/* Recent Attendance */}
          <div className="attendance-table-card">

            <div className="table-header">

              <div>
                <h2>Recent Attendance</h2>
                <p>Your latest attendance records</p>
              </div>

              <button
                className="view-all-btn"
                onClick={onAttendanceHistory}
              >
                View All
              </button>

            </div>

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subject</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>

                  {attendanceData.map((record, index) => (
                    <tr key={index}>

                      <td>{record.date}</td>

                      <td>
                        <strong>{record.subject}</strong>
                      </td>

                      <td>{record.time}</td>

                      <td>
                        <span
                          className={
                            record.status === "Present"
                              ? "status present"
                              : "status absent"
                          }
                        >
                          {record.status === "Present" ? "✓" : "!"}
                          {" "}
                          {record.status}
                        </span>
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>

          </div>


          {/* Attendance Summary */}
          <div className="summary-card">

            <div className="summary-header">
              <h2>Attendance Summary</h2>
              <span>2026</span>
            </div>

            <div className="attendance-circle">

              <div className="circle-inner">
                <strong>87%</strong>
                <span>Attendance</span>
              </div>

            </div>

            <div className="summary-details">

              <div>
                <span className="summary-dot present-dot"></span>
                <span>Present</span>
                <strong>26</strong>
              </div>

              <div>
                <span className="summary-dot absent-dot"></span>
                <span>Absent</span>
                <strong>4</strong>
              </div>

            </div>

            <div className="attendance-message">
              <strong>You're doing well!</strong>
              <p>
                Maintain your attendance above 75% to stay eligible for exams.
              </p>
            </div>

          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <strong>Acharya Institute of Technology</strong>
        <span>Smart Attendance Management System</span>
      </footer>

    </div>
  );
}

export default StudentDashboard;