const express = require("express");
const router = express.Router();
const { db, resetTimetableToDefault } = require("../src/db");

/**
 * GET /api/admin/timetable
 * Retrieve master timetable entries
 */
router.get("/timetable", (req, res) => {
  const entries = db.prepare("SELECT * FROM timetable_entries ORDER BY id ASC").all();
  return res.json(
    entries.map((e) => ({
      id: `cls-${e.id}`,
      code: e.code,
      name: e.name,
      facultyId: e.faculty_id,
      facultyName: e.faculty_name,
      day: e.day,
      time: e.time_slot,
      room: e.room,
      semester: String(e.semester || "5"),
      section: e.section || "A",
      students: e.students || 45,
    }))
  );
});

/**
 * POST /api/admin/timetable/reset
 * Restore canonical conflict-free 50-slot institutional timetable
 */
router.post("/timetable/reset", (req, res) => {
  try {
    resetTimetableToDefault();
    const entries = db.prepare("SELECT * FROM timetable_entries ORDER BY id ASC").all();
    return res.json({
      message: "Successfully reset to canonical conflict-free master timetable",
      total: entries.length,
      timetable: entries.map((e) => ({
        id: `cls-${e.id}`,
        code: e.code,
        name: e.name,
        facultyId: e.faculty_id,
        facultyName: e.faculty_name,
        day: e.day,
        time: e.time_slot,
        room: e.room,
        semester: String(e.semester || "5"),
        section: e.section || "A",
        students: e.students || 45,
      })),
    });
  } catch (err) {
    console.error("[Admin] Timetable reset error:", err);
    return res.status(500).json({ detail: `Failed to reset timetable: ${err.message}` });
  }
});

/**
 * POST /api/admin/timetable
 * Bulk Upload or Update Master Timetable
 */
router.post("/timetable", (req, res) => {
  const entries = Array.isArray(req.body) ? req.body : req.body.entries;
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ detail: "Empty timetable payload." });
  }

  try {
    db.prepare("DELETE FROM timetable_entries").run();

    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO timetable_entries (code, name, faculty_id, faculty_name, day, time_slot, room, semester, section, students, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    for (const item of entries) {
      const code = (item.code || "CS501").trim();
      const name = (item.name || "Lecture").trim();
      const day = (item.day || "Monday").trim();

      if (
        code.toLowerCase() === "time" ||
        ["break", "lunch", "recess", "tea", "interval", "-"].includes(name.toLowerCase()) ||
        ["break", "lunch"].includes(day.toLowerCase())
      ) {
        continue;
      }

      insertStmt.run(
        code,
        name,
        (item.facultyId || item.faculty_id || "FAC001").trim(),
        (item.facultyName || item.faculty_name || "Faculty").trim(),
        day,
        (item.time || item.time_slot || "10:00 AM - 11:00 AM").trim(),
        (item.room || "Room 301").trim(),
        String(item.semester || "5").trim(),
        (item.section || "A").trim(),
        parseInt(item.students || 45, 10),
        now
      );
      count++;
    }

    return res.json({
      message: `Successfully mapped ${count} timetable classes`,
      total: count,
    });
  } catch (err) {
    console.error("[Admin] Timetable upload error:", err);
    return res.status(500).json({ detail: `Failed to upload timetable: ${err.message}` });
  }
});

/**
 * GET /api/admin/students
 * Retrieve all registered students
 */
router.get("/students", (req, res) => {
  const students = db.prepare(`
    SELECT s.id, s.usn, u.full_name as name, u.email, s.department, s.semester, s.section
    FROM students s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.id ASC
  `).all();

  return res.json({
    students: students.map((s) => ({
      id: s.id,
      usn: s.usn,
      name: s.name,
      email: s.email,
      department: s.department,
      semester: s.semester,
      section: s.section,
    })),
  });
});

/**
 * GET /api/admin/faculty
 * Retrieve all registered faculty
 */
router.get("/faculty", (req, res) => {
  const faculty = db.prepare(`
    SELECT f.id, f.employee_id, u.full_name as name, u.email, f.department
    FROM faculty f
    JOIN users u ON f.user_id = u.id
    ORDER BY f.id ASC
  `).all();

  return res.json({
    faculty: faculty.map((f) => ({
      id: f.id,
      employeeId: f.employee_id,
      name: f.name,
      email: f.email,
      department: f.department,
    })),
  });
});

