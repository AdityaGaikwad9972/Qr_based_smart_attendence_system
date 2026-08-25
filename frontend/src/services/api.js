// API BASE CONFIG
const API_BASE_URL = "http://127.0.0.1:8000";

const defaultHeaders = {
  "Content-Type": "application/json",
};

/**
 * Universal safe fetch helper with fallback
 */
async function fetchAPI(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server responded with status ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.warn(`[API] Network or server error on ${endpoint}:`, error.message);
    throw error;
  }
}

/* =========================================================================
   1. AUTHENTICATION & REGISTRATION API (Student, Faculty, Admin)
   ========================================================================= */
export const authAPI = {
  async register(data) {
    try {
      const res = await fetchAPI("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });

      // Also sync to local backup
      const users = JSON.parse(localStorage.getItem("app_registered_users") || "[]");
      const filtered = users.filter((u) => u.email !== data.email && u.id !== data.id);
      filtered.push({ ...data, registeredAt: new Date().toISOString() });
      localStorage.setItem("app_registered_users", JSON.stringify(filtered));

      return res;
    } catch (err) {
      // If server returned a conflict error (409) or bad request, re-throw immediately
      if (err.message && (err.message.includes("already registered") || err.message.includes("Conflict") || err.message.includes("409"))) {
        throw err;
      }

      console.warn("[AuthAPI] Using fallback local registration:", err.message);
      const users = JSON.parse(localStorage.getItem("app_registered_users") || "[]");
      const exists = users.some(
        (u) =>
          u.email?.toLowerCase() === data.email?.toLowerCase() ||
          u.id?.toLowerCase() === data.id?.toLowerCase()
      );
      if (exists) {
        throw new Error("User with this email or ID is already registered.");
      }
      users.push({ ...data, registeredAt: new Date().toISOString() });
      localStorage.setItem("app_registered_users", JSON.stringify(users));
      return {
        message: `Successfully registered as ${data.role?.toUpperCase() || "USER"} (Local Sync)`,
        user: { name: data.name, email: data.email, role: data.role, identifier: data.id },
      };
    }
  },

  async getProfile(identifier) {
    try {
      return await fetchAPI(`/api/auth/profile/${encodeURIComponent(identifier)}`);
    } catch {
      const users = JSON.parse(localStorage.getItem("app_registered_users") || "[]");
      const found = users.find(
        (u) =>
          u.email?.toLowerCase() === identifier.toLowerCase() ||
          u.id?.toLowerCase() === identifier.toLowerCase()
      );
      if (found) {
        return {
          id: 1,
          name: found.name,
          email: found.email,
          role: found.role,
          identifier: found.id,
          department: found.department || "Computer Science & Engineering",
          semester: found.semester || 5,
          section: found.section || "A",
          has_face_registered: Boolean(found.face_image),
          face_image: found.face_image,
        };
      }
      return null;
    }
  },

  async login(identifier, password, role) {
    const trimmedId = (identifier || "").trim();
    const trimmedPass = (password || "").trim();

    if (!trimmedId || !trimmedPass) {
      throw new Error("Please provide both ID and password.");
    }

    try {
      return await fetchAPI("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: trimmedId, password: trimmedPass, role }),
      });
    } catch (err) {
      // If backend responded with an authentication or role rejection, fail immediately!
      const msg = err.message || "";
      const isNetworkError =
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("networkerror") ||
        msg.toLowerCase().includes("network or server error");

      if (!isNetworkError) {
        throw err;
      }

      console.warn("[AuthAPI] Backend unreachable, checking registered credentials locally:", msg);

      // Offline mode: STRICT verification only for exact registered accounts
      const users = JSON.parse(localStorage.getItem("app_registered_users") || "[]");
      const found = users.find(
        (u) =>
          (u.email?.toLowerCase() === trimmedId.toLowerCase() ||
            u.id?.toLowerCase() === trimmedId.toLowerCase()) &&
          u.password === trimmedPass
      );

      if (found) {
        if (role && found.role && found.role.toLowerCase() !== role.toLowerCase()) {
          throw new Error(`Access denied: This account is registered as ${found.role.toUpperCase()}, not ${role.toUpperCase()}.`);
        }
        return {
          access_token: "mock-jwt-token-" + Date.now(),
          user: {
            id: 1,
            name: found.name,
            email: found.email,
            role: found.role,
            identifier: found.id,
            department: found.department || "Computer Science & Engineering",
            semester: found.semester || 5,
            section: found.section || "A",
            has_face_registered: Boolean(found.face_image),
            face_image: found.face_image,
          },
        };
      }

      // Offline mode: Default seeded accounts ONLY with exact matching passwords
      if (
        (trimmedId.toLowerCase() === "admin@acharya.ac.in" || trimmedId.toUpperCase() === "ADM001") &&
        trimmedPass === "admin123"
      ) {
        if (role && role.toLowerCase() !== "admin") {
          throw new Error(`Access denied: This account is registered as ADMIN, not ${role.toUpperCase()}.`);
        }
        return {
          access_token: "mock-admin-token",
          user: {
            id: 1,
            name: "Institutional Administrator",
            email: "admin@acharya.ac.in",
            role: "admin",
            identifier: "ADM001",
            department: "Administration",
          },
        };
      }

      if (
        (trimmedId.toLowerCase() === "ramesh.sharma@acharya.ac.in" || trimmedId.toUpperCase() === "FAC001") &&
        trimmedPass === "faculty123"
      ) {
        if (role && role.toLowerCase() !== "faculty") {
          throw new Error(`Access denied: This account is registered as FACULTY, not ${role.toUpperCase()}.`);
        }
        return {
          access_token: "mock-faculty-token",
          user: {
            id: 2,
            name: "Dr. Ramesh Sharma",
            email: "ramesh.sharma@acharya.ac.in",
            role: "faculty",
            identifier: "FAC001",
            department: "Computer Science & Engineering",
          },
        };
      }

      if (
        (trimmedId.toLowerCase() === "student@acharya.ac.in" || trimmedId.toUpperCase() === "1AY22CS001") &&
        trimmedPass === "student123"
      ) {
        if (role && role.toLowerCase() !== "student") {
          throw new Error(`Access denied: This account is registered as STUDENT, not ${role.toUpperCase()}.`);
        }
        return {
          access_token: "mock-student-token",
          user: {
            id: 3,
            name: "Aarav Sharma",
            email: "student@acharya.ac.in",
            role: "student",
            identifier: "1AY22CS001",
            department: "Computer Science & Engineering",
            semester: 5,
            section: "A",
          },
        };
      }

      // If credentials do not match any registered account or seeded account, REJECT!
      throw new Error("Invalid credentials. Please enter your registered ID and correct password.");
    }
  },
};

