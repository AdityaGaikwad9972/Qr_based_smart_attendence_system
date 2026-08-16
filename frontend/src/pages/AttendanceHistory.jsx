import "../App.css";

function AttendanceHistory({ onBack }) {
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
    <div className="simple-page">

      <div className="simple-page-card">

        <button
          className="back-button"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>

        <div className="simple-page-header">
          <div className="simple-page-icon">
            ↺
          </div>

          <div>
            <h1>Attendance History</h1>
            <p>View your complete attendance records</p>
          </div>
        </div>

        <div className="history-summary">

          <div>
            <span>Total Classes</span>
            <strong>30</strong>
          </div>

          <div>
            <span>Present</span>
            <strong className="history-present">26</strong>
          </div>

          <div>
            <span>Absent</span>
            <strong className="history-absent">4</strong>
          </div>

          <div>
            <span>Attendance</span>
            <strong>87%</strong>
          </div>

        </div>

        <div className="history-table-wrapper">

          <table className="history-table">

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
                          ? "history-status present"
                          : "history-status absent"
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

        </div>

      </div>

    </div>
  );
}

export default AttendanceHistory;