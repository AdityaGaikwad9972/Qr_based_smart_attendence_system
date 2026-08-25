const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

// Locate the SQLite database file (look in current dir or backend dir)
let dbPath = path.resolve(__dirname, "..", "smart_attendance.db");
if (!fs.existsSync(dbPath)) {
  const rootDbPath = path.resolve(__dirname, "..", "..", "smart_attendance.db");
  if (fs.existsSync(rootDbPath)) {
    dbPath = rootDbPath;
  }
}

console.log(`[Database] Connecting to SQLite at: ${dbPath}`);
const db = new DatabaseSync(dbPath);

// Enable WAL mode for high concurrency
try {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
} catch (e) {
  console.warn("[Database] PRAGMA notice:", e.message);
}

/**
 * Initialize Tables if not present
 */
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      usn VARCHAR(30) UNIQUE NOT NULL,
      department VARCHAR(100) NOT NULL,
      semester INTEGER DEFAULT 5,
      section VARCHAR(10) DEFAULT 'A',
      face_image TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      employee_id VARCHAR(30) UNIQUE NOT NULL,
      department VARCHAR(100) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      admin_id VARCHAR(30) UNIQUE NOT NULL,
      department VARCHAR(100) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS timetable_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(30) NOT NULL,
      name VARCHAR(150) NOT NULL,
      faculty_id VARCHAR(50) NOT NULL,
      faculty_name VARCHAR(100) NOT NULL,
      day VARCHAR(20) NOT NULL,
      time_slot VARCHAR(50) NOT NULL,
      room VARCHAR(50) NOT NULL,
      semester VARCHAR(10) DEFAULT '5',
      section VARCHAR(10) DEFAULT 'A',
      students INTEGER DEFAULT 45,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS live_attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id VARCHAR(100) UNIQUE NOT NULL,
      subject_code VARCHAR(30) NOT NULL,
      subject_name VARCHAR(150) NOT NULL,
      faculty_id VARCHAR(50) NOT NULL,
      room VARCHAR(50) NOT NULL,
      expires_in_seconds INTEGER DEFAULT 60,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      is_active BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id VARCHAR(100) NOT NULL,
      student_id VARCHAR(50) NOT NULL,
      student_name VARCHAR(100) NOT NULL,
      subject_code VARCHAR(30) NOT NULL,
      subject_name VARCHAR(150) NOT NULL,
      status VARCHAR(20) DEFAULT 'Present',
      selfie_image TEXT,
      latitude REAL,
      longitude REAL,
      marked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS face_embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      face_image TEXT NOT NULL,
      embedding TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);
}

/**
 * Seed Default System Data if tables are empty
 */
