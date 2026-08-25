const express = require("express");
const router = express.Router();
const { db } = require("../src/db");
const { verifyFaces } = require("../src/ml_verifier");

/**
 * POST /api/attendance/verify-face
 * Deep Neural Network Biometric Face Verification (YuNet + SFace ONNX)
 */
router.post("/verify-face", async (req, res) => {
  const { student_id, id, identifier, selfie_image, live_selfie, burst_frames, burst_images, liveness_challenge, liveness_data } = req.body;
  const targetId = (student_id || id || identifier || "").trim();
  const selfieImg = selfie_image || live_selfie;
  const bursts = burst_frames || burst_images || [];
  const challenge = liveness_challenge || liveness_data || null;

  if (!targetId) {
    return res.status(400).json({ detail: "student_id is required." });
  }

  if (!selfieImg) {
    return res.status(400).json({ detail: "selfie_image is required." });
  }

  // Look up student registered face
  const stu = db.prepare("SELECT * FROM students WHERE LOWER(usn) = ?").get(targetId.toLowerCase());
  if (!stu) {
    return res.status(404).json({ detail: `Student ${targetId} not found in database.` });
  }

  if (!stu.face_image) {
    return res.json({
      verified: false,
      is_live: false,
      match_score: 0.0,
      match_percentage: 0.0,
      status: "no_registered_face",
      message: "No registered photo found in database. Please click below to enroll this selfie as your master photo.",
      registered_face_image: null,
    });
  }

  try {
    // Look up stored face embeddings for multi-image matching
    let storedEmbeddings = [];
    try {
      const embRows = db.prepare("SELECT embedding FROM face_embeddings WHERE student_id = ? AND embedding IS NOT NULL").all(stu.id);
      if (embRows && embRows.length > 0) {
        storedEmbeddings = embRows.map((row) => row.embedding);
        console.log(`[Attendance] Found ${storedEmbeddings.length} stored embeddings for ${stu.usn}`);
      }
    } catch (embErr) {
      console.warn("[Attendance] Embedding lookup notice:", embErr.message);
    }

    const result = await verifyFaces(stu.face_image, selfieImg, {
      burst_frames: bursts,
      liveness_challenge: challenge,
      registered_embeddings: storedEmbeddings.length > 0 ? storedEmbeddings : null,
    });
    return res.json({
      ...result,
      student_id: stu.usn,
      registered_face_image: stu.face_image,
      embeddings_used: storedEmbeddings.length,
    });
  } catch (err) {
    console.error("[Attendance] Face verification error:", err);
    return res.status(500).json({
      verified: false,
      is_live: false,
      match_score: 0.0,
      match_percentage: 0.0,
      status: "error",
      message: "Biometric face verification error. Please retry selfie capture.",
      registered_face_image: stu.face_image,
    });
  }
});

/**
 * POST /api/attendance/enroll-face
 * Register master facial photo(s) with embedding computation
 */
router.post("/enroll-face", async (req, res) => {
  const { computeEmbeddings } = require("../src/ml_verifier");
  const { student_id, id, identifier, face_image, face_images } = req.body;
  const targetId = (student_id || id || identifier || "").trim();
  const allImages = (face_images && Array.isArray(face_images) && face_images.length > 0) ? face_images : (face_image ? [face_image] : []);

  if (!targetId || allImages.length === 0) {
    return res.status(400).json({ detail: "Student ID and at least one face_image are required." });
  }

  const stu = db.prepare("SELECT * FROM students WHERE LOWER(usn) = ?").get(targetId.toLowerCase());
  if (!stu) {
    return res.status(404).json({ detail: `Student ${targetId} not found in database.` });
  }

  db.prepare("UPDATE students SET face_image = ? WHERE id = ?").run(allImages[0], stu.id);

  // Clear old embeddings and store new ones
  try {
    db.prepare("DELETE FROM face_embeddings WHERE student_id = ?").run(stu.id);
  } catch (e) {
    console.warn("[Attendance] Clear embeddings notice:", e.message);
  }

  try {
    const embResult = await computeEmbeddings(allImages);
    const embeddings = embResult.embeddings || [];

    const insertEmb = db.prepare(`
      INSERT INTO face_embeddings (student_id, face_image, embedding)
      VALUES (?, ?, ?)
    `);

    for (let i = 0; i < allImages.length; i++) {
      const embJson = (embeddings[i] && Array.isArray(embeddings[i])) ? JSON.stringify(embeddings[i]) : null;
      insertEmb.run(stu.id, allImages[i], embJson);
    }

    console.log(`[Attendance] Enrolled ${allImages.length} face images with ${embResult.successful || 0} embeddings for ${targetId}`);
  } catch (embErr) {
    console.warn(`[Attendance] Embedding computation warning:`, embErr.message);
    const insertEmb = db.prepare(`
      INSERT INTO face_embeddings (student_id, face_image, embedding)
      VALUES (?, ?, ?)
    `);
    for (const img of allImages) {
      insertEmb.run(stu.id, img, null);
    }
  }

  return res.json({
    status: "success",
    message: `Face registration saved successfully (${allImages.length} images enrolled).`,
    student_id: stu.usn,
    has_face_registered: true,
    face_images_count: allImages.length,
  });
});

