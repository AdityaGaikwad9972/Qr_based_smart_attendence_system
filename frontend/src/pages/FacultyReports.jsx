import { useState, useMemo } from "react";
import "./FacultyReports.css";

function FacultyReports({
  facultyId = "FAC001",
  onBack,
  onLogout,
}) {
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "eligible" | "shortage"

  const subjectsList = [
    { code: "all", name: "All Subjects" },
    { code: "CS501", name: "Database Management Systems", short: "DBMS" },
    { code: "CS502", name: "Computer Networks", short: "CN" },
    { code: "CS503", name: "Web Technology", short: "WT" },
    { code: "CS504", name: "Artificial Intelligence", short: "AI" },
  ];

  // Comprehensive student database across subjects
  const allStudents = useMemo(() => [
    // CS501: Database Management Systems
    { id: "1AY22CS001", name: "Aarav Sharma", code: "CS501", subject: "Database Management Systems", total: 24, attended: 22 },
    { id: "1AY22CS002", name: "Ananya Rao", code: "CS501", subject: "Database Management Systems", total: 24, attended: 23 },
    { id: "1AY22CS003", name: "Rohan Verma", code: "CS501", subject: "Database Management Systems", total: 24, attended: 16 },
    { id: "1AY22CS004", name: "Priya Patel", code: "CS501", subject: "Database Management Systems", total: 24, attended: 24 },
    { id: "1AY22CS005", name: "Aditya Gaikwad", code: "CS501", subject: "Database Management Systems", total: 24, attended: 23 },
    { id: "1AY22CS006", name: "Vikram Malhotra", code: "CS501", subject: "Database Management Systems", total: 24, attended: 17 },
    { id: "1AY22CS007", name: "Sneha Reddy", code: "CS501", subject: "Database Management Systems", total: 24, attended: 21 },
    { id: "1AY22CS008", name: "Tanmay Joshi", code: "CS501", subject: "Database Management Systems", total: 24, attended: 22 },
    { id: "1AY22CS009", name: "Neha Kulkarni", code: "CS501", subject: "Database Management Systems", total: 24, attended: 20 },
    { id: "1AY22CS010", name: "Devendra Saini", code: "CS501", subject: "Database Management Systems", total: 24, attended: 15 },

    // CS502: Computer Networks
    { id: "1AY22CS001", name: "Aarav Sharma", code: "CS502", subject: "Computer Networks", total: 22, attended: 20 },
    { id: "1AY22CS002", name: "Ananya Rao", code: "CS502", subject: "Computer Networks", total: 22, attended: 21 },
    { id: "1AY22CS003", name: "Rohan Verma", code: "CS502", subject: "Computer Networks", total: 22, attended: 15 },
    { id: "1AY22CS004", name: "Priya Patel", code: "CS502", subject: "Computer Networks", total: 22, attended: 22 },
    { id: "1AY22CS005", name: "Aditya Gaikwad", code: "CS502", subject: "Computer Networks", total: 22, attended: 21 },
    { id: "1AY22CS006", name: "Vikram Malhotra", code: "CS502", subject: "Computer Networks", total: 22, attended: 18 },
    { id: "1AY22CS007", name: "Sneha Reddy", code: "CS502", subject: "Computer Networks", total: 22, attended: 19 },
    { id: "1AY22CS008", name: "Tanmay Joshi", code: "CS502", subject: "Computer Networks", total: 22, attended: 20 },
    { id: "1AY22CS009", name: "Neha Kulkarni", code: "CS502", subject: "Computer Networks", total: 22, attended: 18 },
    { id: "1AY22CS010", name: "Devendra Saini", code: "CS502", subject: "Computer Networks", total: 22, attended: 14 },

    // CS503: Web Technology
    { id: "1AY22CS001", name: "Aarav Sharma", code: "CS503", subject: "Web Technology", total: 20, attended: 19 },
    { id: "1AY22CS002", name: "Ananya Rao", code: "CS503", subject: "Web Technology", total: 20, attended: 20 },
    { id: "1AY22CS003", name: "Rohan Verma", code: "CS503", subject: "Web Technology", total: 20, attended: 18 },
    { id: "1AY22CS004", name: "Priya Patel", code: "CS503", subject: "Web Technology", total: 20, attended: 19 },
    { id: "1AY22CS005", name: "Aditya Gaikwad", code: "CS503", subject: "Web Technology", total: 20, attended: 20 },
    { id: "1AY22CS006", name: "Vikram Malhotra", code: "CS503", subject: "Web Technology", total: 20, attended: 14 },
    { id: "1AY22CS007", name: "Sneha Reddy", code: "CS503", subject: "Web Technology", total: 20, attended: 18 },
    { id: "1AY22CS008", name: "Tanmay Joshi", code: "CS503", subject: "Web Technology", total: 20, attended: 19 },
    { id: "1AY22CS009", name: "Neha Kulkarni", code: "CS503", subject: "Web Technology", total: 20, attended: 17 },
    { id: "1AY22CS010", name: "Devendra Saini", code: "CS503", subject: "Web Technology", total: 20, attended: 13 },

    // CS504: Artificial Intelligence
    { id: "1AY22CS001", name: "Aarav Sharma", code: "CS504", subject: "Artificial Intelligence", total: 20, attended: 18 },
    { id: "1AY22CS002", name: "Ananya Rao", code: "CS504", subject: "Artificial Intelligence", total: 20, attended: 19 },
    { id: "1AY22CS003", name: "Rohan Verma", code: "CS504", subject: "Artificial Intelligence", total: 20, attended: 14 },
    { id: "1AY22CS004", name: "Priya Patel", code: "CS504", subject: "Artificial Intelligence", total: 20, attended: 20 },
    { id: "1AY22CS005", name: "Aditya Gaikwad", code: "CS504", subject: "Artificial Intelligence", total: 20, attended: 19 },
    { id: "1AY22CS006", name: "Vikram Malhotra", code: "CS504", subject: "Artificial Intelligence", total: 20, attended: 17 },
    { id: "1AY22CS007", name: "Sneha Reddy", code: "CS504", subject: "Artificial Intelligence", total: 20, attended: 18 },
    { id: "1AY22CS008", name: "Tanmay Joshi", code: "CS504", subject: "Artificial Intelligence", total: 20, attended: 19 },
    { id: "1AY22CS009", name: "Neha Kulkarni", code: "CS504", subject: "Artificial Intelligence", total: 20, attended: 19 },
    { id: "1AY22CS010", name: "Devendra Saini", code: "CS504", subject: "Artificial Intelligence", total: 20, attended: 12 },
  ], []);

  // Compute calculated metrics for each record
  const enrichedStudents = useMemo(() => {
    return allStudents.map((stu) => {
      const absent = stu.total - stu.attended;
      const percentage = Math.round((stu.attended / stu.total) * 100);
      const isEligible = percentage >= 75;
      return {
        ...stu,
        absent,
        percentage,
        isEligible,
      };
    });
  }, [allStudents]);

  // Filter students based on subject tab, search, and eligibility
  const filteredStudents = useMemo(() => {
    return enrichedStudents.filter((stu) => {
      // Subject filter
      const matchSubject =
        selectedSubject === "all" || stu.code === selectedSubject;

      // Search filter (name, id, subject)
      const query = searchTerm.toLowerCase().trim();
      const matchSearch =
        query === "" ||
        stu.name.toLowerCase().includes(query) ||
        stu.id.toLowerCase().includes(query) ||
        stu.code.toLowerCase().includes(query) ||
        stu.subject.toLowerCase().includes(query);

      // Status filter
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "eligible" && stu.isEligible) ||
        (statusFilter === "shortage" && !stu.isEligible);

      return matchSubject && matchSearch && matchStatus;
    });
  }, [enrichedStudents, selectedSubject, searchTerm, statusFilter]);

  // Summary statistics for current filtered view
  const summaryMetrics = useMemo(() => {
    const total = filteredStudents.length;
    if (total === 0) {
      return { total: 0, avgPct: 0, eligibleCount: 0, shortageCount: 0 };
    }
    const sumPct = filteredStudents.reduce((acc, curr) => acc + curr.percentage, 0);
    const avgPct = Math.round(sumPct / total);
    const eligibleCount = filteredStudents.filter((s) => s.isEligible).length;
    const shortageCount = total - eligibleCount;

    return {
      total,
      avgPct,
      eligibleCount,
      shortageCount,
    };
  }, [filteredStudents]);

  // Download complete Excel / CSV report
  const handleDownloadCSV = () => {
    const subjectTitle =
      selectedSubject === "all"
        ? "All Subjects"
        : subjectsList.find((s) => s.code === selectedSubject)?.name || selectedSubject;

    const headers = [
      "Student ID",
      "Student Name",
      "Subject Code",
      "Subject Name",
      "Total Classes",
      "Classes Attended",
      "Classes Absent",
      "Attendance Percentage",
      "Eligibility Status",
    ].join(",");

    const rows = filteredStudents.map((stu) => {
      const statusLabel = stu.isEligible ? "Eligible" : "Attendance Shortage";
      return `"${stu.id}","${stu.name}","${stu.code}","${stu.subject}",${stu.total},${stu.attended},${stu.absent},"${stu.percentage}%","${statusLabel}"`;
    });

    const csvContent =
      `# Acharya Institute of Technology - Smart Attendance Report\n` +
      `# Faculty ID: ${facultyId} | Subject: ${subjectTitle} | Generated: ${new Date().toLocaleDateString("en-IN")}\n` +
      `# Total Students: ${summaryMetrics.total} | Average Attendance: ${summaryMetrics.avgPct}%\n\n` +
      headers +
      "\n" +
      rows.join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    const filename = `Student_Attendance_Report_${selectedSubject}_${Date.now()}.csv`;

    downloadLink.setAttribute("href", url);
    downloadLink.setAttribute("download", filename);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="faculty-reports-page">
      {/* HEADER */}
      <header className="fac-rep-header">
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

      {/* MAIN CONTAINER */}
      <main className="fac-rep-container">
        {/* Back Button */}
        <button
          className="fac-back-button"
          onClick={onBack}
          type="button"
        >
          ← Back to Dashboard
        </button>

        {/* Page Heading & Actions */}
        <section className="fac-rep-heading">
          <div>
            <p className="fac-welcome-label">FACULTY ACADEMIC REPORT</p>
            <h1>Student Attendance Reports</h1>
            <p>
              View, search, and download student-wise attendance records and subject percentages.
            </p>
          </div>

          <div className="fac-rep-actions">
            <button
              className="fac-download-btn"
              onClick={handleDownloadCSV}
              type="button"
              title="Download Excel / CSV file"
            >
              <span>📥</span>
              <span>Download Report (CSV / Excel)</span>
            </button>

            <button
              className="fac-print-btn"
              onClick={handlePrint}
              type="button"
              title="Print or save as PDF"
            >
              <span>🖨️</span>
              <span>Print / PDF</span>
            </button>
          </div>
        </section>

        {/* SUBJECT TABS */}
        <div className="fac-subject-tabs">
          {subjectsList.map((subj) => (
            <button
              key={subj.code}
              type="button"
              className={`fac-subject-tab ${
                selectedSubject === subj.code ? "active" : ""
              }`}
              onClick={() => setSelectedSubject(subj.code)}
            >
              <span>{subj.code === "all" ? "📚" : "📖"}</span>
              <span>{subj.name}</span>
            </button>
          ))}
        </div>

        {/* METRICS SUMMARY CARDS */}
        <section className="fac-rep-summary-grid">
          <div className="fac-rep-metric-card">
            <div className="fac-rep-metric-icon students">👨‍🎓</div>
            <div>
              <span>Total Students</span>
              <strong>{summaryMetrics.total}</strong>
            </div>
          </div>

          <div className="fac-rep-metric-card">
            <div className="fac-rep-metric-icon attendance">%</div>
            <div>
              <span>Average Attendance</span>
              <strong>{summaryMetrics.avgPct}%</strong>
            </div>
          </div>

          <div className="fac-rep-metric-card">
            <div className="fac-rep-metric-icon eligible">✓</div>
            <div>
              <span>Eligible (≥ 75%)</span>
              <strong style={{ color: "#16a34a" }}>
                {summaryMetrics.eligibleCount}
              </strong>
            </div>
          </div>

          <div className="fac-rep-metric-card">
            <div className="fac-rep-metric-icon shortage">⚠️</div>
            <div>
              <span>Attendance Shortage</span>
              <strong style={{ color: "#dc2626" }}>
                {summaryMetrics.shortageCount}
              </strong>
            </div>
          </div>
        </section>

        {/* STUDENT ATTENDANCE REPORT CARD */}
        <div className="fac-rep-card">
          {/* TOOLBAR: SEARCH & STATUS FILTER */}
          <div className="fac-rep-toolbar">
            <div className="fac-rep-toolbar-left">
              <div className="fac-rep-search">
                <span className="fac-rep-search-icon">🔍</span>
                <input
                  type="text"
                  className="fac-rep-search-input"
                  placeholder="Search by Student Name, ID (USN), or Subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="fac-rep-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Attendance Levels</option>
                <option value="eligible">Eligible Only (≥ 75%)</option>
                <option value="shortage">Shortage Only (&lt; 75%)</option>
              </select>
            </div>

            <div className="fac-rep-count-badge">
              Showing {filteredStudents.length} of {allStudents.length} records
            </div>
          </div>

          {/* STUDENT ATTENDANCE TABLE */}
          <div className="fac-rep-table-container">
            <table className="fac-rep-student-table" id="studentAttendanceTable">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Subject & Code</th>
                  <th>Classes Held</th>
                  <th>Attended</th>
                  <th>Absent</th>
                  <th>Attendance %</th>
                  <th>Eligibility</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((stu, index) => {
                  const pillClass =
                    stu.percentage >= 85
                      ? "high"
                      : stu.percentage >= 75
                      ? "medium"
                      : "low";

                  return (
                    <tr key={`${stu.id}-${stu.code}-${index}`}>
                      <td>
                        <strong style={{ color: "#1e293b", fontFamily: "monospace", fontSize: "13px" }}>
                          {stu.id}
                        </strong>
                      </td>

                      <td>
                        <div className="fac-student-cell">
                          <div className="fac-student-avatar">
                            {stu.name.charAt(0)}
                          </div>
                          <div className="fac-student-info">
                            <strong>{stu.name}</strong>
                            <span>Semester 5 • CSE</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div>
                          <strong style={{ fontSize: "13.5px", color: "#1e293b" }}>
                            {stu.subject}
                          </strong>
                          <div style={{ marginTop: "2px" }}>
                            <span className="fac-code-badge">{stu.code}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong>{stu.total}</strong>
                      </td>

                      <td style={{ color: "#15803d", fontWeight: "700" }}>
                        {stu.attended}
                      </td>

                      <td style={{ color: "#dc2626", fontWeight: "700" }}>
                        {stu.absent}
                      </td>

                      <td>
                        <div className="fac-pct-wrap">
                          <div className="fac-mini-progress">
                            <div
                              className={`fac-mini-progress-fill ${pillClass}`}
                              style={{ width: `${stu.percentage}%` }}
                            />
                          </div>
                          <span className={`fac-pct-pill ${pillClass}`}>
                            {stu.percentage}%
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`fac-eligibility-badge ${
                            stu.isEligible ? "eligible" : "shortage"
                          }`}
                        >
                          {stu.isEligible ? "✓ Eligible" : "⚠️ Shortage"}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      style={{
                        textAlign: "center",
                        padding: "45px 20px",
                        color: "#6b7280",
                      }}
                    >
                      <div style={{ fontSize: "28px", marginBottom: "8px" }}>🔍</div>
                      <strong style={{ display: "block", fontSize: "15px", color: "#374151" }}>
                        No student attendance records match your criteria
                      </strong>
                      <span style={{ fontSize: "13px" }}>
                        Try adjusting your search query or subject filters.
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default FacultyReports;
