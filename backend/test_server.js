const test = require("node:test");
const assert = require("node:assert");
const http = require("http");
const app = require("./server");

let server;
const PORT = 8001;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Helper function for HTTP requests
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json, raw: data });
        } catch {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test.before(() => {
  return new Promise((resolve) => {
    server = app.listen(PORT, "127.0.0.1", () => {
      console.log(`[Test Server] Running on ${BASE_URL}`);
      resolve();
    });
  });
});

test.after(() => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

test("1. Root and Health Endpoints", async () => {
  const rootRes = await request("GET", "/");
  assert.strictEqual(rootRes.status, 200);
  assert.strictEqual(rootRes.data.status, "online");
  assert.ok(rootRes.data.engine.includes("Express"));

  const healthRes = await request("GET", "/health");
  assert.strictEqual(healthRes.status, 200);
  assert.strictEqual(healthRes.data.status, "healthy");
  assert.strictEqual(healthRes.data.database, "connected");
});

test("2. Admin Authentication by Email and ID with Password Protection", async () => {
  // Login by Email
  const resEmail = await request("POST", "/api/auth/login", {
    identifier: "admin@acharya.ac.in",
    password: "admin123",
    role: "admin",
  });
  assert.strictEqual(resEmail.status, 200);
  assert.strictEqual(resEmail.data.user.role, "admin");
  assert.strictEqual(resEmail.data.user.identifier, "ADM001");
  assert.ok(resEmail.data.access_token);

  // Login by ID
  const resId = await request("POST", "/api/auth/login", {
    identifier: "ADM001",
    password: "admin123",
    role: "admin",
  });
  assert.strictEqual(resId.status, 200);

  // Wrong password must fail
  const resBad = await request("POST", "/api/auth/login", {
    identifier: "ADM001",
    password: "WrongPassword999",
    role: "admin",
  });
  assert.strictEqual(resBad.status, 401);
  assert.ok(resBad.data.detail.includes("Invalid password"));
});

test("3. Seeded Student & Faculty Authentication", async () => {
  // Student Login
  const stuRes = await request("POST", "/api/auth/login", {
    identifier: "1AY22CS001",
    password: "student123",
    role: "student",
  });
  assert.strictEqual(stuRes.status, 200);
  assert.strictEqual(stuRes.data.user.role, "student");
  assert.strictEqual(stuRes.data.user.identifier, "1AY22CS001");

  // Faculty Login
  const facRes = await request("POST", "/api/auth/login", {
    identifier: "FAC001",
    password: "faculty123",
    role: "faculty",
  });
  assert.strictEqual(facRes.status, 200);
  assert.strictEqual(facRes.data.user.role, "faculty");
  assert.strictEqual(facRes.data.user.identifier, "FAC001");
});

test("4. Unregistered Users and Role Mismatch Protection", async () => {
  const unregRes = await request("POST", "/api/auth/login", {
    identifier: "1AY99CS999",
    password: "randomPassword",
    role: "student",
  });
  assert.strictEqual(unregRes.status, 401);
  assert.ok(unregRes.data.detail.includes("not registered"));

  // Logging in as faculty using student credentials must be rejected
  const roleMismatch = await request("POST", "/api/auth/login", {
    identifier: "1AY22CS001",
    password: "student123",
    role: "faculty",
  });
  assert.strictEqual(roleMismatch.status, 401);
  assert.ok(roleMismatch.data.detail.includes("Access denied"));
});

test("5. Registration and Face Enrollment Flow", async () => {
  const randNum = Math.floor(Math.random() * 800000) + 100000;
  const newUSN = `1AY22CS${randNum}`;

  const regRes = await request("POST", "/api/auth/register", {
    name: "Node Test Student",
    email: `${newUSN.toLowerCase()}@acharya.ac.in`,
    id: newUSN,
    password: "testPassword123",
    role: "student",
    department: "Computer Science & Engineering",
    semester: 5,
    section: "A",
  });
  assert.strictEqual(regRes.status, 201);
  assert.strictEqual(regRes.data.user.identifier, newUSN);

  // Enroll Face
  const mockB64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
  const enrollRes = await request("POST", "/api/attendance/enroll-face", {
    student_id: newUSN,
    face_image: mockB64,
  });
  assert.strictEqual(enrollRes.status, 200);
  assert.strictEqual(enrollRes.data.has_face_registered, true);

  // Verify Face
  const verifyRes = await request("POST", "/api/attendance/verify-face", {
    student_id: newUSN,
    selfie_image: mockB64,
  });
  assert.strictEqual(verifyRes.status, 200);
  assert.strictEqual(typeof verifyRes.data.verified, "boolean");
  assert.ok(verifyRes.data.match_percentage >= 0);
});

test("6. Admin Master Timetable & Stats", async () => {
  const ttRes = await request("GET", "/api/admin/timetable");
  assert.strictEqual(ttRes.status, 200);
  assert.ok(Array.isArray(ttRes.data));

  const statsRes = await request("GET", "/api/admin/stats");
  assert.strictEqual(statsRes.status, 200);
  assert.ok(statsRes.data.totalStudents >= 1);
  assert.ok(statsRes.data.totalFaculty >= 1);
});

test("7. Faculty Session Start, Live Attendees & Stop", async () => {
  const startRes = await request("POST", "/api/faculty/session/start", {
    subject_code: "CS501",
    subject_name: "Database Management Systems",
    faculty_id: "FAC001",
    room: "Room 301",
    expires_in_seconds: 60,
  });
  assert.strictEqual(startRes.status, 200);
  assert.ok(startRes.data.sessionId.startsWith("SESSION-"));
  assert.ok(startRes.data.expiresAt);

  const sessionId = startRes.data.sessionId;

  // Check live attendees
  const liveRes = await request("GET", `/api/faculty/session/${sessionId}/live`);
  assert.strictEqual(liveRes.status, 200);
  assert.strictEqual(liveRes.data.status, "active");

  // Stop session
  const stopRes = await request("POST", "/api/faculty/session/stop", {
    session_id: sessionId,
  });
  assert.strictEqual(stopRes.status, 200);
});

test("8. Strict QR Timer Expiry and Invalid Session Rejection", async () => {
  // 1. Non-existent QR Code Session ID
  const invalidRes = await request("POST", "/api/attendance/verify", {
    student_id: "1AY22CS001",
    student_name: "Aarav Sharma",
    session_id: "SESSION-INVALID-8888",
    subject_code: "CS501",
    subject_name: "Database Management Systems",
  });
  assert.strictEqual(invalidRes.status, 400);
  assert.ok(invalidRes.data.detail.includes("Invalid QR Code"));

  // 2. Start a 1-second session and verify rejection once stopped
  const startRes = await request("POST", "/api/faculty/session/start", {
    subject_code: "CS501",
    subject_name: "Database Management Systems",
    faculty_id: "FAC001",
    room: "Room 301",
    expires_in_seconds: 1,
  });
  const testSessionId = startRes.data.sessionId;

  // Stop it
  await request("POST", "/api/faculty/session/stop", { session_id: testSessionId });

  // Attempt marking attendance on stopped session -> must return 400
  const tryRes = await request("POST", "/api/attendance/verify", {
    student_id: "1AY22CS001",
    student_name: "Aarav Sharma",
    session_id: testSessionId,
    subject_code: "CS501",
    subject_name: "Database Management Systems",
  });
  assert.strictEqual(tryRes.status, 400);
  assert.ok(tryRes.data.detail.toLowerCase().includes("ended") || tryRes.data.detail.toLowerCase().includes("expired"));
});

test("9. Location-Independent Attendance Marking & Duplicate Prevention", async () => {
  // Start active session
  const startRes = await request("POST", "/api/faculty/session/start", {
    subject_code: "CS501",
    subject_name: "Database Management Systems",
    faculty_id: "FAC001",
    room: "Room 301",
    expires_in_seconds: 300,
  });
  const activeSessId = startRes.data.sessionId;

  // Mark attendance with NO location
  const markRes = await request("POST", "/api/attendance/verify", {
    student_id: "1AY22CS001",
    student_name: "Aarav Sharma",
    session_id: activeSessId,
    subject_code: "CS501",
    subject_name: "Database Management Systems",
    latitude: null,
    longitude: null,
  });
  assert.strictEqual(markRes.status, 200);
  assert.strictEqual(markRes.data.status, "success");

  // Duplicate submission for same session
  const dupRes = await request("POST", "/api/attendance/verify", {
    student_id: "1AY22CS001",
    student_name: "Aarav Sharma",
    session_id: activeSessId,
    subject_code: "CS501",
    subject_name: "Database Management Systems",
  });
  assert.strictEqual(dupRes.status, 200);
  assert.strictEqual(dupRes.data.status, "already_marked");
});

test("10. Student Attendance History and Stats", async () => {
  const histRes = await request("GET", "/api/attendance/student/1AY22CS001");
  assert.strictEqual(histRes.status, 200);
  assert.strictEqual(histRes.data.studentId, "1AY22CS001");
  assert.ok(Array.isArray(histRes.data.history));
  assert.ok(histRes.data.totalClasses >= 1);
});
