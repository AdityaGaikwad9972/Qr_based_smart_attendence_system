const express = require("express");
const router = express.Router();
const { db } = require("../src/db");
const { hashPassword, verifyPassword, createAccessToken } = require("../src/security");
const { computeEmbeddings } = require("../src/ml_verifier");

/**
 * POST /api/auth/register
 * Register Student, Faculty, or Admin user
 */
router.post("/register", async (req, res) => {
  const { name, email, password, role, id, semester, department, section, face_image, face_images } = req.body;

  if (!email || !password || !name || !role || !id) {
    return res.status(400).json({ detail: "Name, email, password, role, and ID are required." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanId = id.trim();
  const cleanRole = role.trim().toUpperCase();

  // 1. Check if email already registered
  const existingUser = db.prepare("SELECT id FROM users WHERE LOWER(email) = ?").get(cleanEmail);
  if (existingUser) {
    return res.status(409).json({ detail: "Email address is already registered." });
  }

  // 2. Check role ID uniqueness
  if (cleanRole === "STUDENT") {
    const existingStu = db.prepare("SELECT id FROM students WHERE LOWER(usn) = ?").get(cleanId.toLowerCase());
    if (existingStu) {
      return res.status(409).json({ detail: `Student USN ${cleanId} is already registered.` });
    }
  } else if (cleanRole === "FACULTY") {
    const existingFac = db.prepare("SELECT id FROM faculty WHERE LOWER(employee_id) = ?").get(cleanId.toLowerCase());
    if (existingFac) {
      return res.status(409).json({ detail: `Faculty ID ${cleanId} is already registered.` });
    }
  } else if (cleanRole === "ADMIN") {
    const existingAdm = db.prepare("SELECT id FROM admins WHERE LOWER(admin_id) = ?").get(cleanId.toLowerCase());
    if (existingAdm) {
      return res.status(409).json({ detail: `Admin ID ${cleanId} is already registered.` });
    }
  }

  try {
    const now = new Date().toISOString();
    // 3. Create User in users table
    const insertUser = db.prepare(`
      INSERT INTO users (full_name, email, password_hash, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(name.trim(), cleanEmail, hashPassword(password), cleanRole, now, now);

    const userId = Number(insertUser.lastInsertRowid);

    // 4. Create Role Profile
    if (cleanRole === "STUDENT") {
      const semVal = semester && !isNaN(semester) ? parseInt(semester, 10) : 5;
      // Use first image from face_images array, or fall back to face_image
      const allFaceImages = (face_images && Array.isArray(face_images) && face_images.length > 0) ? face_images : (face_image ? [face_image] : []);
      const primaryFaceImage = allFaceImages.length > 0 ? allFaceImages[0] : null;

      const stuResult = db.prepare(`
        INSERT INTO students (user_id, usn, department, semester, section, face_image)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        cleanId,
        department || "Computer Science & Engineering",
        semVal,
        section || "A",
        primaryFaceImage
      );

      const studentDbId = Number(stuResult.lastInsertRowid);

      // Store all face images and compute embeddings if multiple images provided
      if (allFaceImages.length > 0) {
        try {
          // Compute SFace embeddings for all face images
          const embResult = await computeEmbeddings(allFaceImages);
          const embeddings = embResult.embeddings || [];

          const insertEmb = db.prepare(`
            INSERT INTO face_embeddings (student_id, face_image, embedding)
            VALUES (?, ?, ?)
          `);

          for (let i = 0; i < allFaceImages.length; i++) {
            const embJson = (embeddings[i] && Array.isArray(embeddings[i])) ? JSON.stringify(embeddings[i]) : null;
            insertEmb.run(studentDbId, allFaceImages[i], embJson);
          }

          console.log(`[Auth] Stored ${allFaceImages.length} face images with ${embResult.successful || 0} embeddings for ${cleanId}`);
        } catch (embErr) {
          console.warn(`[Auth] Embedding computation warning for ${cleanId}:`, embErr.message);
          // Still store images without embeddings as fallback
          const insertEmb = db.prepare(`
            INSERT INTO face_embeddings (student_id, face_image, embedding)
            VALUES (?, ?, ?)
          `);
          for (const img of allFaceImages) {
            insertEmb.run(studentDbId, img, null);
          }
        }
      }
    } else if (cleanRole === "FACULTY") {
      db.prepare(`
        INSERT INTO faculty (user_id, employee_id, department)
        VALUES (?, ?, ?)
      `).run(
        userId,
        cleanId,
        department || "Computer Science & Engineering"
      );
    } else if (cleanRole === "ADMIN") {
      db.prepare(`
        INSERT INTO admins (user_id, admin_id, department)
        VALUES (?, ?, ?)
      `).run(
        userId,
        cleanId,
        department || "Administration"
      );
    }

    const token = createAccessToken(userId, cleanRole);

    const allFaceImagesForResponse = (face_images && Array.isArray(face_images) && face_images.length > 0) ? face_images : (face_image ? [face_image] : []);

    return res.status(201).json({
      message: `Successfully registered as ${cleanRole}`,
      access_token: token,
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        role: cleanRole,
        identifier: cleanId,
        department: department || (cleanRole === "ADMIN" ? "Administration" : "Computer Science & Engineering"),
        semester: semester || 5,
        section: section || "A",
        has_face_registered: allFaceImagesForResponse.length > 0,
        face_image: allFaceImagesForResponse[0] || null,
        face_images_count: allFaceImagesForResponse.length,
      },
    });
  } catch (err) {
    console.error("[Auth] Registration error:", err);
    return res.status(500).json({ detail: `Registration failed: ${err.message}` });
  }
});

/**
 * POST /api/auth/login
 * Unified Login by Email, USN, Employee ID, or Admin ID
 */
router.post("/login", (req, res) => {
  const { identifier, password, role } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ detail: "Please provide both identifier and password." });
  }

  const ident = identifier.trim();

  // 1. Search by email
  let user = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get(ident.toLowerCase());

  // 2. Search by Student USN
  if (!user) {
    const stu = db.prepare("SELECT user_id FROM students WHERE LOWER(usn) = ?").get(ident.toLowerCase());
    if (stu) {
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(stu.user_id);
    }
  }

  // 3. Search by Faculty Employee ID
  if (!user) {
    const fac = db.prepare("SELECT user_id FROM faculty WHERE LOWER(employee_id) = ?").get(ident.toLowerCase());
    if (fac) {
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(fac.user_id);
    }
  }

  // 4. Search by Admin ID
  if (!user) {
    const adm = db.prepare("SELECT user_id FROM admins WHERE LOWER(admin_id) = ?").get(ident.toLowerCase());
    if (adm) {
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(adm.user_id);
    }
  }

  if (!user) {
    return res.status(401).json({ detail: "Invalid credentials. User not registered." });
  }

  // Verify Password
  if (!verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ detail: "Invalid password. Please try again." });
  }

  // Role Consistency Verification
  const userRole = (user.role || "").toUpperCase();
  if (role && role.trim().toUpperCase() !== userRole) {
    return res.status(401).json({
      detail: `Access denied: This account is registered as ${userRole}, not ${role.trim().toUpperCase()}.`,
    });
  }

  // Resolve Profile Info
  let userIdentifier = user.email;
  let hasFace = false;
  let faceImage = null;
  let department = "Computer Science & Engineering";
  let semester = 5;
  let section = "A";

  if (userRole === "STUDENT") {
    const stu = db.prepare("SELECT * FROM students WHERE user_id = ?").get(user.id);
    if (stu) {
      userIdentifier = stu.usn;
      hasFace = Boolean(stu.face_image);
      faceImage = stu.face_image;
      department = stu.department || department;
      semester = stu.semester || semester;
      section = stu.section || section;
    }
  } else if (userRole === "FACULTY") {
    const fac = db.prepare("SELECT * FROM faculty WHERE user_id = ?").get(user.id);
    if (fac) {
      userIdentifier = fac.employee_id;
      department = fac.department || department;
    }
  } else if (userRole === "ADMIN") {
    const adm = db.prepare("SELECT * FROM admins WHERE user_id = ?").get(user.id);
    if (adm) {
      userIdentifier = adm.admin_id;
      department = adm.department || "Administration";
    }
  }

  const token = createAccessToken(user.id, userRole);

  return res.json({
    access_token: token,
    token_type: "bearer",
    user: {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: userRole.toLowerCase(),
      identifier: userIdentifier,
      department,
      semester,
      section,
      has_face_registered: hasFace,
      face_image: faceImage,
    },
  });
});