/**
 * POST /api/attendance/verify
 * Validate QR session (strictly enforce timer expiry) and record attendance
 */
router.post("/verify", (req, res) => {
  const {
    student_id,
    student_name,
    session_id,
    subject_code,
    subject_name,
    selfie_image,
    latitude,
    longitude,
  } = req.body;

  if (!student_id) {
    return res.status(400).json({ detail: "Student ID is required." });
  }

  const cleanStudentId = student_id.trim();
  const cleanSessionId = (session_id || "").trim();
  const cleanSubjectCode = (subject_code || "CS501").trim();
  const cleanSubjectName = (subject_name || "Database Management Systems").trim();
  const cleanStudentName = (student_name || "Student").trim();

  // 1. Session Expiry & Validity Check
  if (cleanSessionId) {
    const session = db.prepare("SELECT * FROM live_attendance_sessions WHERE session_id = ?").get(cleanSessionId);

    if (!session) {
      return res.status(400).json({
        detail: "Invalid QR Code. This attendance session does not exist or has been deleted.",
      });
    }

    if (!session.is_active) {
      return res.status(400).json({
        detail: "This attendance session has ended. Please ask your faculty to generate a fresh QR code.",
      });
    }

    if (session.expires_at) {
      const expTime = new Date(session.expires_at).getTime();
      if (Date.now() > expTime) {
        return res.status(400).json({
          detail: "QR Code timer has expired (60-second limit completed). Please ask your faculty for a new QR code.",
        });
      }
    }
  }

  // 2. Prevent duplicate submission for the same session
  if (cleanSessionId) {
    const existing = db.prepare(`
      SELECT * FROM attendance_records
      WHERE session_id = ? AND LOWER(student_id) = ?
    `).get(cleanSessionId, cleanStudentId.toLowerCase());

    if (existing) {
      return res.json({
        status: "already_marked",
        message: "Attendance has already been recorded for this session.",
        record: {
          id: existing.id,
          sessionId: existing.session_id,
          studentId: existing.student_id,
          studentName: existing.student_name,
          subjectCode: existing.subject_code,
          subjectName: existing.subject_name,
          status: existing.status,
          markedAt: existing.marked_at,
        },
      });
    }
  }

  // 3. Insert Attendance Record
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO attendance_records (session_id, student_id, student_name, subject_code, subject_name, status, selfie_image, latitude, longitude, marked_at)
    VALUES (?, ?, ?, ?, ?, 'Present', ?, ?, ?, ?)
  `).run(
    cleanSessionId || `SESSION-${Date.now()}`,
    cleanStudentId,
    cleanStudentName,
    cleanSubjectCode,
    cleanSubjectName,
    selfie_image || null,
    latitude !== undefined ? latitude : null,
    longitude !== undefined ? longitude : null,
    now
  );

  const newRecordId = Number(result.lastInsertRowid);

  return res.json({
    status: "success",
    message: "Attendance verified and marked successfully!",
    record: {
      id: newRecordId,
      sessionId: cleanSessionId || `SESSION-${Date.now()}`,
      studentId: cleanStudentId,
      studentName: cleanStudentName,
      subjectCode: cleanSubjectCode,
      subjectName: cleanSubjectName,
      status: "Present",
      markedAt: now,
    },
  });
});

/**
 * GET /api/attendance/student/:student_id
 * Retrieve student stats and attendance history
 */
router.get("/student/:student_id", (req, res) => {
  const studentId = req.params.student_id.trim();

  const stu = db.prepare("SELECT * FROM students WHERE LOWER(usn) = ?").get(studentId.toLowerCase());
  let studentName = "Student";
  let department = "Computer Science & Engineering";
  let semester = 5;
  let section = "A";

  if (stu) {
    const user = db.prepare("SELECT full_name FROM users WHERE id = ?").get(stu.user_id);
    if (user) studentName = user.full_name;
    department = stu.department || department;
    semester = stu.semester || semester;
    section = stu.section || section;
  }

  // Fetch SQLite attendance records
  const dbRecords = db.prepare(`
    SELECT * FROM attendance_records
    WHERE LOWER(student_id) = ?
    ORDER BY id DESC
  `).all(studentId.toLowerCase());

  // Default initial demo records
  const defaultHistory = [
    { id: "h-1", code: "CS501", subject: "Database Management Systems", date: "Today", time: "10:00 AM", status: "Present", method: "QR + Face Match" },
    { id: "h-2", code: "CS502", subject: "Computer Networks", date: "Today", time: "11:15 AM", status: "Present", method: "QR + Face Match" },
    { id: "h-3", code: "CS503", subject: "Web Technology", date: "Yesterday", time: "09:00 AM", status: "Present", method: "QR + Face Match" },
    { id: "h-4", code: "CS504", subject: "Artificial Intelligence", date: "Yesterday", time: "10:15 AM", status: "Absent", method: "-" },
    { id: "h-5", code: "CS505", subject: "Operating Systems", date: "15 Aug 2026", time: "01:30 PM", status: "Present", method: "QR + Face Match" },
    { id: "h-6", code: "CS506", subject: "Software Engineering", date: "14 Aug 2026", time: "02:45 PM", status: "Present", method: "QR + Face Match" },
  ];

  const dbFormatted = dbRecords.map((r) => {
    let dateStr = "Today";
    let timeStr = "Live";
    try {
      const d = new Date(r.marked_at);
      dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } catch {}

    return {
      id: `rec-${r.id}`,
      code: r.subject_code,
      subject: r.subject_name,
      date: dateStr,
      time: timeStr,
      status: r.status || "Present",
      method: "QR + Face Match",
    };
  });

  const fullHistory = [...dbFormatted, ...defaultHistory];
  const presentCount = fullHistory.filter((h) => h.status === "Present").length;
  const totalCount = fullHistory.length;
  const percentage = totalCount > 0 ? `${((presentCount / totalCount) * 100).toFixed(1)}%` : "92.4%";

  return res.json({
    studentId,
    studentName,
    department,
    semester,
    section,
    attendancePercentage: percentage,
    totalClasses: totalCount,
    classesPresent: presentCount,
    classesAbsent: totalCount - presentCount,
    hasFaceRegistered: Boolean(stu?.face_image),
    faceImage: stu?.face_image || null,
    history: fullHistory,
  });
});

/**
 * GET /api/attendance/student/:student_id/allotted-classes
 * Retrieve all allotted classes for student from Master Timetable
 */
router.get("/student/:student_id/allotted-classes", (req, res) => {
  const studentId = req.params.student_id.trim();

  // Find student semester and section
  let stu = db.prepare("SELECT * FROM students WHERE LOWER(usn) = ?").get(studentId.toLowerCase());
  if (!stu) {
    const user = db.prepare("SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(full_name) = ?").get(studentId.toLowerCase(), studentId.toLowerCase());
    if (user) {
      stu = db.prepare("SELECT * FROM students WHERE user_id = ?").get(user.id);
    }
  }

  const sem = String(stu?.semester || "7");
  const sec = (stu?.section || "A").toUpperCase();

  // 1. Query timetable entries matching student's semester and section
  let entries = db.prepare(`
    SELECT * FROM timetable_entries 
    WHERE (semester = ? OR semester = '') AND (UPPER(section) = ? OR UPPER(section) = 'ALL' OR section = '')
    ORDER BY CASE day 
      WHEN 'Monday' THEN 1 
      WHEN 'Tuesday' THEN 2 
      WHEN 'Wednesday' THEN 3 
      WHEN 'Thursday' THEN 4 
      WHEN 'Friday' THEN 5 
      WHEN 'Saturday' THEN 6 
      ELSE 7 
    END, time_slot ASC
  `).all(sem, sec);

  // 2. If no entries found with section match, query by semester
  if (!entries || entries.length === 0) {
    entries = db.prepare(`
      SELECT * FROM timetable_entries 
      WHERE semester = ?
      ORDER BY CASE day 
        WHEN 'Monday' THEN 1 
        WHEN 'Tuesday' THEN 2 
        WHEN 'Wednesday' THEN 3 
        WHEN 'Thursday' THEN 4 
        WHEN 'Friday' THEN 5 
        WHEN 'Saturday' THEN 6 
        ELSE 7 
      END, time_slot ASC
    `).all(sem);
  }

  // 3. If still empty, return general timetable entries and adapt to student semester
  if (!entries || entries.length === 0) {
    entries = db.prepare(`
      SELECT * FROM timetable_entries 
      ORDER BY CASE day 
        WHEN 'Monday' THEN 1 
        WHEN 'Tuesday' THEN 2 
        WHEN 'Wednesday' THEN 3 
        WHEN 'Thursday' THEN 4 
        WHEN 'Friday' THEN 5 
        WHEN 'Saturday' THEN 6 
        ELSE 7 
      END, time_slot ASC
    `).all();
  }

  return res.json(
    (entries || []).map((e) => {
      const entrySem = String(e.semester || sem);
      let subjectCode = e.code;
      if (sem === "7" && subjectCode && subjectCode.startsWith("CS5")) {
        subjectCode = subjectCode.replace("CS5", "CS7");
      }

      return {
        id: `cls-${e.id}`,
        code: subjectCode,
        name: e.name,
        facultyName: e.faculty_name,
        day: e.day,
        time: e.time_slot,
        room: e.room,
        semester: entrySem,
        section: e.section || sec || "A",
        students: e.students || 45,
        icon: subjectCode ? subjectCode.slice(0, 2) : "CL",
      };
    })
  );
});

module.exports = router;