function seedDefaultData(hashPassword) {
  initSchema();

  try {
    const now = new Date().toISOString();
    // 1. Default Admin
    const adminUser = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@acharya.ac.in");
    if (!adminUser) {
      const result = db.prepare(`
        INSERT INTO users (full_name, email, password_hash, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run("Institutional Administrator", "admin@acharya.ac.in", hashPassword("admin123"), "ADMIN", 1, now, now);
      
      const newAdminId = Number(result.lastInsertRowid);
      db.prepare(`
        INSERT INTO admins (user_id, admin_id, department)
        VALUES (?, ?, ?)
      `).run(newAdminId, "ADM001", "Administration");
    }

    // 2. Default Faculty Members
    const defaultFacultyList = [
      { email: "ramesh.sharma@acharya.ac.in", name: "Dr. Ramesh Sharma", empId: "FAC001" },
      { email: "banu.prasad@acharya.ac.in", name: "Banu Prasad", empId: "Faculty12" },
      { email: "shiva@acharya.ac.in", name: "Shiva", empId: "Faculty13" },
      { email: "rohit@acharya.ac.in", name: "Rohit", empId: "Faculty14" },
      { email: "vikram.sen@acharya.ac.in", name: "Prof. Vikram Sen", empId: "FAC002" },
      { email: "ananya.roy@acharya.ac.in", name: "Dr. Ananya Roy", empId: "FAC003" },
      { email: "suresh.nair@acharya.ac.in", name: "Prof. Suresh Nair", empId: "FAC004" },
      { email: "arvind.menon@acharya.ac.in", name: "Prof. Arvind Menon", empId: "FAC888" },
    ];

    for (const f of defaultFacultyList) {
      const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(f.email);
      let userId = existingUser ? existingUser.id : null;
      if (!existingUser) {
        const result = db.prepare(`
          INSERT INTO users (full_name, email, password_hash, role, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(f.name, f.email, hashPassword("faculty123"), "FACULTY", 1, now, now);
        userId = Number(result.lastInsertRowid);
      }

      const existingFac = db.prepare("SELECT id FROM faculty WHERE LOWER(employee_id) = ? OR user_id = ?").get(f.empId.toLowerCase(), userId);
      if (!existingFac && userId) {
        db.prepare(`
          INSERT INTO faculty (user_id, employee_id, department)
          VALUES (?, ?, ?)
        `).run(userId, f.empId, "Computer Science & Engineering");
      }
    }

    // 3. Default Students
    const defaultStudents = [
      { email: "student@acharya.ac.in", name: "Aarav Sharma", usn: "1AY22CS001", sem: 5, sec: "A" },
      { email: "aditya.gaikwad@acharya.ac.in", name: "Aditya Gaikwad", usn: "1AY23CS011", sem: 7, sec: "A" },
    ];

    for (const s of defaultStudents) {
      const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(s.email);
      let userId = existingUser ? existingUser.id : null;
      if (!existingUser) {
        const result = db.prepare(`
          INSERT INTO users (full_name, email, password_hash, role, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(s.name, s.email, hashPassword("student123"), "STUDENT", 1, now, now);
        userId = Number(result.lastInsertRowid);
      }

      const existingStu = db.prepare("SELECT id FROM students WHERE LOWER(usn) = ? OR user_id = ?").get(s.usn.toLowerCase(), userId);
      if (!existingStu && userId) {
        db.prepare(`
          INSERT INTO students (user_id, usn, department, semester, section)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, s.usn, "Computer Science & Engineering", s.sem, s.sec);
      }
    }

    // 4. Default Conflict-Free Timetable (25 slots for Sem 7 + 25 slots for Sem 5)
    // Clear legacy timetable entries and seed strictly conflict-free schedules
    resetTimetableToDefault();
  } catch (err) {
    console.error("[Database] Seed error:", err);
  }
}

// Canonical SEMESTER 7 Schedule (Assigned to Banu Prasad - Faculty12, Shiva - Faculty13, Rohit - Faculty14)
const defaultSem7Schedule = [
  // MONDAY
  ["CS701", "Machine Learning", "Faculty12", "Banu Prasad", "Monday", "09:00 AM - 10:00 AM", "Room 301", "7", "A", 45],
  ["CS702", "Cloud Computing", "Faculty13", "Shiva", "Monday", "10:00 AM - 11:00 AM", "Room 301", "7", "A", 45],
  ["CS703", "Software Project Management", "Faculty14", "Rohit", "Monday", "11:15 AM - 12:15 PM", "Room 301", "7", "A", 45],
  ["CS704", "AI & ML", "Faculty12", "Banu Prasad", "Monday", "12:15 PM - 01:15 PM", "Room 301", "7", "A", 45],
  ["CS705", "ML Lab", "Faculty13", "Shiva", "Monday", "02:00 PM - 04:00 PM", "AI Lab", "7", "A", 45],

  // TUESDAY
  ["CS702", "Cloud Computing", "Faculty13", "Shiva", "Tuesday", "09:00 AM - 10:00 AM", "Room 301", "7", "A", 45],
  ["CS701", "Machine Learning", "Faculty12", "Banu Prasad", "Tuesday", "10:00 AM - 11:00 AM", "Room 301", "7", "A", 45],
  ["CS704", "AI & ML", "Faculty12", "Banu Prasad", "Tuesday", "11:15 AM - 12:15 PM", "Room 301", "7", "A", 45],
  ["CS703", "Software Project Management", "Faculty14", "Rohit", "Tuesday", "12:15 PM - 01:15 PM", "Room 301", "7", "A", 45],
  ["CS706", "Cloud Lab", "Faculty13", "Shiva", "Tuesday", "02:00 PM - 04:00 PM", "Cloud Lab", "7", "A", 45],

  // WEDNESDAY
  ["CS704", "AI & ML", "Faculty12", "Banu Prasad", "Wednesday", "09:00 AM - 10:00 AM", "Room 301", "7", "A", 45],
  ["CS703", "Software Project Management", "Faculty14", "Rohit", "Wednesday", "10:00 AM - 11:00 AM", "Room 301", "7", "A", 45],
  ["CS702", "Cloud Computing", "Faculty13", "Shiva", "Wednesday", "11:15 AM - 12:15 PM", "Room 301", "7", "A", 45],
  ["CS701", "Machine Learning", "Faculty12", "Banu Prasad", "Wednesday", "12:15 PM - 01:15 PM", "Room 301", "7", "A", 45],
  ["CS707", "Project Work", "Faculty12", "Banu Prasad", "Wednesday", "02:00 PM - 04:00 PM", "Room 301", "7", "A", 45],

  // THURSDAY
  ["CS701", "Machine Learning", "Faculty12", "Banu Prasad", "Thursday", "09:00 AM - 10:00 AM", "Room 301", "7", "A", 45],
  ["CS704", "AI & ML", "Faculty12", "Banu Prasad", "Thursday", "10:00 AM - 11:00 AM", "Room 301", "7", "A", 45],
  ["CS701", "Machine Learning", "Faculty12", "Banu Prasad", "Thursday", "11:15 AM - 12:15 PM", "Room 301", "7", "A", 45],
  ["CS702", "Cloud Computing", "Faculty13", "Shiva", "Thursday", "12:15 PM - 01:15 PM", "Room 301", "7", "A", 45],
  ["CS708", "AI Lab", "Faculty13", "Shiva", "Thursday", "02:00 PM - 04:00 PM", "AI Lab", "7", "A", 45],

  // FRIDAY
  ["CS702", "Cloud Computing", "Faculty13", "Shiva", "Friday", "09:00 AM - 10:00 AM", "Room 301", "7", "A", 45],
  ["CS701", "Machine Learning", "Faculty12", "Banu Prasad", "Friday", "10:00 AM - 11:00 AM", "Room 301", "7", "A", 45],
  ["CS703", "Software Project Management", "Faculty14", "Rohit", "Friday", "11:15 AM - 12:15 PM", "Room 301", "7", "A", 45],
  ["CS704", "AI & ML", "Faculty12", "Banu Prasad", "Friday", "12:15 PM - 01:15 PM", "Room 301", "7", "A", 45],
  ["CS705", "ML Lab", "Faculty13", "Shiva", "Friday", "02:00 PM - 04:00 PM", "AI Lab", "7", "A", 45],
];

// Canonical SEMESTER 5 Schedule (Assigned to distinct faculty: Dr. Ramesh Sharma, Prof. Vikram Sen, Dr. Ananya Roy, Prof. Suresh Nair, Prof. Arvind Menon)
const defaultSem5Schedule = [
  // MONDAY
  ["CS501", "Database Management Systems", "FAC001", "Dr. Ramesh Sharma", "Monday", "09:00 AM - 10:00 AM", "Room 201", "5", "A", 45],
  ["CS502", "Computer Networks", "FAC002", "Prof. Vikram Sen", "Monday", "10:00 AM - 11:00 AM", "Room 201", "5", "A", 45],
  ["CS503", "Web Technology", "FAC003", "Dr. Ananya Roy", "Monday", "11:15 AM - 12:15 PM", "Room 201", "5", "A", 45],
  ["CS504", "Operating Systems", "FAC004", "Prof. Suresh Nair", "Monday", "12:15 PM - 01:15 PM", "Room 201", "5", "A", 45],
  ["CS505", "DBMS & Networks Lab", "FAC001", "Dr. Ramesh Sharma", "Monday", "02:00 PM - 04:00 PM", "Database Lab 2", "5", "A", 45],

  // TUESDAY
  ["CS502", "Computer Networks", "FAC002", "Prof. Vikram Sen", "Tuesday", "09:00 AM - 10:00 AM", "Room 201", "5", "A", 45],
  ["CS501", "Database Management Systems", "FAC001", "Dr. Ramesh Sharma", "Tuesday", "10:00 AM - 11:00 AM", "Room 201", "5", "A", 45],
  ["CS504", "Operating Systems", "FAC004", "Prof. Suresh Nair", "Tuesday", "11:15 AM - 12:15 PM", "Room 201", "5", "A", 45],
  ["CS506", "Software Engineering", "FAC888", "Prof. Arvind Menon", "Tuesday", "12:15 PM - 01:15 PM", "Room 201", "5", "A", 45],
  ["CS507", "Web Tech Lab", "FAC003", "Dr. Ananya Roy", "Tuesday", "02:00 PM - 04:00 PM", "Lab 3", "5", "A", 45],

  // WEDNESDAY
  ["CS504", "Operating Systems", "FAC004", "Prof. Suresh Nair", "Wednesday", "09:00 AM - 10:00 AM", "Room 201", "5", "A", 45],
  ["CS506", "Software Engineering", "FAC888", "Prof. Arvind Menon", "Wednesday", "10:00 AM - 11:00 AM", "Room 201", "5", "A", 45],
  ["CS502", "Computer Networks", "FAC002", "Prof. Vikram Sen", "Wednesday", "11:15 AM - 12:15 PM", "Room 201", "5", "A", 45],
  ["CS501", "Database Management Systems", "FAC001", "Dr. Ramesh Sharma", "Wednesday", "12:15 PM - 01:15 PM", "Room 201", "5", "A", 45],
  ["CS505", "DBMS & Networks Lab", "FAC001", "Dr. Ramesh Sharma", "Wednesday", "02:00 PM - 04:00 PM", "Database Lab 2", "5", "A", 45],

  // THURSDAY
  ["CS501", "Database Management Systems", "FAC001", "Dr. Ramesh Sharma", "Thursday", "09:00 AM - 10:00 AM", "Room 201", "5", "A", 45],
  ["CS504", "Operating Systems", "FAC004", "Prof. Suresh Nair", "Thursday", "10:00 AM - 11:00 AM", "Room 201", "5", "A", 45],
  ["CS501", "Database Management Systems", "FAC001", "Dr. Ramesh Sharma", "Thursday", "11:15 AM - 12:15 PM", "Room 201", "5", "A", 45],
  ["CS502", "Computer Networks", "FAC002", "Prof. Vikram Sen", "Thursday", "12:15 PM - 01:15 PM", "Room 201", "5", "A", 45],
  ["CS507", "Web Tech Lab", "FAC003", "Dr. Ananya Roy", "Thursday", "02:00 PM - 04:00 PM", "Lab 3", "5", "A", 45],

  // FRIDAY
  ["CS502", "Computer Networks", "FAC002", "Prof. Vikram Sen", "Friday", "09:00 AM - 10:00 AM", "Room 201", "5", "A", 45],
  ["CS501", "Database Management Systems", "FAC001", "Dr. Ramesh Sharma", "Friday", "10:00 AM - 11:00 AM", "Room 201", "5", "A", 45],
  ["CS506", "Software Engineering", "FAC888", "Prof. Arvind Menon", "Friday", "11:15 AM - 12:15 PM", "Room 201", "5", "A", 45],
  ["CS504", "Operating Systems", "FAC004", "Prof. Suresh Nair", "Friday", "12:15 PM - 01:15 PM", "Room 201", "5", "A", 45],
  ["CS505", "DBMS & Networks Lab", "FAC001", "Dr. Ramesh Sharma", "Friday", "02:00 PM - 04:00 PM", "Database Lab 2", "5", "A", 45],
];

function resetTimetableToDefault() {
  db.prepare("DELETE FROM timetable_entries").run();
  const now = new Date().toISOString();
  const insertStmt = db.prepare(`
    INSERT INTO timetable_entries (code, name, faculty_id, faculty_name, day, time_slot, room, semester, section, students, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of [...defaultSem7Schedule, ...defaultSem5Schedule]) {
    insertStmt.run(...row, now);
  }
}

module.exports = {
  db,
  initSchema,
  seedDefaultData,
  resetTimetableToDefault,
  defaultSem7Schedule,
  defaultSem5Schedule,
};
