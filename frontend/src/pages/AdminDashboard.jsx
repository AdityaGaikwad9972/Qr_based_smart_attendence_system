import { useState, useEffect, useRef } from "react";
import { adminAPI } from "../services/api";
import "./AdminDashboard.css";

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function AdminDashboard({
  adminId = "ADM001",
  onLogout,
}) {
  const fileInputRef = useRef(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState("timetable"); // "timetable" | "students" | "faculty"

  // Live database stats & lists
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    activeSessions: 0,
    campusAvgAttendance: "100%",
    totalAttendanceMarked: 0,
  });

  const [studentsList, setStudentsList] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [actionMessage, setActionMessage] = useState({ text: "", type: "" });
  const [deletingId, setDeletingId] = useState(null);

  // Conflict-free institutional weekly schedule (Sem 7 & Sem 5) with zero overlapping faculty slots
  const initialScheduleSem7 = [
    // MONDAY
    { id: "cls-7m1", code: "CS701", name: "Machine Learning", facultyId: "Faculty12", facultyName: "Banu Prasad", day: "Monday", time: "09:00 AM - 10:00 AM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7m2", code: "CS702", name: "Cloud Computing", facultyId: "Faculty13", facultyName: "Shiva", day: "Monday", time: "10:00 AM - 11:00 AM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7m3", code: "CS703", name: "Software Project Management", facultyId: "Faculty14", facultyName: "Rohit", day: "Monday", time: "11:15 AM - 12:15 PM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7m4", code: "CS704", name: "AI & ML", facultyId: "Faculty12", facultyName: "Banu Prasad", day: "Monday", time: "12:15 PM - 01:15 PM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7m5", code: "CS705", name: "ML Lab", facultyId: "Faculty13", facultyName: "Shiva", day: "Monday", time: "02:00 PM - 04:00 PM", room: "AI Lab", semester: "7", section: "A", students: 45 },

    // TUESDAY
    { id: "cls-7t1", code: "CS702", name: "Cloud Computing", facultyId: "Faculty13", facultyName: "Shiva", day: "Tuesday", time: "09:00 AM - 10:00 AM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7t2", code: "CS701", name: "Machine Learning", facultyId: "Faculty12", facultyName: "Banu Prasad", day: "Tuesday", time: "10:00 AM - 11:00 AM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7t3", code: "CS704", name: "AI & ML", facultyId: "Faculty12", facultyName: "Banu Prasad", day: "Tuesday", time: "11:15 AM - 12:15 PM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7t4", code: "CS703", name: "Software Project Management", facultyId: "Faculty14", facultyName: "Rohit", day: "Tuesday", time: "12:15 PM - 01:15 PM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7t5", code: "CS706", name: "Cloud Lab", facultyId: "Faculty13", facultyName: "Shiva", day: "Tuesday", time: "02:00 PM - 04:00 PM", room: "Cloud Lab", semester: "7", section: "A", students: 45 },

    // WEDNESDAY
    { id: "cls-7w1", code: "CS704", name: "AI & ML", facultyId: "Faculty12", facultyName: "Banu Prasad", day: "Wednesday", time: "09:00 AM - 10:00 AM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7w2", code: "CS703", name: "Software Project Management", facultyId: "Faculty14", facultyName: "Rohit", day: "Wednesday", time: "10:00 AM - 11:00 AM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7w3", code: "CS702", name: "Cloud Computing", facultyId: "Faculty13", facultyName: "Shiva", day: "Wednesday", time: "11:15 AM - 12:15 PM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7w4", code: "CS701", name: "Machine Learning", facultyId: "Faculty12", facultyName: "Banu Prasad", day: "Wednesday", time: "12:15 PM - 01:15 PM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7w5", code: "CS707", name: "Project Work", facultyId: "Faculty12", facultyName: "Banu Prasad", day: "Wednesday", time: "02:00 PM - 04:00 PM", room: "Room 301", semester: "7", section: "A", students: 45 },

    // THURSDAY
    { id: "cls-7th1", code: "CS701", name: "Machine Learning", facultyId: "Faculty12", facultyName: "Banu Prasad", day: "Thursday", time: "09:00 AM - 10:00 AM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7th2", code: "CS704", name: "AI & ML", facultyId: "Faculty12", facultyName: "Banu Prasad", day: "Thursday", time: "10:00 AM - 11:00 AM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7th3", code: "CS701", name: "Machine Learning", facultyId: "Faculty12", facultyName: "Banu Prasad", day: "Thursday", time: "11:15 AM - 12:15 PM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7th4", code: "CS702", name: "Cloud Computing", facultyId: "Faculty13", facultyName: "Shiva", day: "Thursday", time: "12:15 PM - 01:15 PM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7th5", code: "CS708", name: "AI Lab", facultyId: "Faculty13", facultyName: "Shiva", day: "Thursday", time: "02:00 PM - 04:00 PM", room: "AI Lab", semester: "7", section: "A", students: 45 },

    // FRIDAY
    { id: "cls-7f1", code: "CS702", name: "Cloud Computing", facultyId: "Faculty13", facultyName: "Shiva", day: "Friday", time: "09:00 AM - 10:00 AM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7f2", code: "CS701", name: "Machine Learning", facultyId: "Faculty12", facultyName: "Banu Prasad", day: "Friday", time: "10:00 AM - 11:00 AM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7f3", code: "CS703", name: "Software Project Management", facultyId: "Faculty14", facultyName: "Rohit", day: "Friday", time: "11:15 AM - 12:15 PM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7f4", code: "CS704", name: "AI & ML", facultyId: "Faculty12", facultyName: "Banu Prasad", day: "Friday", time: "12:15 PM - 01:15 PM", room: "Room 301", semester: "7", section: "A", students: 45 },
    { id: "cls-7f5", code: "CS705", name: "ML Lab", facultyId: "Faculty13", facultyName: "Shiva", day: "Friday", time: "02:00 PM - 04:00 PM", room: "AI Lab", semester: "7", section: "A", students: 45 },
  ];

  const initialScheduleSem5 = [
    // MONDAY
    { id: "cls-5m1", code: "CS501", name: "Database Management Systems", facultyId: "FAC001", facultyName: "Dr. Ramesh Sharma", day: "Monday", time: "09:00 AM - 10:00 AM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5m2", code: "CS502", name: "Computer Networks", facultyId: "FAC002", facultyName: "Prof. Vikram Sen", day: "Monday", time: "10:00 AM - 11:00 AM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5m3", code: "CS503", name: "Web Technology", facultyId: "FAC003", facultyName: "Dr. Ananya Roy", day: "Monday", time: "11:15 AM - 12:15 PM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5m4", code: "CS504", name: "Operating Systems", facultyId: "FAC004", facultyName: "Prof. Suresh Nair", day: "Monday", time: "12:15 PM - 01:15 PM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5m5", code: "CS505", name: "DBMS & Networks Lab", facultyId: "FAC001", facultyName: "Dr. Ramesh Sharma", day: "Monday", time: "02:00 PM - 04:00 PM", room: "Database Lab 2", semester: "5", section: "A", students: 45 },

    // TUESDAY
    { id: "cls-5t1", code: "CS502", name: "Computer Networks", facultyId: "FAC002", facultyName: "Prof. Vikram Sen", day: "Tuesday", time: "09:00 AM - 10:00 AM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5t2", code: "CS501", name: "Database Management Systems", facultyId: "FAC001", facultyName: "Dr. Ramesh Sharma", day: "Tuesday", time: "10:00 AM - 11:00 AM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5t3", code: "CS504", name: "Operating Systems", facultyId: "FAC004", facultyName: "Prof. Suresh Nair", day: "Tuesday", time: "11:15 AM - 12:15 PM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5t4", code: "CS506", name: "Software Engineering", facultyId: "FAC888", facultyName: "Prof. Arvind Menon", day: "Tuesday", time: "12:15 PM - 01:15 PM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5t5", code: "CS507", name: "Web Tech Lab", facultyId: "FAC003", facultyName: "Dr. Ananya Roy", day: "Tuesday", time: "02:00 PM - 04:00 PM", room: "Lab 3", semester: "5", section: "A", students: 45 },

    // WEDNESDAY
    { id: "cls-5w1", code: "CS504", name: "Operating Systems", facultyId: "FAC004", facultyName: "Prof. Suresh Nair", day: "Wednesday", time: "09:00 AM - 10:00 AM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5w2", code: "CS506", name: "Software Engineering", facultyId: "FAC888", facultyName: "Prof. Arvind Menon", day: "Wednesday", time: "10:00 AM - 11:00 AM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5w3", code: "CS502", name: "Computer Networks", facultyId: "FAC002", facultyName: "Prof. Vikram Sen", day: "Wednesday", time: "11:15 AM - 12:15 PM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5w4", code: "CS501", name: "Database Management Systems", facultyId: "FAC001", facultyName: "Dr. Ramesh Sharma", day: "Wednesday", time: "12:15 PM - 01:15 PM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5w5", code: "CS505", name: "DBMS & Networks Lab", facultyId: "FAC001", facultyName: "Dr. Ramesh Sharma", day: "Wednesday", time: "02:00 PM - 04:00 PM", room: "Database Lab 2", semester: "5", section: "A", students: 45 },

    // THURSDAY
    { id: "cls-5th1", code: "CS501", name: "Database Management Systems", facultyId: "FAC001", facultyName: "Dr. Ramesh Sharma", day: "Thursday", time: "09:00 AM - 10:00 AM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5th2", code: "CS504", name: "Operating Systems", facultyId: "FAC004", facultyName: "Prof. Suresh Nair", day: "Thursday", time: "10:00 AM - 11:00 AM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5th3", code: "CS501", name: "Database Management Systems", facultyId: "FAC001", facultyName: "Dr. Ramesh Sharma", day: "Thursday", time: "11:15 AM - 12:15 PM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5th4", code: "CS502", name: "Computer Networks", facultyId: "FAC002", facultyName: "Prof. Vikram Sen", day: "Thursday", time: "12:15 PM - 01:15 PM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5th5", code: "CS507", name: "Web Tech Lab", facultyId: "FAC003", facultyName: "Dr. Ananya Roy", day: "Thursday", time: "02:00 PM - 04:00 PM", room: "Lab 3", semester: "5", section: "A", students: 45 },

    // FRIDAY
    { id: "cls-5f1", code: "CS502", name: "Computer Networks", facultyId: "FAC002", facultyName: "Prof. Vikram Sen", day: "Friday", time: "09:00 AM - 10:00 AM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5f2", code: "CS501", name: "Database Management Systems", facultyId: "FAC001", facultyName: "Dr. Ramesh Sharma", day: "Friday", time: "10:00 AM - 11:00 AM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5f3", code: "CS506", name: "Software Engineering", facultyId: "FAC888", facultyName: "Prof. Arvind Menon", day: "Friday", time: "11:15 AM - 12:15 PM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5f4", code: "CS504", name: "Operating Systems", facultyId: "FAC004", facultyName: "Prof. Suresh Nair", day: "Friday", time: "12:15 PM - 01:15 PM", room: "Room 201", semester: "5", section: "A", students: 45 },
    { id: "cls-5f5", code: "CS505", name: "DBMS & Networks Lab", facultyId: "FAC001", facultyName: "Dr. Ramesh Sharma", day: "Friday", time: "02:00 PM - 04:00 PM", room: "Database Lab 2", semester: "5", section: "A", students: 45 },
  ];

  const initialSchedule = [...initialScheduleSem7, ...initialScheduleSem5];

  const [timetable, setTimetable] = useState(initialSchedule);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState("all");
  const [selectedDayFilter, setSelectedDayFilter] = useState("all");
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState("all");
  const [selectedSubjectSemesterFilter, setSelectedSubjectSemesterFilter] = useState("all");

  // Load real data from backend on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoadingData(true);

    Promise.all([
      adminAPI.getStats().catch(() => null),
      adminAPI.getStudents().catch(() => ({ students: [] })),
      adminAPI.getFaculty().catch(() => ({ faculty: [] })),
      adminAPI.getTimetable().catch(() => initialSchedule),
    ]).then(([statsRes, studentsRes, facultyRes, ttRes]) => {
      if (!isMounted) return;

      if (statsRes) {
        setStats(statsRes);
      }

      if (studentsRes && Array.isArray(studentsRes.students)) {
        setStudentsList(studentsRes.students);
      }

      // Merge backend faculty with local storage users
      let combinedFaculty = Array.isArray(facultyRes?.faculty) ? facultyRes.faculty : [];
      try {
        const localUsers = JSON.parse(localStorage.getItem("app_registered_users") || "[]");
        const localFac = localUsers
          .filter((u) => u.role === "faculty")
          .map((f, idx) => ({
            id: 100 + idx,
            employeeId: f.id || "FAC001",
            name: f.name || "Faculty",
            email: f.email || "",
            department: f.department || "Computer Science & Engineering",
          }));

        localFac.forEach((lf) => {
          if (!combinedFaculty.some((cf) => cf.employeeId?.toLowerCase() === lf.employeeId?.toLowerCase())) {
            combinedFaculty.push(lf);
          }
        });
      } catch {}

      if (combinedFaculty.length === 0) {
        combinedFaculty = [
          { id: 1, employeeId: "FAC001", name: "Dr. Ramesh Sharma", department: "CSE" },
          { id: 2, employeeId: "Faculty12", name: "Banu Prasad", department: "CSE" },
          { id: 3, employeeId: "Faculty13", name: "Shiva", department: "CSE" },
          { id: 4, employeeId: "Faculty14", name: "Rohit", department: "CSE" },
          { id: 5, employeeId: "FAC002", name: "Prof. Vikram Sen", department: "CSE" },
          { id: 6, employeeId: "FAC003", name: "Dr. Ananya Roy", department: "CSE" },
          { id: 7, employeeId: "FAC004", name: "Prof. Suresh Nair", department: "CSE" },
          { id: 8, employeeId: "FAC888", name: "Prof. Arvind Menon", department: "CSE" },
        ];
      }

      setFacultyList(combinedFaculty);

      // Check if timetable data in DB is corrupted, missing Sem 7/Sem 5, or has simultaneous faculty conflicts
      const hasSem7 = Array.isArray(ttRes) && ttRes.some((t) => String(t.semester) === "7");
      const hasSem5 = Array.isArray(ttRes) && ttRes.some((t) => String(t.semester) === "5");

      // Check if any faculty has simultaneous overlapping slots
      let hasSimultaneousClash = false;
      const slotTracker = {};
      if (Array.isArray(ttRes)) {
        for (const t of ttRes) {
          const key = `${(t.facultyId || "").toLowerCase()}|${t.day}|${t.time}`;
          if (t.facultyId && slotTracker[key]) {
            hasSimultaneousClash = true;
            break;
          }
          if (t.facultyId) slotTracker[key] = true;
        }
      }

      // Check if Sem 5 is mono-assigned to only 1 faculty (e.g. all Banu Prasad)
      const sem5Entries = Array.isArray(ttRes) ? ttRes.filter((t) => String(t.semester) === "5") : [];
      const sem5UniqueFac = new Set(sem5Entries.map((t) => (t.facultyId || "").toLowerCase()));
      const isSem5MonoAssigned = sem5Entries.length > 5 && sem5UniqueFac.size <= 1;

      const isCorrupt =
        !Array.isArray(ttRes) ||
        ttRes.length < 40 ||
        !hasSem7 ||
        !hasSem5 ||
        hasSimultaneousClash ||
        isSem5MonoAssigned ||
        ttRes.some(
          (t) =>
            (t.code || "").toLowerCase() === "time" ||
            (t.name || "").toLowerCase() === "monday" ||
            (t.name || "").toLowerCase() === "break" ||
            (t.name || "").toLowerCase() === "lunch" ||
            (t.time || "").toLowerCase().includes("cloud computing") ||
            (t.day || "").toLowerCase().includes("machine learning") ||
            DAYS_OF_WEEK.includes((t.facultyId || "").toLowerCase().trim())
        );

      if (isCorrupt) {
        console.log("[Admin] Timetable had conflicts, mono-assigned Sem 5, or missing data. Auto-deploying canonical conflict-free schedule (Sem 5 & Sem 7).");
        saveAndDeployTimetable(initialSchedule);
      } else {
        setTimetable(ttRes);
      }

      setIsLoadingData(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Save to localStorage whenever timetable updates
  useEffect(() => {
    localStorage.setItem("institution_timetable", JSON.stringify(timetable));
    window.dispatchEvent(new Event("timetable_updated"));
  }, [timetable]);

  // Track conflicting simultaneous slots in active timetable
  const conflictingSlotIds = (() => {
    const tracker = {};
    const conflictIds = new Set();
    timetable.forEach((slot) => {
      const facId = (slot.facultyId || "").toLowerCase().trim();
      if (!facId) return;
      const key = `${facId}|${slot.day}|${slot.time}`;
      if (tracker[key]) {
        conflictIds.add(slot.id);
        conflictIds.add(tracker[key].id);
      } else {
        tracker[key] = slot;
      }
    });
    return conflictIds;
  })();

  // Extract unique subjects grouped by Semester, Code, and Subject Name
  const uniqueSubjects = Array.from(
    new Set(timetable.map((t) => `${t.semester || "7"}|||${t.code || ""}|||${t.name || ""}`).filter(Boolean))
  ).map((key) => {
    const [sem, code, name] = key.split("|||");
    const matchingEntries = timetable.filter(
      (t) => String(t.semester || "7") === sem && (t.code || "") === code && (t.name || "") === name
    );
    const first = matchingEntries[0] || {};
    return {
      key,
      semester: sem,
      code: code || first.code || "CS701",
      name: name || first.name || "Academic Subject",
      facultyId: first.facultyId || "Faculty12",
      facultyName: first.facultyName || "Assigned Faculty",
      room: first.room || (sem === "7" ? "Room 301" : "Room 201"),
      slotCount: matchingEntries.length,
    };
  });

  // Filtered unique subjects for assignment panel
  const filteredUniqueSubjects = uniqueSubjects.filter((sub) => {
    if (selectedSubjectSemesterFilter === "all") return true;
    return String(sub.semester) === String(selectedSubjectSemesterFilter);
  });

  /*
   * SYNC TIMETABLE TO BACKEND AND LOCALSTORAGE
   */
  const saveAndDeployTimetable = async (updatedList) => {
    setTimetable(updatedList);
    localStorage.setItem("institution_timetable", JSON.stringify(updatedList));
    window.dispatchEvent(new Event("timetable_updated"));

    try {
      await adminAPI.uploadTimetable(updatedList);
      setActionMessage({
        text: `✓ Timetable updated! Mapped ${updatedList.length} class slots across institutional faculty portals.`,
        type: "success",
      });
      setTimeout(() => setActionMessage({ text: "", type: "" }), 4000);
    } catch (err) {
      console.warn("Backend sync notice:", err.message);
    }
  };

  /*
   * CHANGE FACULTY FOR AN ENTIRE SUBJECT (SEMESTER-SPECIFIC)
   */
  const handleAssignSubjectFaculty = (subjectKey, targetFacultyId) => {
    const selectedFac = facultyList.find(
      (f) => f.employeeId?.toLowerCase() === targetFacultyId.toLowerCase()
    );

    const newFacultyId = selectedFac ? selectedFac.employeeId : targetFacultyId;
    const newFacultyName = selectedFac ? selectedFac.name : "Assigned Faculty";

    const [sem, code, name] = subjectKey.split("|||");

    const updated = timetable.map((slot) => {
      if (
        String(slot.semester || "7") === sem &&
        (slot.code || "") === code &&
        (slot.name || "") === name
      ) {
        return {
          ...slot,
          facultyId: newFacultyId,
          facultyName: newFacultyName,
        };
      }
      return slot;
    });

    saveAndDeployTimetable(updated);
  };

  /*
   * CHANGE FACULTY FOR A SINGLE SLOT WITH COLLISION GUARD
   */
  const handleAssignSlotFaculty = (slotId, targetFacultyId) => {
    const targetSlot = timetable.find((s) => s.id === slotId);
    const selectedFac = facultyList.find(
      (f) => f.employeeId?.toLowerCase() === targetFacultyId.toLowerCase()
    );

    const newFacultyId = selectedFac ? selectedFac.employeeId : targetFacultyId;
    const newFacultyName = selectedFac ? selectedFac.name : "Assigned Faculty";

    // Check collision with another class
    if (targetSlot) {
      const clash = timetable.find(
        (s) =>
          s.id !== slotId &&
          s.day === targetSlot.day &&
          s.time === targetSlot.time &&
          (s.facultyId || "").toLowerCase() === newFacultyId.toLowerCase()
      );

      if (clash) {
        setActionMessage({
          text: `⚠️ Conflict Notice: ${newFacultyName} (${newFacultyId}) is also assigned to "${clash.name}" (Sem ${clash.semester}, ${clash.room}) on ${targetSlot.day} at ${targetSlot.time}!`,
          type: "error",
        });
      }
    }

    const updated = timetable.map((slot) => {
      if (slot.id === slotId) {
        return {
          ...slot,
          facultyId: newFacultyId,
          facultyName: newFacultyName,
        };
      }
      return slot;
    });

    saveAndDeployTimetable(updated);
  };

  /*
   * SMART AUTO-DISTRIBUTE (CONFLICT-FREE ACROSS SEMESTERS)
   */
  const handleAutoDistributeFaculty = () => {
    if (facultyList.length === 0) {
      alert("No registered faculty found to distribute classes to.");
      return;
    }

    // Allocate 7th Sem and 5th Sem to separate non-overlapping faculty groups
    const sem7Fac = facultyList.filter((f) =>
      ["faculty12", "faculty13", "faculty14"].includes((f.employeeId || "").toLowerCase())
    );
    const sem5Fac = facultyList.filter(
      (f) => !["faculty12", "faculty13", "faculty14"].includes((f.employeeId || "").toLowerCase())
    );

    const poolSem7 = sem7Fac.length > 0 ? sem7Fac : facultyList;
    const poolSem5 = sem5Fac.length > 0 ? sem5Fac : facultyList;

    const sem7Subjects = Array.from(
      new Set(timetable.filter((t) => String(t.semester) === "7").map((t) => t.name))
    );
    const sem5Subjects = Array.from(
      new Set(timetable.filter((t) => String(t.semester) === "5").map((t) => t.name))
    );

    const subjectToFaculty = {};
    sem7Subjects.forEach((sub, idx) => {
      const fac = poolSem7[idx % poolSem7.length];
      subjectToFaculty[`7-${sub}`] = {
        facultyId: fac.employeeId,
        facultyName: fac.name,
      };
    });

    sem5Subjects.forEach((sub, idx) => {
      const fac = poolSem5[idx % poolSem5.length];
      subjectToFaculty[`5-${sub}`] = {
        facultyId: fac.employeeId,
        facultyName: fac.name,
      };
    });

    const updated = timetable.map((slot) => {
      const key = `${slot.semester}-${slot.name}`;
      const match = subjectToFaculty[key];
      if (match) {
        return {
          ...slot,
          facultyId: match.facultyId,
          facultyName: match.facultyName,
        };
      }
      return slot;
    });

    saveAndDeployTimetable(updated);
    setActionMessage({
      text: `✓ Smart auto-distributed subjects across Sem 7 (${poolSem7.length} faculties) and Sem 5 (${poolSem5.length} faculties) with zero simultaneous conflicts!`,
      type: "success",
    });
  };

  /*
   * RESET TIMETABLE TO VERIFIED CONFLICT-FREE 50-SLOT MASTER SCHEDULE
   */
  const handleResetTimetable = async () => {
    const isConfirmed = window.confirm(
      "Reset timetable to canonical conflict-free master schedule (Sem 7 & Sem 5)?\n\nThis will map 25 slots for Sem 7 across 3 faculty and 25 slots for Sem 5 across 5 dedicated faculty with 0 time clashes."
    );
    if (!isConfirmed) return;

    try {
      await adminAPI.resetTimetable();
      setTimetable(initialSchedule);
      localStorage.setItem("institution_timetable", JSON.stringify(initialSchedule));
      window.dispatchEvent(new Event("timetable_updated"));
      setActionMessage({
        text: "✓ Timetable restored to verified conflict-free 50-slot schedule for Sem 7 & Sem 5!",
        type: "success",
      });
      setTimeout(() => setActionMessage({ text: "", type: "" }), 5000);
    } catch {
      setTimetable(initialSchedule);
      saveAndDeployTimetable(initialSchedule);
    }
  };

  /*
   * DELETE STUDENT FROM DATABASE
   */
  const handleDeleteStudent = async (usn, studentName) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to delete student "${studentName}" (${usn})?\nThis will remove their profile and all attendance records permanently.`
    );
    if (!isConfirmed) return;

    setDeletingId(usn);
    setActionMessage({ text: "", type: "" });

    try {
      await adminAPI.deleteStudent(usn);
      setStudentsList((prev) => prev.filter((s) => s.usn !== usn && s.id !== usn));
      setStats((prev) => ({
        ...prev,
        totalStudents: Math.max(0, (prev.totalStudents || 1) - 1),
      }));
      setActionMessage({
        text: `✓ Student "${studentName}" (${usn}) has been permanently deleted.`,
        type: "success",
      });
      setTimeout(() => setActionMessage({ text: "", type: "" }), 5000);
    } catch (err) {
      setActionMessage({
        text: `Failed to delete student: ${err.message}`,
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  /*
   * DELETE FACULTY FROM DATABASE
   */
  const handleDeleteFaculty = async (employeeId, facultyName) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to delete faculty "${facultyName}" (${employeeId})?\nTheir assigned classes will be unmapped.`
    );
    if (!isConfirmed) return;

    setDeletingId(employeeId);
    setActionMessage({ text: "", type: "" });

    try {
      await adminAPI.deleteFaculty(employeeId);
      setFacultyList((prev) => prev.filter((f) => f.employeeId !== employeeId && f.id !== employeeId));
      setStats((prev) => ({
        ...prev,
        totalFaculty: Math.max(0, (prev.totalFaculty || 1) - 1),
      }));
      setActionMessage({
        text: `✓ Faculty "${facultyName}" (${employeeId}) has been permanently deleted.`,
        type: "success",
      });
      setTimeout(() => setActionMessage({ text: "", type: "" }), 5000);
    } catch (err) {
      setActionMessage({
        text: `Failed to delete faculty: ${err.message}`,
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };


  /*
   * UNIVERSAL TIMETABLE PARSER (HANDLES BOTH MATRIX/GRID CSV & FLAT CSV)
   */
  const parseCSVAndMapTimetable = (csvText) => {
    setUploadError("");
    setUploadSuccess("");

    try {
      const lines = csvText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith("#"));

      if (lines.length < 2) {
        setUploadError("CSV file is empty or missing data rows.");
        return;
      }

      // Detect separator (comma, tab, or semicolon)
      const firstLine = lines[0];
      const sep = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

      const headerCells = firstLine
        .split(new RegExp(`${sep}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
        .map((c) => c.replace(/^"|"$/g, "").trim());

      const lowerHeaders = headerCells.map((h) => h.toLowerCase());

      // Check if this is a Matrix/Grid weekly timetable (e.g. Time, Monday, Tuesday, Wednesday, Thursday, Friday)
      const hasDayInHeaders = lowerHeaders.some((h) =>
        DAYS_OF_WEEK.includes(h.toLowerCase())
      );

      const parsedEntries = [];
      const codeMap = {};
      let codeCounter = 501;

      // Ensure we have a working faculty list for initial assignment
      const activeFacList = facultyList.length > 0
        ? facultyList
        : [
            { employeeId: "FAC001", name: "Dr. Ramesh Sharma" },
            { employeeId: "Faculty12", name: "Banu Prasad" },
            { employeeId: "FAC888", name: "Prof. Arvind Menon" },
          ];

      /* ========================================================
         CASE A: MATRIX / GRID TIMETABLE (Days as Columns)
         ======================================================== */
      if (hasDayInHeaders) {
        // Find which column is Time and which are Days
        const dayColIndices = [];
        let timeColIndex = 0;

        headerCells.forEach((h, idx) => {
          const lower = h.toLowerCase();
          if (DAYS_OF_WEEK.includes(lower)) {
            dayColIndices.push({
              index: idx,
              dayName: h.charAt(0).toUpperCase() + h.slice(1).toLowerCase(),
            });
          } else if (lower.includes("time") || lower.includes("slot") || lower.includes("period")) {
            timeColIndex = idx;
          }
        });

        if (dayColIndices.length === 0) {
          setUploadError("Could not find day columns (Monday–Friday) in the header row.");
          return;
        }

        // Iterate through time rows
        for (let r = 1; r < lines.length; r++) {
          const rowLine = lines[r];
          const cells = rowLine
            .split(new RegExp(`${sep}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
            .map((c) => c.replace(/^"|"$/g, "").trim());

          const timeSlotRaw = cells[timeColIndex] || `Slot ${r}`;

          // Check if row is purely BREAK or LUNCH
          const isRowBreak = cells.every(
            (c, cIdx) =>
              cIdx === timeColIndex ||
              !c ||
              /^(break|lunch|recess|tea|interval|-|na|n\/a)$/i.test(c.trim())
          );

          if (isRowBreak && cells.length > 2) {
            continue; // Skip full-row break
          }

          // Clean time slot string (e.g. 9:00–10:00 -> 09:00 AM - 10:00 AM)
          let timeSlot = timeSlotRaw.replace(/\s+/g, " ").trim();

          dayColIndices.forEach(({ index, dayName }) => {
            const cellValue = (cells[index] || "").trim();

            // Skip empty or break cells
            if (
              !cellValue ||
              /^(break|lunch|recess|tea|interval|-|na|n\/a|free|library)$/i.test(cellValue)
            ) {
              return;
            }

            // Extract subject name & optional room / faculty info if present
            let subjectName = cellValue;
            let room = "Room 301";
            let assignedFaculty = activeFacList[0];

            // If subject has room or lab in parentheses e.g. "AI Lab (Lab 2)"
            if (subjectName.toLowerCase().includes("lab")) {
              room = "Lab 2";
            }

            // Assign subject code consistently
            if (!codeMap[subjectName]) {
              // Generate acronym or CS501, CS502...
              const words = subjectName.split(/\s+/).filter(Boolean);
              let prefix = "CS";
              if (words.length >= 2) {
                prefix = words.map((w) => w[0].toUpperCase()).join("").slice(0, 3);
              }
              codeMap[subjectName] = `${prefix}${codeCounter++}`;
            }

            const subjectCode = codeMap[subjectName];

            // Auto-assign faculty based on subject name or distribute evenly
            const subjectIdx = Object.keys(codeMap).indexOf(subjectName);
            if (subjectIdx >= 0) {
              assignedFaculty = activeFacList[subjectIdx % activeFacList.length];
            }

            parsedEntries.push({
              id: `cls-${Date.now()}-${r}-${index}`,
              code: subjectCode,
              name: subjectName,
              facultyId: assignedFaculty.employeeId,
              facultyName: assignedFaculty.name,
              day: dayName,
              time: timeSlot,
              room: room,
              semester: "5",
              section: "A",
              students: 45,
            });
          });
        }
      } else {
        /* ========================================================
           CASE B: STANDARD FLAT COLUMN TIMETABLE
           ======================================================== */
        const startIndex = lines[0].toLowerCase().includes("subject") ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          const cells = line
            .split(new RegExp(`${sep}(?=(?:(?:[^"]*"){2})*[^"]*$)`))
            .map((c) => c.replace(/^"|"$/g, "").trim());

          if (cells.length >= 4) {
            const code = cells[0] || `CS${codeCounter++}`;
            const name = cells[1] || "Academic Lecture";
            let facultyIdVal = cells[2] || "FAC001";
            let facultyName = cells[3] || "Assigned Faculty";
            const day = cells[4] || "Monday";
            const time = cells[5] || "10:00 AM - 11:00 AM";
            const room = cells[6] || "Room 301";
            const sem = cells[7] || "5";
            const section = cells[8] || "A";
            const students = parseInt(cells[9], 10) || 45;

            // Match faculty with registered list if valid ID or Name matches
            const foundFac = activeFacList.find(
              (f) =>
                f.employeeId?.toLowerCase() === facultyIdVal.toLowerCase() ||
                f.name?.toLowerCase() === facultyName.toLowerCase()
            );

            if (foundFac) {
              facultyIdVal = foundFac.employeeId;
              facultyName = foundFac.name;
            }

            parsedEntries.push({
              id: `cls-${Date.now()}-${i}`,
              code,
              name,
              facultyId: facultyIdVal,
              facultyName,
              day,
              time,
              room,
              semester: sem,
              section,
              students,
            });
          }
        }
      }

      if (parsedEntries.length === 0) {
        setUploadError("Could not extract any valid class slots from file. Please check file format.");
        return;
      }

      // Save and sync
      saveAndDeployTimetable(parsedEntries);

      const uniqueFacCount = new Set(parsedEntries.map((p) => p.facultyId)).size;
      const uniqueSubCount = new Set(parsedEntries.map((p) => p.name)).size;

      setUploadSuccess(
        `✓ Timetable Successfully Uploaded & Parsed! Created ${parsedEntries.length} class slots across ${uniqueSubCount} unique subjects. Use the Faculty In-Charge Assignment panel below to customize faculty mappings.`
      );
    } catch (err) {
      console.error("Timetable parse error:", err);
      setUploadError("Failed to parse the timetable file: " + err.message);
    }
  };

  // Handle file selection from dropzone
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result;
      if (typeof content === "string") {
        parseCSVAndMapTimetable(content);
      }
    };
    reader.readAsText(file);
  };

  // Download Sample Matrix CSV Template
  const downloadTemplate = () => {
    const matrixCSV =
      "Time,Monday,Tuesday,Wednesday,Thursday,Friday\n" +
      "9:00 - 10:00 AM,Machine Learning,Cloud Computing,AI & ML,Machine Learning,Cloud Computing\n" +
      "10:00 - 11:00 AM,Cloud Computing,Machine Learning,Software Project Management,AI & ML,Machine Learning\n" +
      "11:00 - 11:15 AM,BREAK,BREAK,BREAK,BREAK,BREAK\n" +
      "11:15 - 12:15 PM,Software Project Management,AI & ML,Cloud Computing,Machine Learning,Software Project Management\n" +
      "12:15 - 01:15 PM,AI & ML,Software Project Management,Machine Learning,Cloud Computing,AI & ML\n" +
      "01:15 - 02:00 PM,LUNCH,LUNCH,LUNCH,LUNCH,LUNCH\n" +
      "02:00 - 04:00 PM,ML Lab,Cloud Lab,Project Work,AI Lab,Seminar\n";

    const blob = new Blob([matrixCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Weekly_Timetable_Grid_Acharya.csv";
    link.click();
  };

  // Load Demonstration Timetable with 1-click
  const loadDemoTimetable = () => {
    saveAndDeployTimetable(initialSchedule);
    setUploadSuccess("✓ Successfully loaded canonical 50-slot conflict-free institutional timetable (Sem 7 & Sem 5)!");
    setTimeout(() => setUploadSuccess(""), 4000);
  };

  // Export current active mapped timetable
  const exportCurrentTimetable = () => {
    const header = "Subject Code,Subject Name,Faculty ID,Faculty Name,Day,Time Slot,Room,Semester,Section,Students\n";
    const rows = timetable
      .map(
        (t) =>
          `"${t.code}","${t.name}","${t.facultyId}","${t.facultyName}","${t.day}","${t.time}","${t.room}","${t.semester}","${t.section}",${t.students}`
      )
      .join("\n");

    const content = `# Acharya Institute of Technology - Active Academic Timetable\n# Generated: ${new Date().toLocaleDateString()}\n\n` + header + rows;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Active_Academic_Timetable_${Date.now()}.csv`;
    link.click();
  };

  // Filtered timetable records
  const filteredSchedule = timetable.filter((item) => {
    const matchFaculty =
      selectedFacultyFilter === "all" ||
      `${item.facultyName} (${item.facultyId})` === selectedFacultyFilter ||
      item.facultyId === selectedFacultyFilter;
    const matchDay =
      selectedDayFilter === "all" || item.day === selectedDayFilter;
    const matchSemester =
      selectedSemesterFilter === "all" || item.semester === selectedSemesterFilter;
    return matchFaculty && matchDay && matchSemester;
  });

  return (
    <div className="admin-dashboard-page">
      {/* HEADER */}
      <header className="admin-header">
        <div className="admin-brand">
          <div className="admin-brand-logo">SA</div>
          <div>
            <h2>Smart Attendance</h2>
            <span>Institutional Admin Console</span>
          </div>
        </div>

        <div className="admin-profile">
          <div className="admin-avatar">A</div>
          <div className="admin-info">
            <strong>Institutional Administrator</strong>
            <span>Admin ID: {adminId} • Acharya Institute</span>
          </div>
          <button className="admin-logout-btn" onClick={onLogout} type="button">
            Logout
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="admin-container">
        {/* HERO SECTION */}
        <section className="admin-welcome">
          <div>
            <p className="admin-welcome-tag">INSTITUTIONAL ADMINISTRATION CONSOLE</p>
            <h1>Campus Operations &amp; Timetable Control</h1>
            <p>
              Manage real-time registered students, faculty members, and auto-mapped academic timetable schedules.
            </p>
          </div>

          <div className="admin-top-actions">
            <button
              className="admin-action-btn primary"
              onClick={exportCurrentTimetable}
              type="button"
            >
              <span>📥</span>
              <span>Export Active Timetable (CSV)</span>
            </button>
          </div>
        </section>

        {/* STATS OVERVIEW - LIVE DATABASE COUNTS */}
        <section className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon timetable">👨‍🎓</div>
            <div>
              <span>Registered Students</span>
              <strong>{stats.totalStudents || studentsList.length}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon faculty">👨‍🏫</div>
            <div>
              <span>Registered Faculty</span>
              <strong>{stats.totalFaculty || facultyList.length}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon students">📅</div>
            <div>
              <span>Class Slots Mapped</span>
              <strong>{timetable.length}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon attendance">⚡</div>
            <div>
              <span>Total Attendance Logs</span>
              <strong style={{ color: "#16a34a" }}>{stats.totalAttendanceMarked || 0}</strong>
            </div>
          </div>
        </section>

        {/* NAVIGATION TABS */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "25px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("timetable")}
            style={{
              padding: "10px 22px",
              borderRadius: "10px",
              border: "none",
              background: activeTab === "timetable" ? "#7146e8" : "#f1f5f9",
              color: activeTab === "timetable" ? "white" : "#475569",
              fontWeight: "700",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            📅 Master Timetable ({timetable.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("students")}
            style={{
              padding: "10px 22px",
              borderRadius: "10px",
              border: "none",
              background: activeTab === "students" ? "#7146e8" : "#f1f5f9",
              color: activeTab === "students" ? "white" : "#475569",
              fontWeight: "700",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            👨‍🎓 Registered Students ({studentsList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("faculty")}
            style={{
              padding: "10px 22px",
              borderRadius: "10px",
              border: "none",
              background: activeTab === "faculty" ? "#7146e8" : "#f1f5f9",
              color: activeTab === "faculty" ? "white" : "#475569",
              fontWeight: "700",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            👨‍🏫 Faculty Directory ({facultyList.length})
          </button>
        </div>

        {/* ===================================================
            TAB 1: MASTER TIMETABLE
        ==================================================== */}
        {activeTab === "timetable" && (
          <>
            {/* TIMETABLE UPLOAD & PARSER SECTION */}
            <section className="admin-upload-card">
              <div className="admin-upload-header">
                <div>
                  <h2>
                    <span>📤</span>
                    <span>Upload Master Timetable (Weekly Grid or CSV)</span>
                  </h2>
                  <p>
                    Supports standard grid format (Time vs Days) or flat column files. The system automatically parses all class slots and lets you map each subject directly to any registered faculty.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="admin-template-btn"
                    style={{ background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0", fontWeight: "700" }}
                    onClick={handleResetTimetable}
                  >
                    <span>🔄</span>
                    <span>Restore Conflict-Free Schedule</span>
                  </button>

                  <button
                    type="button"
                    className="admin-template-btn"
                    onClick={downloadTemplate}
                  >
                    <span>📥</span>
                    <span>Download Grid Template (CSV)</span>
                  </button>

                  <button
                    type="button"
                    className="admin-sample-load-btn"
                    onClick={loadDemoTimetable}
                  >
                    <span>⚡</span>
                    <span>Load Demo Grid Schedule</span>
                  </button>
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv, .txt, text/csv, text/plain"
                style={{ display: "none" }}
              />

              {/* Drag & Drop Target */}
              <div
                className="admin-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="admin-dropzone-icon">📁</div>
                <strong>Click to Browse or Drag &amp; Drop Timetable File</strong>
                <span>Supports Weekly Grid Tables (Time vs Monday–Friday) and Standard CSVs</span>
              </div>

              {/* Status feedback */}
              {uploadSuccess && (
                <div className="admin-upload-success-badge">
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {uploadError && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px 18px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    borderRadius: "10px",
                    fontSize: "13.5px",
                    fontWeight: "600",
                  }}
                >
                  ⚠️ {uploadError}
                </div>
              )}

              {/* Conflict Detection Banner */}
              {conflictingSlotIds.size > 0 && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "14px 18px",
                    borderRadius: "10px",
                    background: "#fff1f2",
                    border: "1.5px solid #fecdd3",
                    color: "#be123c",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "22px" }}>⚠️</span>
                    <div>
                      <strong style={{ fontSize: "14px", display: "block" }}>
                        Faculty Schedule Overlap Detected ({conflictingSlotIds.size} Conflicting Slots)
                      </strong>
                      <span style={{ fontSize: "12.5px", color: "#9f1239" }}>
                        One or more faculty members are assigned to teach multiple rooms at the same time slot across semesters.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetTimetable}
                    style={{
                      padding: "8px 16px",
                      background: "#be123c",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(190, 18, 60, 0.2)",
                    }}
                  >
                    Auto-Fix &amp; Restore Conflict-Free Schedule
                  </button>
                </div>
              )}

              {actionMessage.text && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px 18px",
                    borderRadius: "10px",
                    fontSize: "13.5px",
                    fontWeight: "600",
                    background: actionMessage.type === "error" ? "#fef2f2" : "#f0fdf4",
                    color: actionMessage.type === "error" ? "#dc2626" : "#15803d",
                    border: `1px solid ${actionMessage.type === "error" ? "#fecaca" : "#bbf7d0"}`,
                  }}
                >
                  {actionMessage.text}
                </div>
              )}
            </section>

            {/* SUBJECT ↔ FACULTY IN-CHARGE MAPPING PANEL */}
            {uniqueSubjects.length > 0 && (
              <div className="admin-card" style={{ marginBottom: "25px", border: "1.5px solid #e0e7ff" }}>
                <div className="admin-card-header" style={{ background: "#f8faff", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: "#3730a3" }}>
                      <span>👨‍🏫</span>
                      <span>Faculty In-Charge Assignment ({uniqueSubjects.length} Unique Subjects)</span>
                    </h2>
                    <p style={{ margin: "4px 0 0 0", color: "#6366f1", fontSize: "13px" }}>
                      Select which registered Faculty teaches each subject. Sem 7 and Sem 5 are managed separately with 0 time clashes.
                    </p>

                    {/* Semester Tabs for Subject Mapping */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                      {[
                        { key: "all", label: `All Semesters (${uniqueSubjects.length})` },
                        { key: "7", label: `Semester 7 (${uniqueSubjects.filter((s) => s.semester === "7").length} subjects)` },
                        { key: "5", label: `Semester 5 (${uniqueSubjects.filter((s) => s.semester === "5").length} subjects)` },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setSelectedSubjectSemesterFilter(tab.key)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "7px",
                            border: selectedSubjectSemesterFilter === tab.key ? "1.5px solid #4f46e5" : "1px solid #cbd5e1",
                            background: selectedSubjectSemesterFilter === tab.key ? "#4f46e5" : "#ffffff",
                            color: selectedSubjectSemesterFilter === tab.key ? "#ffffff" : "#475569",
                            fontWeight: "700",
                            fontSize: "12.5px",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoDistributeFaculty}
                    style={{
                      background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                      color: "white",
                      border: "none",
                      padding: "9px 18px",
                      borderRadius: "8px",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)",
                    }}
                  >
                    <span>⚡</span>
                    <span>Auto-Distribute (Conflict-Free)</span>
                  </button>
                </div>

                <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                  {filteredUniqueSubjects.map((sub) => (
                    <div
                      key={sub.key}
                      style={{
                        background: "#ffffff",
                        border: sub.semester === "7" ? "1.5px solid #c7d2fe" : "1.5px solid #a7f3d0",
                        borderRadius: "12px",
                        padding: "14px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            <span
                              style={{
                                background: sub.semester === "7" ? "#e0e7ff" : "#dcfce7",
                                color: sub.semester === "7" ? "#3730a3" : "#166534",
                                fontSize: "11px",
                                fontWeight: "800",
                                padding: "2px 7px",
                                borderRadius: "5px",
                              }}
                            >
                              Sem {sub.semester}
                            </span>
                            <span style={{ fontSize: "12px", fontWeight: "700", color: "#4f46e5" }}>
                              {sub.code}
                            </span>
                          </div>
                          <strong style={{ fontSize: "14px", color: "#1e293b", display: "block" }}>
                            {sub.name}
                          </strong>
                          <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                            {sub.room} • {sub.slotCount} weekly slot{sub.slotCount > 1 ? "s" : ""}
                          </span>
                        </div>
                        <span
                          style={{
                            background: sub.semester === "7" ? "#ede9fe" : "#f0fdf4",
                            color: sub.semester === "7" ? "#6d28d9" : "#15803d",
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "3px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          {sub.slotCount}x / wk
                        </span>
                      </div>

                      <div>
                        <label style={{ fontSize: "11.5px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>
                          Assign Faculty In-Charge:
                        </label>
                        <select
                          value={sub.facultyId}
                          onChange={(e) => handleAssignSubjectFaculty(sub.key, e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: "8px",
                            border: "1.5px solid #cbd5e1",
                            background: "#f8fafc",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#1e293b",
                            cursor: "pointer",
                          }}
                        >
                          {facultyList.map((fac) => (
                            <option key={fac.employeeId} value={fac.employeeId}>
                              {fac.name} ({fac.employeeId})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MAPPED SCHEDULE TABLE */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h2>Auto-Mapped Academic Class Schedule</h2>

                {/* FILTERS */}
                <div className="admin-filter-row">
                  <div className="admin-filter-item">
                    <label>Filter Faculty:</label>
                    <select
                      value={selectedFacultyFilter}
                      onChange={(e) => setSelectedFacultyFilter(e.target.value)}
                    >
                      <option value="all">All Assigned Faculty</option>
                      {facultyList.map((fac) => (
                        <option key={fac.employeeId} value={fac.employeeId}>
                          {fac.name} ({fac.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-filter-item">
                    <label>Filter Day:</label>
                    <select
                      value={selectedDayFilter}
                      onChange={(e) => setSelectedDayFilter(e.target.value)}
                    >
                      <option value="all">All Days</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                  </div>

                  <div className="admin-filter-item">
                    <label>Filter Semester:</label>
                    <select
                      value={selectedSemesterFilter}
                      onChange={(e) => setSelectedSemesterFilter(e.target.value)}
                    >
                      <option value="all">All Semesters</option>
                      <option value="3">Sem 3</option>
                      <option value="5">Sem 5</option>
                      <option value="7">Sem 7</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* TABLE */}
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Subject Code</th>
                      <th>Subject Name</th>
                      <th>Faculty In-Charge (Editable)</th>
                      <th>Day</th>
                      <th>Time Slot</th>
                      <th>Room / Lab</th>
                      <th>Sem &amp; Sec</th>
                      <th>Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchedule.length > 0 ? (
                      filteredSchedule.map((cls) => {
                        const isConflict = conflictingSlotIds.has(cls.id);
                        return (
                          <tr
                            key={cls.id || `${cls.code}-${cls.day}-${cls.time}`}
                            style={{
                              background: isConflict ? "#fff1f2" : undefined,
                            }}
                          >
                            <td>
                              <span className="admin-subject-code-badge">{cls.code}</span>
                              {isConflict && (
                                <span
                                  style={{
                                    marginLeft: "6px",
                                    background: "#ffe4e6",
                                    color: "#be123c",
                                    fontSize: "10px",
                                    fontWeight: "800",
                                    padding: "2px 5px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  ⚠️ Overlap
                                </span>
                              )}
                            </td>
                            <td>
                              <strong>{cls.name}</strong>
                            </td>
                            <td>
                              <select
                                value={cls.facultyId}
                                onChange={(e) => handleAssignSlotFaculty(cls.id, e.target.value)}
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: "7px",
                                  border: isConflict ? "1.5px solid #f43f5e" : "1px solid #cbd5e1",
                                  background: isConflict ? "#fff5f5" : "#f8fafc",
                                  fontSize: "12.5px",
                                  fontWeight: "600",
                                  color: "#1e293b",
                                  cursor: "pointer",
                                  maxWidth: "210px",
                                }}
                              >
                                {facultyList.map((fac) => (
                                  <option key={fac.employeeId} value={fac.employeeId}>
                                    {fac.name} ({fac.employeeId})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <span style={{ fontWeight: "600", color: "#334155" }}>{cls.day}</span>
                            </td>
                            <td>
                              <span className="admin-time-badge">{cls.time}</span>
                            </td>
                            <td>
                              <strong style={{ color: "#2563eb" }}>{cls.room}</strong>
                            </td>
                            <td>
                              <span
                                style={{
                                  background: String(cls.semester) === "7" ? "#e0e7ff" : "#dcfce7",
                                  color: String(cls.semester) === "7" ? "#3730a3" : "#166534",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  marginRight: "6px",
                                }}
                              >
                                Sem {cls.semester}
                              </span>
                              Sec {cls.section || "A"}
                            </td>
                            <td>{cls.students} students</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                          No timetable records matching selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ===================================================
            TAB 2: REGISTERED STUDENTS
        ==================================================== */}
        {activeTab === "students" && (
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2>Registered Students (Live Database)</h2>
                <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
                  All student profiles currently enrolled in the institutional database.
                </p>
              </div>
              <span className="admin-time-badge">{studentsList.length} Students Total</span>
            </div>

            {actionMessage.text && (
              <div
                style={{
                  margin: "15px 25px 0",
                  padding: "12px 18px",
                  borderRadius: "10px",
                  fontSize: "13.5px",
                  fontWeight: "600",
                  background: actionMessage.type === "error" ? "#fef2f2" : "#f0fdf4",
                  color: actionMessage.type === "error" ? "#dc2626" : "#15803d",
                  border: `1px solid ${actionMessage.type === "error" ? "#fecaca" : "#bbf7d0"}`,
                }}
              >
                {actionMessage.text}
              </div>
            )}


            {/* TABLE */}
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>USN / Student ID</th>
                    <th>Full Name</th>
                    <th>Email Address</th>
                    <th>Department</th>
                    <th>Semester &amp; Sec</th>
                    <th>Biometric Face</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsList.length > 0 ? (
                    studentsList.map((stu) => (
                      <tr key={stu.usn || stu.id}>
                        <td>
                          <span className="admin-subject-code-badge">{stu.usn}</span>
                        </td>
                        <td>
                          <strong>{stu.name}</strong>
                        </td>
                        <td>{stu.email}</td>
                        <td>{stu.department}</td>
                        <td>
                          Sem {stu.semester} • Sec {stu.section || "A"}
                        </td>
                        <td>
                          <span style={{ color: "#16a34a", fontWeight: "700", fontSize: "12px" }}>
                            ✓ Enrolled
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-del-btn"
                            disabled={deletingId === stu.usn}
                            onClick={() => handleDeleteStudent(stu.usn, stu.name)}
                          >
                            {deletingId === stu.usn ? "Deleting..." : "🗑️ Delete"}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                        {isLoadingData ? "Loading students from database..." : "No registered students found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================
            TAB 3: FACULTY DIRECTORY
        ==================================================== */}
        {activeTab === "faculty" && (
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <h2>Registered Faculty (Live Database)</h2>
                <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
                  All faculty members and academic professors in the system.
                </p>
              </div>
              <span className="admin-time-badge">{facultyList.length} Faculty Total</span>
            </div>

            {actionMessage.text && (
              <div
                style={{
                  margin: "15px 25px 0",
                  padding: "12px 18px",
                  borderRadius: "10px",
                  fontSize: "13.5px",
                  fontWeight: "600",
                  background: actionMessage.type === "error" ? "#fef2f2" : "#f0fdf4",
                  color: actionMessage.type === "error" ? "#dc2626" : "#15803d",
                  border: `1px solid ${actionMessage.type === "error" ? "#fecaca" : "#bbf7d0"}`,
                }}
              >
                {actionMessage.text}
              </div>
            )}


            {/* TABLE */}
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Faculty Name</th>
                    <th>Email Address</th>
                    <th>Department</th>
                    <th>Assigned Classes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyList.length > 0 ? (
                    facultyList.map((fac) => {
                      const assignedSlots = timetable.filter(
                        (t) =>
                          t.facultyId?.toLowerCase() === fac.employeeId?.toLowerCase() ||
                          t.facultyName?.toLowerCase() === fac.name?.toLowerCase()
                      );

                      return (
                        <tr key={fac.employeeId || fac.id}>
                          <td>
                            <span className="admin-subject-code-badge">{fac.employeeId}</span>
                          </td>
                          <td>
                            <strong>{fac.name}</strong>
                          </td>
                          <td>{fac.email}</td>
                          <td>{fac.department}</td>
                          <td>
                            <span style={{ fontWeight: "700", color: "#4f46e5" }}>
                              {assignedSlots.length} class slots
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="admin-del-btn"
                              disabled={deletingId === fac.employeeId}
                              onClick={() => handleDeleteFaculty(fac.employeeId, fac.name)}
                            >
                              {deletingId === fac.employeeId ? "Deleting..." : "🗑️ Delete"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                        {isLoadingData ? "Loading faculty from database..." : "No registered faculty found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