/* =========================================================================
   2. ADMIN TIMETABLE & INSTITUTION API
   ========================================================================= */
export const adminAPI = {
  async getTimetable() {
    try {
      return await fetchAPI("/api/admin/timetable");
    } catch {
      const saved = localStorage.getItem("institution_timetable");
      return saved ? JSON.parse(saved) : [];
    }
  },

  async uploadTimetable(entries) {
    try {
      const result = await fetchAPI("/api/admin/timetable", {
        method: "POST",
        body: JSON.stringify(entries),
      });
      localStorage.setItem("institution_timetable", JSON.stringify(entries));
      window.dispatchEvent(new Event("timetable_updated"));
      return result;
    } catch {
      localStorage.setItem("institution_timetable", JSON.stringify(entries));
      window.dispatchEvent(new Event("timetable_updated"));
      return { message: "Saved locally (Offline Mode)", total: entries.length };
    }
  },

  async resetTimetable() {
    try {
      const result = await fetchAPI("/api/admin/timetable/reset", {
        method: "POST",
      });
      if (result.timetable) {
        localStorage.setItem("institution_timetable", JSON.stringify(result.timetable));
        window.dispatchEvent(new Event("timetable_updated"));
      }
      return result;
    } catch {
      // Fallback: clear local storage override
      localStorage.removeItem("institution_timetable");
      window.dispatchEvent(new Event("timetable_updated"));
      return { message: "Reset to default master schedule" };
    }
  },

  async getStats() {
    try {
      return await fetchAPI("/api/admin/stats");
    } catch {
      const users = JSON.parse(localStorage.getItem("app_registered_users") || "[]");
      const students = users.filter((u) => u.role === "student").length;
      const faculty = users.filter((u) => u.role === "faculty").length;
      return {
        totalStudents: students,
        totalFaculty: faculty,
        activeSessions: 0,
        campusAvgAttendance: "100%",
        totalAttendanceMarked: 0,
      };
    }
  },

  async getStudents() {
    try {
      return await fetchAPI("/api/admin/students");
    } catch {
      const users = JSON.parse(localStorage.getItem("app_registered_users") || "[]");
      const students = users.filter((u) => u.role === "student");
      return {
        students: students.map((s, idx) => ({
          id: idx + 1,
          usn: s.id || "1AY22CS001",
          name: s.name || "Student",
          email: s.email || "",
          department: s.department || "Computer Science & Engineering",
          semester: s.semester || 5,
          section: s.section || "A",
        })),
      };
    }
  },

  async getFaculty() {
    try {
      return await fetchAPI("/api/admin/faculty");
    } catch {
      const users = JSON.parse(localStorage.getItem("app_registered_users") || "[]");
      const faculty = users.filter((u) => u.role === "faculty");
      return {
        faculty: faculty.map((f, idx) => ({
          id: idx + 1,
          employeeId: f.id || "FAC001",
          name: f.name || "Faculty",
          email: f.email || "",
          department: f.department || "Computer Science & Engineering",
        })),
      };
    }
  },

  async deleteStudent(identifier) {
    try {
      const res = await fetchAPI(`/api/admin/students/${encodeURIComponent(identifier)}`, {
        method: "DELETE",
      });
      // Also update local storage backup
      const users = JSON.parse(localStorage.getItem("app_registered_users") || "[]");
      const updated = users.filter(
        (u) =>
          u.id?.toLowerCase() !== identifier.toLowerCase() &&
          u.usn?.toLowerCase() !== identifier.toLowerCase() &&
          String(u.id) !== String(identifier)
      );
      localStorage.setItem("app_registered_users", JSON.stringify(updated));
      return res;
    } catch (err) {
      const users = JSON.parse(localStorage.getItem("app_registered_users") || "[]");
      const updated = users.filter(
        (u) =>
          u.id?.toLowerCase() !== identifier.toLowerCase() &&
          u.usn?.toLowerCase() !== identifier.toLowerCase() &&
          String(u.id) !== String(identifier)
      );
      localStorage.setItem("app_registered_users", JSON.stringify(updated));
      return { message: "Student deleted from local storage", deletedId: identifier };
    }
  },

  async deleteFaculty(identifier) {
    try {
      const res = await fetchAPI(`/api/admin/faculty/${encodeURIComponent(identifier)}`, {
        method: "DELETE",
      });
      // Also update local storage backup
      const users = JSON.parse(localStorage.getItem("app_registered_users") || "[]");
      const updated = users.filter(
        (u) =>
          u.id?.toLowerCase() !== identifier.toLowerCase() &&
          u.employeeId?.toLowerCase() !== identifier.toLowerCase() &&
          String(u.id) !== String(identifier)
      );
      localStorage.setItem("app_registered_users", JSON.stringify(updated));
      return res;
    } catch (err) {
      const users = JSON.parse(localStorage.getItem("app_registered_users") || "[]");
      const updated = users.filter(
        (u) =>
          u.id?.toLowerCase() !== identifier.toLowerCase() &&
          u.employeeId?.toLowerCase() !== identifier.toLowerCase() &&
          String(u.id) !== String(identifier)
      );
      localStorage.setItem("app_registered_users", JSON.stringify(updated));
      return { message: "Faculty deleted from local storage", deletedId: identifier };
    }
  },
};