/**
 * GET /api/admin/stats
 * Institutional Attendance & User Statistics
 */
router.get("/stats", (req, res) => {
  const totalStudents = db.prepare("SELECT COUNT(*) as c FROM students").get()?.c || 0;
  const totalFaculty = db.prepare("SELECT COUNT(*) as c FROM faculty").get()?.c || 0;
  const activeSessions = db.prepare("SELECT COUNT(*) as c FROM live_attendance_sessions WHERE is_active = 1").get()?.c || 0;
  const totalRecords = db.prepare("SELECT COUNT(*) as c FROM attendance_records").get()?.c || 0;
  const totalSlots = db.prepare("SELECT COUNT(*) as c FROM timetable_entries").get()?.c || 0;

  const presentCount = db.prepare("SELECT COUNT(*) as c FROM attendance_records WHERE status = 'Present'").get()?.c || 0;
  const avgAtt = totalRecords > 0 ? `${((presentCount / totalRecords) * 100).toFixed(1)}%` : "100%";

  return res.json({
    totalStudents,
    totalFaculty,
    activeSessions,
    campusAvgAttendance: avgAtt,
    totalAttendanceMarked: totalRecords,
    totalClassSlots: totalSlots,
  });
});

/**
 * DELETE /api/admin/students/:identifier
 * Delete student and their attendance records
 */
router.delete("/students/:identifier", (req, res) => {
  const ident = req.params.identifier.trim();

  let student = null;
  if (!isNaN(ident)) {
    student = db.prepare("SELECT * FROM students WHERE id = ?").get(parseInt(ident, 10));
  }
  if (!student) {
    student = db.prepare("SELECT * FROM students WHERE LOWER(usn) = ?").get(ident.toLowerCase());
  }
  if (!student) {
    const user = db.prepare("SELECT id FROM users WHERE LOWER(email) = ? AND role = 'STUDENT'").get(ident.toLowerCase());
    if (user) student = db.prepare("SELECT * FROM students WHERE user_id = ?").get(user.id);
  }

  if (!student) {
    return res.status(404).json({ detail: `Student '${ident}' not found in database.` });
  }

  const usnVal = student.usn;
  const userId = student.user_id;

  db.prepare("DELETE FROM attendance_records WHERE LOWER(student_id) = ?").run(usnVal.toLowerCase());
  db.prepare("DELETE FROM students WHERE id = ?").run(student.id);
  if (userId) {
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  }

  return res.json({
    message: `Successfully deleted student ${usnVal} from the database.`,
    deletedId: usnVal,
  });
});

/**
 * DELETE /api/admin/faculty/:identifier
 * Delete faculty and related active sessions
 */
router.delete("/faculty/:identifier", (req, res) => {
  const ident = req.params.identifier.trim();

  let fac = null;
  if (!isNaN(ident)) {
    fac = db.prepare("SELECT * FROM faculty WHERE id = ?").get(parseInt(ident, 10));
  }
  if (!fac) {
    fac = db.prepare("SELECT * FROM faculty WHERE LOWER(employee_id) = ?").get(ident.toLowerCase());
  }
  if (!fac) {
    const user = db.prepare("SELECT id FROM users WHERE LOWER(email) = ? AND role = 'FACULTY'").get(ident.toLowerCase());
    if (user) fac = db.prepare("SELECT * FROM faculty WHERE user_id = ?").get(user.id);
  }

  if (!fac) {
    return res.status(404).json({ detail: `Faculty '${ident}' not found in database.` });
  }

  const empId = fac.employee_id;
  const userId = fac.user_id;

  db.prepare("DELETE FROM live_attendance_sessions WHERE LOWER(faculty_id) = ?").run(empId.toLowerCase());
  db.prepare("DELETE FROM faculty WHERE id = ?").run(fac.id);
  if (userId) {
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  }

  return res.json({
    message: `Successfully deleted faculty ${empId} from the database.`,
    deletedId: empId,
  });
});

module.exports = router;
