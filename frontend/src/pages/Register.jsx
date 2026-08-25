import { useState, useRef, useEffect } from "react";
import { authAPI } from "../services/api";
import "./Register.css";

function Register({ initialRole = "student", onBackToLogin, onRegisterSuccess }) {
  const [role, setRole] = useState(initialRole); // "student" | "faculty" | "admin"

  // Common fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Role-specific ID fields
  const [adminId, setAdminId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [semester, setSemester] = useState("5");

  // Multi-Image Face Registration (5 photos)
  const POSE_STEPS = [
    { id: 0, label: "Look Straight", icon: "😐", instruction: "Look directly at the camera" },
    { id: 1, label: "Turn Left", icon: "👈", instruction: "Turn your head slightly to the left" },
    { id: 2, label: "Turn Right", icon: "👉", instruction: "Turn your head slightly to the right" },
    { id: 3, label: "Tilt Up", icon: "👆", instruction: "Tilt your head slightly upward" },
    { id: 4, label: "Smile", icon: "😊", instruction: "Smile naturally at the camera" },
  ];
  const REQUIRED_PHOTOS = POSE_STEPS.length;

  const [faceImages, setFaceImages] = useState([]); // Array of base64 images
  const [currentPoseStep, setCurrentPoseStep] = useState(0);
  const [camActive, setCamActive] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [camLoading, setCamLoading] = useState(false);
  const [captureCountdown, setCaptureCountdown] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const camFrameRef = useRef(null);

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Clean up camera stream on unmount or role switch
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [role]);

  /*
   * START CAMERA FOR FACE REGISTRATION
   */
  const startCamera = async (currentFacing = facingMode) => {
    try {
      setErrorMessage("");
      setCamLoading(true);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage("Camera access is not supported by your browser.");
        setCamLoading(false);
        return;
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: currentFacing },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      } catch {
        // Fallback for laptops/webcams without facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCamActive(true);
      setCamLoading(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Video auto-play warning:", playErr);
        }
      }
    } catch (err) {
      console.error("Face camera access error:", err);
      setCamActive(false);
      setCamLoading(false);

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Camera permission was denied. Please allow camera permissions in browser address bar.");
      } else if (err.name === "NotFoundError") {
        setErrorMessage("No camera found on this device.");
      } else {
        setErrorMessage("Unable to open camera. Please check your camera permissions.");
      }
    }
  };

  /*
   * STOP CAMERA
   */
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCamActive(false);
  };

  /*
   * TOGGLE FRONT / BACK CAMERA
   */
  const toggleFacing = () => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  /*
   * CAPTURE FACE WITH ACCURATE CENTER CROP (adds to multi-image array)
   */
  const captureFace = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const frame = camFrameRef.current;
    if (!video || !canvas) return;

    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;

    const frameWidth = frame ? frame.clientWidth : 320;
    const frameHeight = frame ? frame.clientHeight : 240;
    const frameAspect = frameWidth / frameHeight;
    const videoAspect = vWidth / vHeight;

    let sWidth = vWidth;
    let sHeight = vHeight;
    let sX = 0;
    let sY = 0;

    if (videoAspect > frameAspect) {
      sWidth = vHeight * frameAspect;
      sHeight = vHeight;
      sX = (vWidth - sWidth) / 2;
      sY = 0;
    } else {
      sWidth = vWidth;
      sHeight = vWidth / frameAspect;
      sX = 0;
      sY = (vHeight - sHeight) / 2;
    }

    const outputWidth = 480;
    const outputHeight = Math.round(480 / frameAspect);

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (facingMode === "user") {
      ctx.translate(outputWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      video,
      sX,
      sY,
      sWidth,
      sHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    const image = canvas.toDataURL("image/jpeg", 0.92);
    const newImages = [...faceImages, image];
    setFaceImages(newImages);

    if (newImages.length >= REQUIRED_PHOTOS) {
      // All photos captured — stop camera
      stopCamera();
    } else {
      // Advance to next pose step
      setCurrentPoseStep(newImages.length);
    }
  };

  /*
   * AUTO-CAPTURE with 3-second countdown
   */
  const startCountdownCapture = () => {
    let count = 3;
    setCaptureCountdown(count);
    const timer = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(timer);
        setCaptureCountdown(null);
        captureFace();
      } else {
        setCaptureCountdown(count);
      }
    }, 1000);
  };

  /*
   * RETAKE ALL FACE PHOTOS
   */
  const retakeAllFaces = () => {
    setFaceImages([]);
    setCurrentPoseStep(0);
    setCaptureCountdown(null);
    startCamera(facingMode);
  };

  /*
   * RETAKE LAST FACE PHOTO
   */
  const retakeLastFace = () => {
    const newImages = faceImages.slice(0, -1);
    setFaceImages(newImages);
    setCurrentPoseStep(newImages.length);
    setCaptureCountdown(null);
    if (!camActive) startCamera(facingMode);
  };

  /*
   * SUBMIT REGISTRATION
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Password validation
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    // Role-specific validation
    let idValue = "";
    if (role === "admin") {
      if (!adminId.trim()) {
        setErrorMessage("Please enter an Admin ID.");
        return;
      }
      idValue = adminId.trim();
    } else if (role === "faculty") {
      if (!facultyId.trim()) {
        setErrorMessage("Please enter a Faculty ID.");
        return;
      }
      idValue = facultyId.trim();
    } else if (role === "student") {
      if (!studentId.trim()) {
        setErrorMessage("Please enter a Student ID (USN).");
        return;
      }
      if (faceImages.length < REQUIRED_PHOTOS) {
        setErrorMessage(`Please capture all ${REQUIRED_PHOTOS} face registration photos before submitting (${faceImages.length}/${REQUIRED_PHOTOS} captured).`);
        return;
      }
      idValue = studentId.trim();
    }

    authAPI.register({
      role,
      name: name.trim(),
      email: email.trim(),
      password,
      id: idValue,
      semester: role === "student" ? semester : undefined,
      face_image: role === "student" ? faceImages[0] : undefined,
      face_images: role === "student" ? faceImages : undefined,
    })
      .then(() => {
        setIsLoading(false);
        setSuccessMessage(`Account registered successfully as ${role.toUpperCase()}! Redirecting to login...`);

        setTimeout(() => {
          if (typeof onRegisterSuccess === "function") {
            onRegisterSuccess(role, { role, id: idValue, name: name.trim(), email: email.trim() });
          } else if (typeof onBackToLogin === "function") {
            onBackToLogin(role);
          }
        }, 1200);
      })
      .catch((err) => {
        setIsLoading(false);
        setErrorMessage(err.message || "Registration failed. Please try again.");
      });
  };

  return (
    <div className="unified-register-page">
      <div className="unified-register-overlay" />

      <div className="unified-register-container">
        {/* LEFT HERO INFO */}
        <div className="reg-info-side">
          <div className="reg-badge-a">A</div>
          <h1>
            Join <span>Smart Attendance</span>
            <br />
            System
          </h1>

          <p className="reg-description">
            {role === "student"
              ? "Create your student account with facial recognition enrollment for touchless classroom attendance."
              : role === "faculty"
              ? "Register your faculty portal account to manage academic classes, generate dynamic QR codes, and monitor attendance."
              : "Register administrative credentials to oversee departments, students, and institutional reporting."}
          </p>

          <div className="reg-features">
            <div className="reg-feature-item">
              <div className="reg-feature-icon">🛡️</div>
              <span>Role-based secure portal access</span>
            </div>
            <div className="reg-feature-item">
              <div className="reg-feature-icon">📷</div>
              <span>
                {role === "student"
                  ? "AI Face verification & attendance matching"
                  : "Live QR code generator & class tracker"}
              </span>
            </div>
            <div className="reg-feature-item">
              <div className="reg-feature-icon">⚡</div>
              <span>Real-time cloud synchronization & analytics</span>
            </div>
          </div>
        </div>

        {/* RIGHT REGISTRATION CARD */}
        <div className="reg-card">
          <div className="reg-card-header">
            <h2>Create Account</h2>
            <p>Select your user role and enter your details</p>
          </div>

          {/* ROLE SELECTOR TABS */}
          <div className="reg-role-tabs">
            <button
              type="button"
              className={`reg-role-tab ${role === "student" ? "active" : ""}`}
              onClick={() => {
                setRole("student");
                setErrorMessage("");
              }}
            >
              <span>🎓</span>
              <span>Student</span>
            </button>

            <button
              type="button"
              className={`reg-role-tab ${role === "faculty" ? "active faculty" : ""}`}
              onClick={() => {
                setRole("faculty");
                setErrorMessage("");
                stopCamera();
              }}
            >
              <span>👨‍🏫</span>
              <span>Faculty</span>
            </button>

            <button
              type="button"
              className={`reg-role-tab ${role === "admin" ? "active admin" : ""}`}
              onClick={() => {
                setRole("admin");
                setErrorMessage("");
                stopCamera();
              }}
            >
              <span>🛡️</span>
              <span>Admin</span>
            </button>
          </div>

          {/* FORM */}
          <form className="reg-form" onSubmit={handleSubmit}>
            {/* 1. ROLE SPECIFIC ID */}
            {role === "admin" && (
              <div className="reg-form-group">
                <label htmlFor="adminId">Admin ID</label>
                <div className="reg-input-wrapper">
                  <span className="reg-input-icon">🛡️</span>
                  <input
                    type="text"
                    id="adminId"
                    placeholder="e.g. ADM202601"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {role === "faculty" && (
              <div className="reg-form-group">
                <label htmlFor="facultyId">Faculty ID</label>
                <div className="reg-input-wrapper">
                  <span className="reg-input-icon">👨‍🏫</span>
                  <input
                    type="text"
                    id="facultyId"
                    placeholder="e.g. FAC001"
                    value={facultyId}
                    onChange={(e) => setFacultyId(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {role === "student" && (
              <div className="reg-form-group">
                <label htmlFor="studentId">Student ID (USN)</label>
                <div className="reg-input-wrapper">
                  <span className="reg-input-icon">🎓</span>
                  <input
                    type="text"
                    id="studentId"
                    placeholder="e.g. 1AY22CS001"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* 2. FULL NAME */}
            <div className="reg-form-group">
              <label htmlFor="fullName">Full Name</label>
              <div className="reg-input-wrapper">
                <span className="reg-input-icon">👤</span>
                <input
                  type="text"
                  id="fullName"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* 3. EMAIL */}
            <div className="reg-form-group">
              <label htmlFor="email">Email Address</label>
              <div className="reg-input-wrapper">
                <span className="reg-input-icon">✉️</span>
                <input
                  type="email"
                  id="email"
                  placeholder="e.g. name@acharya.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* 4. STUDENT SEMESTER */}
            {role === "student" && (
              <div className="reg-form-group">
                <label htmlFor="semester">Current Semester</label>
                <div className="reg-input-wrapper">
                  <span className="reg-input-icon">📚</span>
                  <select
                    id="semester"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    required
                  >
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                    <option value="5">Semester 5</option>
                    <option value="6">Semester 6</option>
                    <option value="7">Semester 7</option>
                    <option value="8">Semester 8</option>
                  </select>
                </div>
              </div>
            )}

            {/* 5. STUDENT MULTI-IMAGE FACE REGISTRATION */}
            {role === "student" && (
              <div className="reg-face-section">
                <div className="reg-face-header">
                  <strong>
                    <span>📷</span>
                    <span>Face Registration ({faceImages.length}/{REQUIRED_PHOTOS})</span>
                  </strong>
                  <span
                    className={`reg-face-badge ${
                      faceImages.length >= REQUIRED_PHOTOS ? "captured" : camActive ? "pending" : "pending"
                    }`}
                  >
                    {faceImages.length >= REQUIRED_PHOTOS
                      ? `✓ All ${REQUIRED_PHOTOS} Photos Captured`
                      : camActive
                      ? `● Capturing ${faceImages.length + 1}/${REQUIRED_PHOTOS}`
                      : faceImages.length > 0
                      ? `${faceImages.length}/${REQUIRED_PHOTOS} Captured`
                      : "5 Photos Required"}
                  </span>
                </div>

                {/* POSE PROGRESS STEPS */}
                <div className="reg-pose-progress">
                  {POSE_STEPS.map((step) => (
                    <div
                      key={step.id}
                      className={`reg-pose-step ${
                        step.id < faceImages.length ? "done" : step.id === currentPoseStep && camActive ? "active" : ""
                      }`}
                    >
                      <div className="reg-pose-dot">
                        {step.id < faceImages.length ? "✓" : step.icon}
                      </div>
                      <span className="reg-pose-label">{step.label}</span>
                    </div>
                  ))}
                </div>

                {/* Viewfinder / Preview Frame */}
                <div className="reg-face-cam-frame" ref={camFrameRef}>
                  {/* VIDEO ELEMENT */}
                  <video
                    ref={videoRef}
                    className="reg-face-video"
                    autoPlay
                    playsInline
                    muted
                    style={{
                      display: camActive && faceImages.length < REQUIRED_PHOTOS ? "block" : "none",
                      transform: facingMode === "user" ? "scaleX(-1)" : "scaleX(1)",
                    }}
                  />

                  {/* Oval framing guide when live */}
                  {camActive && faceImages.length < REQUIRED_PHOTOS && <div className="reg-face-oval-guide" />}

                  {/* POSE INSTRUCTION OVERLAY */}
                  {camActive && faceImages.length < REQUIRED_PHOTOS && (
                    <div className="reg-pose-overlay">
                      <div className="reg-pose-instruction-icon">{POSE_STEPS[currentPoseStep]?.icon}</div>
                      <div className="reg-pose-instruction-text">{POSE_STEPS[currentPoseStep]?.instruction}</div>
                      {captureCountdown !== null && (
                        <div className="reg-countdown-overlay">{captureCountdown}</div>
                      )}
                    </div>
                  )}

                  {/* Switch Camera Button */}
                  {camActive && faceImages.length < REQUIRED_PHOTOS && (
                    <button
                      type="button"
                      onClick={toggleFacing}
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        background: "rgba(0,0,0,0.6)",
                        color: "white",
                        border: "1px solid rgba(255,255,255,0.4)",
                        borderRadius: "15px",
                        padding: "4px 10px",
                        fontSize: "11px",
                        cursor: "pointer",
                        zIndex: 10,
                      }}
                    >
                      🔄 Flip
                    </button>
                  )}

                  {/* All photos captured — show grid preview */}
                  {faceImages.length >= REQUIRED_PHOTOS && (
                    <div className="reg-face-grid-preview">
                      {faceImages.map((img, idx) => (
                        <div key={idx} className="reg-face-grid-item">
                          <img src={img} alt={`Face ${idx + 1}`} />
                          <span className="reg-face-grid-label">{POSE_STEPS[idx]?.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Idle state before camera starts */}
                  {!camActive && faceImages.length === 0 && (
                    <div style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                      <div style={{ fontSize: "32px", marginBottom: "8px" }}>👤</div>
                      <strong style={{ display: "block", color: "#e2e8f0", fontSize: "13px", marginBottom: "4px" }}>
                        Multi-Pose Face Enrollment
                      </strong>
                      <span style={{ fontSize: "11.5px", color: "#94a3b8", display: "block" }}>
                        Capture {REQUIRED_PHOTOS} photos from different angles for accurate face recognition
                      </span>
                    </div>
                  )}
                </div>

                {/* Hidden canvas for snapshot */}
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {/* THUMBNAIL STRIP (during capture) */}
                {faceImages.length > 0 && faceImages.length < REQUIRED_PHOTOS && (
                  <div className="reg-face-thumbnails">
                    {faceImages.map((img, idx) => (
                      <div key={idx} className="reg-thumb-item">
                        <img src={img} alt={`Captured ${idx + 1}`} />
                        <span>{POSE_STEPS[idx]?.icon}</span>
                      </div>
                    ))}
                    {Array.from({ length: REQUIRED_PHOTOS - faceImages.length }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="reg-thumb-item empty">
                        <span>{POSE_STEPS[faceImages.length + idx]?.icon}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Face Capture Controls */}
                <div style={{ display: "flex", gap: "10px", marginTop: "4px", flexWrap: "wrap", justifyContent: "center" }}>
                  {!camActive && faceImages.length === 0 && (
                    <button
                      type="button"
                      className="reg-cam-btn start"
                      onClick={() => startCamera(facingMode)}
                      disabled={camLoading}
                    >
                      <span>📷</span>
                      <span>{camLoading ? "Starting Camera..." : "Start Face Enrollment"}</span>
                    </button>
                  )}

                  {camActive && faceImages.length < REQUIRED_PHOTOS && (
                    <button
                      type="button"
                      className="reg-cam-btn capture"
                      onClick={captureCountdown !== null ? undefined : startCountdownCapture}
                      disabled={captureCountdown !== null}
                    >
                      <span>📸</span>
                      <span>
                        {captureCountdown !== null
                          ? `Capturing in ${captureCountdown}...`
                          : `Capture ${POSE_STEPS[currentPoseStep]?.label} (${faceImages.length + 1}/${REQUIRED_PHOTOS})`}
                      </span>
                    </button>
                  )}

                  {faceImages.length > 0 && faceImages.length < REQUIRED_PHOTOS && (
                    <button
                      type="button"
                      className="reg-cam-btn retake"
                      onClick={retakeLastFace}
                    >
                      <span>↩️</span>
                      <span>Redo Last</span>
                    </button>
                  )}

                  {faceImages.length >= REQUIRED_PHOTOS && (
                    <button
                      type="button"
                      className="reg-cam-btn retake"
                      onClick={retakeAllFaces}
                    >
                      <span>🔄</span>
                      <span>Retake All Photos</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 6. CREATE PASSWORD */}
            <div className="reg-form-group">
              <label htmlFor="password">Create Password</label>
              <div className="reg-input-wrapper">
                <span className="reg-input-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Create a strong password (min. 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="reg-show-pwd-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* 7. CONFIRM PASSWORD */}
            <div className="reg-form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="reg-input-wrapper">
                <span className="reg-input-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* ERROR / SUCCESS MESSAGES */}
            {errorMessage && <p className="reg-error-message">{errorMessage}</p>}
            {successMessage && <p className="reg-success-message">{successMessage}</p>}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              className="reg-submit-button"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : `Register as ${role.toUpperCase()}`}
            </button>
          </form>

          {/* BACK TO LOGIN LINK */}
          <div className="reg-login-link-container">
            <span>Already have an account?</span>
            <button
              type="button"
              className="reg-login-link-btn"
              onClick={() => {
                stopCamera();
                if (typeof onBackToLogin === "function") {
                  onBackToLogin(role);
                }
              }}
            >
              Log In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