/**
 * GET /api/auth/profile/:identifier
 * Retrieve profile by email or user ID
 */
router.get("/profile/:identifier", (req, res) => {
  const ident = req.params.identifier.trim();

  let user = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get(ident.toLowerCase());
  if (!user) {
    const stu = db.prepare("SELECT user_id FROM students WHERE LOWER(usn) = ?").get(ident.toLowerCase());
    if (stu) user = db.prepare("SELECT * FROM users WHERE id = ?").get(stu.user_id);
  }
  if (!user) {
    const fac = db.prepare("SELECT user_id FROM faculty WHERE LOWER(employee_id) = ?").get(ident.toLowerCase());
    if (fac) user = db.prepare("SELECT * FROM users WHERE id = ?").get(fac.user_id);
  }
  if (!user) {
    const adm = db.prepare("SELECT user_id FROM admins WHERE LOWER(admin_id) = ?").get(ident.toLowerCase());
    if (adm) user = db.prepare("SELECT * FROM users WHERE id = ?").get(adm.user_id);
  }

  if (!user) {
    return res.status(404).json({ detail: "User profile not found." });
  }

  const userRole = (user.role || "").toUpperCase();
  let userIdentifier = user.email;
  let department = "Computer Science & Engineering";
  let semester = 5;
  let section = "A";
  let faceImage = null;
  let hasFace = false;

  if (userRole === "STUDENT") {
    const stu = db.prepare("SELECT * FROM students WHERE user_id = ?").get(user.id);
    if (stu) {
      userIdentifier = stu.usn;
      department = stu.department || department;
      semester = stu.semester || semester;
      section = stu.section || section;
      faceImage = stu.face_image;
      hasFace = Boolean(faceImage);
    }
  } else if (userRole === "FACULTY") {
    const fac = db.prepare("SELECT * FROM faculty WHERE user_id = ?").get(user.id);
    if (fac) {
      userIdentifier = fac.employee_id;
      department = fac.department || department;
    }
  } else if (userRole === "ADMIN") {
    const adm = db.prepare("SELECT * FROM admins WHERE user_id = ?").get(user.id);
    if (adm) {
      userIdentifier = adm.admin_id;
      department = adm.department || "Administration";
    }
  }

  return res.json({
    id: user.id,
    name: user.full_name,
    email: user.email,
    role: userRole.toLowerCase(),
    identifier: userIdentifier,
    department,
    semester,
    section,
    has_face_registered: hasFace,
    face_image: faceImage,
  });
});