/* =========================================================================
   3. FACULTY SESSIONS & ATTENDANCE REPORTS API
   ========================================================================= */
export const facultyAPI = {
  async getClasses(facultyId) {
    return this.getAssignedClasses(facultyId);
  },

  async getAssignedClasses(facultyId) {
    try {
      const res = await fetchAPI(`/api/faculty/${encodeURIComponent(facultyId || "FAC001")}/classes`);
      if (Array.isArray(res)) return res;
    } catch (e) {
      console.warn("Could not fetch faculty classes from backend:", e.message);
    }

    // Check localStorage institution_timetable for assigned classes
    const saved = localStorage.getItem("institution_timetable");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const targetId = (facultyId || "").trim().toLowerCase();
          let currentFacultyName = "";
          try {
            const userObj = JSON.parse(localStorage.getItem("currentUser") || "{}");
            if (userObj && userObj.role === "faculty") {
              currentFacultyName = (userObj.name || "").trim().toLowerCase();
            }
          } catch {}

          const matched = parsed.filter((c) => {
            const cFacId = (c.facultyId || c.faculty_id || "").trim().toLowerCase();
            const cFacName = (c.facultyName || c.faculty_name || "").trim().toLowerCase();
            return (
              cFacId === targetId ||
              (currentFacultyName && cFacName === currentFacultyName) ||
              (targetId && cFacName.includes(targetId))
            );
          });

          return matched.map((c) => ({
            id: c.id || `cls-${c.code}`,
            code: c.code,
            icon: c.icon || (c.code ? c.code.slice(0, 2) : "CL"),
            name: c.name,
            facultyId: c.facultyId || c.faculty_id || facultyId,
            facultyName: c.facultyName || c.faculty_name || "Faculty Member",
            day: c.day || "Monday",
            time: c.time || c.time_slot || "10:00 AM - 11:00 AM",
            room: c.room || "Room 301",
            semester: String(c.semester || "5"),
            section: c.section || "A",
            students: c.students || 45,
          }));
        }
      } catch {}
    }
    return [];
  },


  async startSession(classData, facultyId) {
    try {
      return await fetchAPI("/api/faculty/session/start", {
        method: "POST",
        body: JSON.stringify({
          subject_code: classData.code,
          subject_name: classData.name,
          faculty_id: facultyId,
          room: classData.room,
          expires_in_seconds: 60,
        }),
      });
    } catch {
      const id = "SESSION-" + Date.now();
      return {
        sessionId: id,
        subject: classData.name,
        code: classData.code,
        facultyId: facultyId,
        room: classData.room,
        expiresIn: 60,
      };
    }
  },

  async stopSession(sessionId) {
    try {
      return await fetchAPI("/api/faculty/session/stop", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch {
      return { message: "Session stopped locally." };
    }
  },

  async getReports(facultyId) {
    try {
      return await fetchAPI(`/api/faculty/${encodeURIComponent(facultyId || "FAC001")}/reports`);
    } catch {
      return {
        facultyId,
        students: [
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
        ],
      };
    }
  },
};

export const attendanceAPI = {
  async verifyFace(data) {
    return await fetchAPI("/api/attendance/verify-face", {
      method: "POST",
      body: JSON.stringify({
        student_id: data.student_id,
        selfie_image: data.selfie_image,
        burst_frames: data.burst_frames || [],
        liveness_challenge: data.liveness_challenge || null,
      }),
    });
  },

  async enrollFace(data) {
    return await fetchAPI("/api/attendance/enroll-face", {
      method: "POST",
      body: JSON.stringify({
        student_id: data.student_id,
        face_image: data.face_image,
        face_images: data.face_images || undefined,
      }),
    });
  },

  async verifyAndMarkAttendance(data) {
    try {
      return await fetchAPI("/api/attendance/verify", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn("[AttendanceAPI] Verify attendance error:", err.message);
      // If server returned an explicit rejection (e.g. expired QR, session ended, invalid code), throw immediately!
      throw err;
    }
  },

  async getStudentHistory(studentId) {
    try {
      return await fetchAPI(`/api/attendance/student/${encodeURIComponent(studentId)}`);
    } catch {
      const records = JSON.parse(localStorage.getItem(`attendance_${studentId}`) || "[]");
      const attended = records.filter((r) => r.status === "Present").length;
      const total = records.length;
      const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
      return {
        studentId,
        overallPercentage: pct,
        classesPresent: attended,
        classesAbsent: total - attended,
        totalClasses: total,
        history: records,
      };
    }
  },

  async getStudentAllottedClasses(studentId, preferredSem = null, preferredSec = null) {
    // Determine student's semester and section
    let studentSem = preferredSem ? String(preferredSem) : "";
    let studentSec = preferredSec || "";

    try {
      const curUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      if (!studentSem && curUser && curUser.semester) studentSem = String(curUser.semester);
      if (!studentSec && curUser && curUser.section) studentSec = curUser.section;
    } catch {}

    if (!studentSem) studentSem = "7";
    if (!studentSec) studentSec = "A";

    try {
      const queryParams = new URLSearchParams({ semester: studentSem, section: studentSec }).toString();
      const res = await fetchAPI(`/api/attendance/student/${encodeURIComponent(studentId || "1AY23CS011")}/allotted-classes?${queryParams}`);
      if (Array.isArray(res) && res.length > 0) {
        return res;
      }
    } catch (e) {
      console.warn("Could not fetch student allotted classes from backend:", e.message);
    }

    // Fallback: check localStorage institution_timetable
    const saved = localStorage.getItem("institution_timetable");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter matching semester
          const matched = parsed.filter((c) => String(c.semester || "") === String(studentSem));
          if (matched.length > 0) {
            return matched.map((c) => ({
              id: c.id || `cls-${c.code}`,
              code: c.code,
              name: c.name,
              facultyName: c.facultyName || c.faculty_name || "Faculty Member",
              day: c.day || "Monday",
              time: c.time || c.time_slot || "10:00 AM - 11:00 AM",
              room: c.room || "Room 301",
              semester: String(c.semester || studentSem),
              section: c.section || studentSec || "A",
              students: c.students || 45,
              icon: c.code ? c.code.slice(0, 2) : "CL",
            }));
          }
        }
      } catch {}
    }

    // Canonical 25-slot weekly schedule for SEMESTER 7
    const scheduleSem7 = [
      // MONDAY
      { code: "CS701", name: "Machine Learning", facultyName: "Banu Prasad", day: "Monday", time: "09:00 AM - 10:00 AM", room: "Room 301" },
      { code: "CS702", name: "Cloud Computing", facultyName: "Shiva", day: "Monday", time: "10:00 AM - 11:00 AM", room: "Room 301" },
      { code: "CS703", name: "Software Project Management", facultyName: "Rohit", day: "Monday", time: "11:15 AM - 12:15 PM", room: "Room 301" },
      { code: "CS704", name: "AI & ML", facultyName: "Banu Prasad", day: "Monday", time: "12:15 PM - 01:15 PM", room: "Room 301" },
      { code: "CS705", name: "ML Lab", facultyName: "Shiva", day: "Monday", time: "02:00 PM - 04:00 PM", room: "AI Lab" },

      // TUESDAY
      { code: "CS702", name: "Cloud Computing", facultyName: "Shiva", day: "Tuesday", time: "09:00 AM - 10:00 AM", room: "Room 301" },
      { code: "CS701", name: "Machine Learning", facultyName: "Banu Prasad", day: "Tuesday", time: "10:00 AM - 11:00 AM", room: "Room 301" },
      { code: "CS704", name: "AI & ML", facultyName: "Banu Prasad", day: "Tuesday", time: "11:15 AM - 12:15 PM", room: "Room 301" },
      { code: "CS703", name: "Software Project Management", facultyName: "Rohit", day: "Tuesday", time: "12:15 PM - 01:15 PM", room: "Room 301" },
      { code: "CS706", name: "Cloud Lab", facultyName: "Shiva", day: "Tuesday", time: "02:00 PM - 04:00 PM", room: "Cloud Lab" },

      // WEDNESDAY
      { code: "CS704", name: "AI & ML", facultyName: "Banu Prasad", day: "Wednesday", time: "09:00 AM - 10:00 AM", room: "Room 301" },
      { code: "CS703", name: "Software Project Management", facultyName: "Rohit", day: "Wednesday", time: "10:00 AM - 11:00 AM", room: "Room 301" },
      { code: "CS702", name: "Cloud Computing", facultyName: "Shiva", day: "Wednesday", time: "11:15 AM - 12:15 PM", room: "Room 301" },
      { code: "CS701", name: "Machine Learning", facultyName: "Banu Prasad", day: "Wednesday", time: "12:15 PM - 01:15 PM", room: "Room 301" },
      { code: "CS707", name: "Project Work", facultyName: "Banu Prasad", day: "Wednesday", time: "02:00 PM - 04:00 PM", room: "Room 301" },

      // THURSDAY
      { code: "CS701", name: "Machine Learning", facultyName: "Banu Prasad", day: "Thursday", time: "09:00 AM - 10:00 AM", room: "Room 301" },
      { code: "CS704", name: "AI & ML", facultyName: "Banu Prasad", day: "Thursday", time: "10:00 AM - 11:00 AM", room: "Room 301" },
      { code: "CS701", name: "Machine Learning", facultyName: "Banu Prasad", day: "Thursday", time: "11:15 AM - 12:15 PM", room: "Room 301" },
      { code: "CS702", name: "Cloud Computing", facultyName: "Shiva", day: "Thursday", time: "12:15 PM - 01:15 PM", room: "Room 301" },
      { code: "CS708", name: "AI Lab", facultyName: "Shiva", day: "Thursday", time: "02:00 PM - 04:00 PM", room: "AI Lab" },

      // FRIDAY
      { code: "CS702", name: "Cloud Computing", facultyName: "Shiva", day: "Friday", time: "09:00 AM - 10:00 AM", room: "Room 301" },
      { code: "CS701", name: "Machine Learning", facultyName: "Banu Prasad", day: "Friday", time: "10:00 AM - 11:00 AM", room: "Room 301" },
      { code: "CS703", name: "Software Project Management", facultyName: "Rohit", day: "Friday", time: "11:15 AM - 12:15 PM", room: "Room 301" },
      { code: "CS704", name: "AI & ML", facultyName: "Banu Prasad", day: "Friday", time: "12:15 PM - 01:15 PM", room: "Room 301" },
      { code: "CS705", name: "ML Lab", facultyName: "Shiva", day: "Friday", time: "02:00 PM - 04:00 PM", room: "AI Lab" },
    ];

    // Canonical 25-slot weekly schedule for SEMESTER 5
    const scheduleSem5 = [
      // MONDAY
      { code: "CS501", name: "Database Management Systems", facultyName: "Dr. Ramesh Sharma", day: "Monday", time: "09:00 AM - 10:00 AM", room: "Room 201" },
      { code: "CS502", name: "Computer Networks", facultyName: "Prof. Vikram Sen", day: "Monday", time: "10:00 AM - 11:00 AM", room: "Room 201" },
      { code: "CS503", name: "Web Technology", facultyName: "Dr. Ananya Roy", day: "Monday", time: "11:15 AM - 12:15 PM", room: "Room 201" },
      { code: "CS504", name: "Operating Systems", facultyName: "Prof. Suresh Nair", day: "Monday", time: "12:15 PM - 01:15 PM", room: "Room 201" },
      { code: "CS505", name: "DBMS & Networks Lab", facultyName: "Dr. Ramesh Sharma", day: "Monday", time: "02:00 PM - 04:00 PM", room: "Database Lab 2" },

      // TUESDAY
      { code: "CS502", name: "Computer Networks", facultyName: "Prof. Vikram Sen", day: "Tuesday", time: "09:00 AM - 10:00 AM", room: "Room 201" },
      { code: "CS501", name: "Database Management Systems", facultyName: "Dr. Ramesh Sharma", day: "Tuesday", time: "10:00 AM - 11:00 AM", room: "Room 201" },
      { code: "CS504", name: "Operating Systems", facultyName: "Prof. Suresh Nair", day: "Tuesday", time: "11:15 AM - 12:15 PM", room: "Room 201" },
      { code: "CS506", name: "Software Engineering", facultyName: "Prof. Arvind Menon", day: "Tuesday", time: "12:15 PM - 01:15 PM", room: "Room 201" },
      { code: "CS507", name: "Web Tech Lab", facultyName: "Dr. Ananya Roy", day: "Tuesday", time: "02:00 PM - 04:00 PM", room: "Lab 3" },

      // WEDNESDAY
      { code: "CS504", name: "Operating Systems", facultyName: "Prof. Suresh Nair", day: "Wednesday", time: "09:00 AM - 10:00 AM", room: "Room 201" },
      { code: "CS506", name: "Software Engineering", facultyName: "Prof. Arvind Menon", day: "Wednesday", time: "10:00 AM - 11:00 AM", room: "Room 201" },
      { code: "CS502", name: "Computer Networks", facultyName: "Prof. Vikram Sen", day: "Wednesday", time: "11:15 AM - 12:15 PM", room: "Room 201" },
      { code: "CS501", name: "Database Management Systems", facultyName: "Dr. Ramesh Sharma", day: "Wednesday", time: "12:15 PM - 01:15 PM", room: "Room 201" },
      { code: "CS505", name: "DBMS & Networks Lab", facultyName: "Dr. Ramesh Sharma", day: "Wednesday", time: "02:00 PM - 04:00 PM", room: "Database Lab 2" },

      // THURSDAY
      { code: "CS501", name: "Database Management Systems", facultyName: "Dr. Ramesh Sharma", day: "Thursday", time: "09:00 AM - 10:00 AM", room: "Room 201" },
      { code: "CS504", name: "Operating Systems", facultyName: "Prof. Suresh Nair", day: "Thursday", time: "10:00 AM - 11:00 AM", room: "Room 201" },
      { code: "CS501", name: "Database Management Systems", facultyName: "Dr. Ramesh Sharma", day: "Thursday", time: "11:15 AM - 12:15 PM", room: "Room 201" },
      { code: "CS502", name: "Computer Networks", facultyName: "Prof. Vikram Sen", day: "Thursday", time: "12:15 PM - 01:15 PM", room: "Room 201" },
      { code: "CS507", name: "Web Tech Lab", facultyName: "Dr. Ananya Roy", day: "Thursday", time: "02:00 PM - 04:00 PM", room: "Lab 3" },

      // FRIDAY
      { code: "CS502", name: "Computer Networks", facultyName: "Prof. Vikram Sen", day: "Friday", time: "09:00 AM - 10:00 AM", room: "Room 201" },
      { code: "CS501", name: "Database Management Systems", facultyName: "Dr. Ramesh Sharma", day: "Friday", time: "10:00 AM - 11:00 AM", room: "Room 201" },
      { code: "CS506", name: "Software Engineering", facultyName: "Prof. Arvind Menon", day: "Friday", time: "11:15 AM - 12:15 PM", room: "Room 201" },
      { code: "CS504", name: "Operating Systems", facultyName: "Prof. Suresh Nair", day: "Friday", time: "12:15 PM - 01:15 PM", room: "Room 201" },
      { code: "CS505", name: "DBMS & Networks Lab", facultyName: "Dr. Ramesh Sharma", day: "Friday", time: "02:00 PM - 04:00 PM", room: "Database Lab 2" },
    ];

    const activeList = String(studentSem) === "5" ? scheduleSem5 : scheduleSem7;

    return activeList.map((s, idx) => ({
      id: `cls-${idx + 1}`,
      code: s.code,
      name: s.name,
      facultyName: s.facultyName,
      day: s.day,
      time: s.time,
      room: s.room,
      semester: String(studentSem),
      section: studentSec,
      students: 45,
      icon: s.code.slice(0, 2),
    }));
  },
};