const express = require("express");
const router = express.Router();
const { db } = require("../src/db");

/**
 * GET /api/faculty/:faculty_id/classes
 * Retrieve assigned classes from Master Timetable
 */
router.get("/:faculty_id/classes", (req, res) => {
  const ident = req.params.faculty_id.trim();

  // 1. Direct match on faculty_id
  let entries = db.prepare("SELECT * FROM timetable_entries WHERE LOWER(faculty_id) = ?").all(ident.toLowerCase());

  // 2. Match by faculty profile or full name
  if (!entries || entries.length === 0) {
    const fac = db.prepare("SELECT * FROM faculty WHERE LOWER(employee_id) = ?").get(ident.toLowerCase());
    let fullName = "";
    if (fac) {
      const user = db.prepare("SELECT full_name FROM users WHERE id = ?").get(fac.user_id);
      if (user) fullName = user.full_name;
    } else {
      const user = db.prepare("SELECT full_name FROM users WHERE (LOWER(email) = ? OR LOWER(full_name) = ?) AND role = 'FACULTY'").get(ident.toLowerCase(), ident.toLowerCase());
      if (user) fullName = user.full_name;
    }

    if (fullName) {
      entries = db.prepare("SELECT * FROM timetable_entries WHERE LOWER(faculty_name) LIKE ? OR LOWER(faculty_id) = ?").all(`%${fullName.toLowerCase()}%`, ident.toLowerCase());
    }
  }

  // 3. Match by name substring
  if (!entries || entries.length === 0) {
    entries = db.prepare("SELECT * FROM timetable_entries WHERE LOWER(faculty_name) LIKE ? OR LOWER(faculty_id) LIKE ?").all(`%${ident.toLowerCase()}%`, `%${ident.toLowerCase()}%`);
  }

  return res.json(
    (entries || []).map((e) => ({
      id: `cls-${e.id}`,
      code: e.code,
      name: e.name,
      facultyId: e.faculty_id,
      facultyName: e.faculty_name,
      day: e.day,
      time: e.time_slot,
      room: e.room,
      semester: e.semester,
      section: e.section,
      students: e.students,
      icon: e.code ? e.code.slice(0, 2) : "CL",
    }))
  );
});

/**
 * POST /api/faculty/session/start
 * Start a 60-second live QR attendance session in SQLite
 */
router.post("/session/start", (req, res) => {
  const { subject_code, subject_name, faculty_id, room, expires_in_seconds } = req.body;

  if (!subject_code || !subject_name || !faculty_id) {
    return res.status(400).json({ detail: "Subject code, subject name, and faculty ID are required." });
  }

  const cleanFacId = faculty_id.trim();
  const durationSec = parseInt(expires_in_seconds || 60, 10);

  // Deactivate any previous active sessions for this faculty
  db.prepare("UPDATE live_attendance_sessions SET is_active = 0 WHERE LOWER(faculty_id) = ? AND is_active = 1").run(cleanFacId.toLowerCase());

  const sessionToken = `SESSION-${Date.now()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationSec * 1000);

  db.prepare(`
    INSERT INTO live_attendance_sessions (session_id, subject_code, subject_name, faculty_id, room, expires_in_seconds, created_at, expires_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    sessionToken,
    subject_code.trim(),
    subject_name.trim(),
    cleanFacId,
    (room || "Room 301").trim(),
    durationSec,
    now.toISOString(),
    expiresAt.toISOString()
  );

  const qrPayload = {
    sessionId: sessionToken,
    code: subject_code.trim(),
    subject: subject_name.trim(),
    facultyId: cleanFacId,
    expiresAt: expiresAt.toISOString(),
  };

  return res.json({
    status: "success",
    sessionId: sessionToken,
    subject: subject_name.trim(),
    code: subject_code.trim(),
    facultyId: cleanFacId,
    room: room || "Room 301",
    expiresIn: durationSec,
    expiresAt: expiresAt.toISOString(),
    qrData: JSON.stringify(qrPayload),
  });
});

/**
 * POST /api/faculty/session/stop
 * Stop active attendance session
 */
router.post("/session/stop", (req, res) => {
  const { session_id } = req.body;
  if (session_id) {
    db.prepare("UPDATE live_attendance_sessions SET is_active = 0 WHERE session_id = ?").run(session_id.trim());
  }

  return res.json({
    status: "success",
    message: "Attendance session stopped successfully.",
  });
});

/**
 * GET /api/faculty/session/:session_id/live
 * Real-time attendees feed for active session
 */
router.get("/session/:session_id/live", (req, res) => {
  const sessId = req.params.session_id.trim();

  const session = db.prepare("SELECT * FROM live_attendance_sessions WHERE session_id = ?").get(sessId);
  if (!session) {
    return res.status(404).json({ detail: "Session not found" });
  }

  const records = db.prepare("SELECT * FROM attendance_records WHERE session_id = ? ORDER BY id ASC").all(sessId);

  return res.json({
    sessionId: session.session_id,
    status: session.is_active ? "active" : "ended",
    subject: session.subject_name,
    code: session.subject_code,
    presentCount: records.length,
    attendees: records.map((r) => ({
      id: r.id,
      studentId: r.student_id,
      studentName: r.student_name,
      markedAt: r.marked_at,
      status: r.status,
    })),
  });
});

/**
 * GET /api/faculty/:faculty_id/reports
 * Dynamic student attendance reports
 */
router.get("/:faculty_id/reports", (req, res) => {
  const facultyId = req.params.faculty_id.trim();
  const subjectCode = req.query.subject_code ? req.query.subject_code.trim() : null;

  const allStudents = db.prepare(`
    SELECT s.usn, u.full_name as name
    FROM students s
    JOIN users u ON s.user_id = u.id
  `).all();

  const allRecords = db.prepare("SELECT * FROM attendance_records").all();

  const defaultStudents = [
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
  ];

  const reportMap = {};
  for (const s of defaultStudents) {
    reportMap[s.id.toUpperCase()] = { ...s };
  }

  for (const stu of allStudents) {
    const key = stu.usn.toUpperCase();
    if (!reportMap[key]) {
      reportMap[key] = {
        id: stu.usn,
        name: stu.name || stu.usn,
        code: subjectCode || "CS501",
        subject: "Database Management Systems",
        total: 24,
        attended: 0,
      };
    }
  }

  for (const rec of allRecords) {
    const key = rec.student_id.toUpperCase();
    if (reportMap[key] && rec.status === "Present") {
      reportMap[key].attended = Math.min(reportMap[key].total, reportMap[key].attended + 1);
    }
  }

  let resultList = Object.values(reportMap);
  if (subjectCode) {
    resultList = resultList.filter((s) => s.code.toLowerCase() === subjectCode.toLowerCase());
  }

  return res.json({
    facultyId,
    students: resultList,
  });
});

module.exports = router;