/**
 * POST /api/auth/enroll-face
 * Update registered face image
 */
router.post("/enroll-face", async (req, res) => {
  const { student_id, id, identifier, face_image, face_images } = req.body;
  const targetId = (student_id || id || identifier || "").trim();
  const allImages = (face_images && Array.isArray(face_images) && face_images.length > 0) ? face_images : (face_image ? [face_image] : []);

  if (!targetId || allImages.length === 0) {
    return res.status(400).json({ detail: "Student ID and at least one face_image are required." });
  }

  const stu = db.prepare("SELECT * FROM students WHERE LOWER(usn) = ?").get(targetId.toLowerCase());
  if (!stu) {
    return res.status(404).json({ detail: `Student with USN ${targetId} not found.` });
  }

  // Update primary face image
  db.prepare("UPDATE students SET face_image = ? WHERE id = ?").run(allImages[0], stu.id);

  // Clear old embeddings and store new ones
  db.prepare("DELETE FROM face_embeddings WHERE student_id = ?").run(stu.id);

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

    console.log(`[Auth] Enrolled ${allImages.length} face images with ${embResult.successful || 0} embeddings for ${targetId}`);
  } catch (embErr) {
    console.warn(`[Auth] Embedding computation warning for ${targetId}:`, embErr.message);
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

module.exports = router;
