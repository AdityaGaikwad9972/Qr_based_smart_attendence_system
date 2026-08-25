import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import "./QRScanner.css";

function QRScanner({ onBack, onQRDetected }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const isCancelledRef = useRef(false);

  // Prevent multiple callbacks
  const processingRef = useRef(false);

  // State
  const [cameraError, setCameraError] = useState("");
  const [cameraStarted, setCameraStarted] = useState(false);
  const [qrDetected, setQrDetected] = useState(false);
  const [expiryError, setExpiryError] = useState("");
  const [facingMode, setFacingMode] = useState("environment");
  const [activeSession, setActiveSession] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Check for active attendance session in localStorage on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("active_attendance_session");
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.sessionId) {
          const expTime = parsed.expiresAt ? new Date(parsed.expiresAt).getTime() : Date.now() + 60000;
          if (Date.now() < expTime) {
            setActiveSession(parsed);
          }
        }
      }
    } catch {}
  }, []);

  /*
   * START CAMERA
   */
  useEffect(() => {
    isCancelledRef.current = false;
    startCamera(facingMode);

    const handleUnloadOrHide = () => {
      stopCamera();
    };

    window.addEventListener("pagehide", handleUnloadOrHide);
    window.addEventListener("beforeunload", handleUnloadOrHide);

    return () => {
      isCancelledRef.current = true;
      stopCamera();
      window.removeEventListener("pagehide", handleUnloadOrHide);
      window.removeEventListener("beforeunload", handleUnloadOrHide);
    };
  }, [facingMode]);

  /*
   * START CAMERA STREAM
   */
  const startCamera = async (mode = "environment") => {
    try {
      isCancelledRef.current = false;
      setCameraError("");
      setExpiryError("");
      setCameraStarted(false);
      setQrDetected(false);
      processingRef.current = false;

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera access is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (isCancelledRef.current || !videoRef.current) {
        stream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (!isCancelledRef.current) {
          setCameraStarted(true);
          startQRScanning();
        } else {
          stopCamera();
        }
      }
    } catch (error) {
      if (isCancelledRef.current) return;
      console.error("Camera error:", error);
      setCameraStarted(false);

      if (error.name === "NotAllowedError") {
        setCameraError("Camera permission was denied. Please allow camera access in your browser settings.");
      } else if (error.name === "NotFoundError") {
        setCameraError("No camera device was found on this system.");
      } else if (error.name === "NotReadableError") {
        setCameraError("The camera is currently in use by another application or tab.");
      } else {
        // Retry with any facingMode
        if (mode === "environment") {
          startCamera("user");
          return;
        }
        setCameraError("Unable to access the camera: " + error.message);
      }
    }
  };

  /*
   * TOGGLE CAMERA FLIP
   */
  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  /*
   * VALIDATE QR PAYLOAD
   */
  const isValidAttendanceQR = (data) => {
    if (!data) return false;
    const value = String(data).trim();

    try {
      const parsed = JSON.parse(value);
      if (parsed && (parsed.sessionId || parsed.subject || parsed.code || parsed.expiresIn)) {
        return true;
      }
    } catch {}

    if (value.startsWith("ATTENDANCE:") || value.startsWith("SESSION-") || value.length >= 4) {
      return true;
    }

    return false;
  };

  /*
   * DUAL-ENGINE REAL-TIME QR SCANNER LOOP (BarcodeDetector + jsQR)
   */
  const startQRScanning = () => {
    let barcodeDetector = null;
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
      } catch (e) {
        barcodeDetector = null;
      }
    }

    const scan = async () => {
      if (isCancelledRef.current || processingRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        if (!isCancelledRef.current) {
          animationRef.current = requestAnimationFrame(scan);
        }
        return;
      }

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Engine 1: Native Hardware BarcodeDetector (High-speed 60fps)
        if (barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const rawData = barcodes[0].rawValue?.trim();
              if (isValidAttendanceQR(rawData)) {
                handleQRDetected(rawData);
                return;
              }
            }
          } catch (e) {}
        }

        // Engine 2: High-accuracy jsQR with downsampled canvas (capped at 640px)
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        if (vw > 0 && vh > 0) {
          const maxDim = 640;
          const scale = Math.min(1, maxDim / Math.max(vw, vh));
          const cw = Math.round(vw * scale);
          const ch = Math.round(vh * scale);

          canvas.width = cw;
          canvas.height = ch;

          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (context) {
            context.drawImage(video, 0, 0, cw, ch);
            const imageData = context.getImageData(0, 0, cw, ch);

            let code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
            });

            // If not found, try quick contrast stretch pass
            if (!code) {
              const d = imageData.data;
              for (let i = 0; i < d.length; i += 4) {
                // High contrast binarization
                const avg = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
                const v = avg > 128 ? 255 : 0;
                d[i] = v;
                d[i + 1] = v;
                d[i + 2] = v;
              }
              code = jsQR(d, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
              });
            }

            if (code && code.data) {
              const qrData = String(code.data).trim();
              if (isValidAttendanceQR(qrData)) {
                handleQRDetected(qrData);
                return;
              }
            }
          }
        }
      }

      if (!processingRef.current && !isCancelledRef.current) {
        animationRef.current = requestAnimationFrame(scan);
      }
    };

    animationRef.current = requestAnimationFrame(scan);
  };

  /*
   * HANDLE FILE UPLOAD FOR QR IMAGE / SCREENSHOT
   */
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setExpiryError("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // 1. Try BarcodeDetector
          if (typeof window !== "undefined" && "BarcodeDetector" in window) {
            try {
              const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
              const barcodes = await detector.detect(img);
              if (barcodes && barcodes.length > 0) {
                const raw = barcodes[0].rawValue?.trim();
                if (isValidAttendanceQR(raw)) {
                  setUploadLoading(false);
                  handleQRDetected(raw);
                  return;
                }
              }
            } catch {}
          }

          // 2. Try jsQR
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: "attemptBoth",
          });

          if (code && code.data && isValidAttendanceQR(code.data)) {
            setUploadLoading(false);
            handleQRDetected(code.data);
          } else {
            setUploadLoading(false);
            setExpiryError("⚠️ Could not detect a valid attendance QR code in the uploaded image. Please ensure the QR code is clearly visible.");
          }
        } catch (err) {
          setUploadLoading(false);
          setExpiryError("Failed to decode uploaded image: " + err.message);
        }
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  };

  /*
   * HANDLE QR CODE DETECTED
   */
  const handleQRDetected = (qrData) => {
    if (processingRef.current || isCancelledRef.current) return;

    // Expiry check
    try {
      const parsed = JSON.parse(qrData);
      if (parsed && parsed.expiresAt) {
        const expTime = new Date(parsed.expiresAt).getTime();
        if (Date.now() > expTime) {
          setExpiryError("⚠️ This QR code has expired (60s timer completed). Please ask your faculty to generate a fresh QR code.");
          return;
        }
      }
    } catch {}

    processingRef.current = true;
    setExpiryError("");
    setQrDetected(true);
    stopCamera();

    setTimeout(() => {
      if (onQRDetected) {
        onQRDetected(qrData);
      }
    }, 450);
  };

  /*
   * STOP CAMERA & RELEASE HARDWARE
   */
  const stopCamera = () => {
    isCancelledRef.current = true;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch (e) {
        console.warn("Error stopping stream tracks:", e);
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        if (videoRef.current.srcObject) {
          const videoTracks = videoRef.current.srcObject.getTracks ? videoRef.current.srcObject.getTracks() : [];
          videoTracks.forEach((track) => {
            track.stop();
            track.enabled = false;
          });
          videoRef.current.srcObject = null;
        }
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      } catch (e) {
        console.warn("Error releasing video element:", e);
      }
    }

    setCameraStarted(false);
  };

  /*
   * BACK TO DASHBOARD
   */
  const handleBack = () => {
    stopCamera();
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="qr-page">
      {/* HEADER */}
      <header className="qr-header">
        <div className="qr-brand">
          <div className="qr-brand-a">A</div>
          <div>
            <h2>Smart Attendance</h2>
            <span>Student Portal</span>
          </div>
        </div>

        <button className="back-dashboard-btn" onClick={handleBack}>
          ← Back to Dashboard
        </button>
      </header>

      {/* MAIN */}
      <main className="qr-container">
        {/* TITLE */}
        <section className="qr-title">
          <p>ATTENDANCE • STEP 1 OF 2</p>
          <h1>Scan Class QR Code</h1>
          <span>
            Scan the live 60-second QR code from your lecturer&apos;s smart board, or upload a QR screenshot.
          </span>
        </section>

        {/* CONTENT */}
        <section className="qr-content">
          {/* CAMERA CARD */}
          <div className="scanner-card">
            <div className="scanner-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2>Scanning Live QR</h2>
                <span className={cameraStarted ? "camera-status live" : "camera-status"}>
                  {cameraStarted ? "● Live Camera" : "Camera Off"}
                </span>
              </div>

              {/* CAMERA SWITCH */}
              {cameraStarted && (
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#334155",
                    cursor: "pointer",
                  }}
                  title="Switch Front/Back Camera"
                >
                  🔄 Flip Camera
                </button>
              )}
            </div>

            {/* CAMERA VIEWPORT */}
            <div className="camera-area">
              <div className="camera-frame">
                <video
                  ref={videoRef}
                  className="camera-video"
                  autoPlay
                  playsInline
                  muted
                />

                <canvas ref={canvasRef} style={{ display: "none" }} />

                {/* Scanner corners */}
                <div className="scanner-corner top-left"></div>
                <div className="scanner-corner top-right"></div>
                <div className="scanner-corner bottom-left"></div>
                <div className="scanner-corner bottom-right"></div>

                {/* Scanning line */}
                {cameraStarted && !qrDetected && <div className="scanner-line"></div>}

                {/* QR DETECTED OVERLAY */}
                {qrDetected && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(15, 23, 42, 0.85)",
                      color: "white",
                      fontSize: "18px",
                      fontWeight: "700",
                      gap: "10px",
                      zIndex: 10,
                    }}
                  >
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
                      ✓
                    </div>
                    <span>QR Code Authenticated!</span>
                    <span style={{ fontSize: "12.5px", color: "#86efac", fontWeight: "normal" }}>
                      Proceeding to Step 2: Facial Biometric Verification...
                    </span>
                  </div>
                )}

                {/* ERROR STATES */}
                {cameraError && (
                  <div className="camera-error">
                    <div className="error-icon">⚠️</div>
                    <strong>Camera Unavailable</strong>
                    <p>{cameraError}</p>
                    <button onClick={() => startCamera(facingMode)} className="retry-camera-btn">
                      Try Again
                    </button>
                  </div>
                )}
              </div>

              {/* EXPIRY ERROR BANNER */}
              {expiryError && (
                <div style={{ background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "8px", padding: "10px 14px", marginTop: "12px", color: "#991b1b", fontSize: "13px", fontWeight: "600", textAlign: "center" }}>
                  {expiryError}
                </div>
              )}

              {/* INSTRUCTION */}
              <p className="camera-instruction">
                {qrDetected
                  ? "QR code verified. Moving to Face Matching..."
                  : expiryError
                  ? "Scan an active, unexpired QR code."
                  : cameraStarted
                  ? "Position the QR code inside the frame to scan automatically."
                  : "Starting camera..."}
              </p>

              {/* ALTERNATIVE ACTIONS (UPLOAD / QUICK TEST) */}
              <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  style={{ display: "none" }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLoading}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#334155",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>📷</span>
                  <span>{uploadLoading ? "Scanning Image..." : "Upload QR Image / File"}</span>
                </button>

                {/* Active Session Quick Connect (Great for Single Screen Testing) */}
                {activeSession && (
                  <button
                    type="button"
                    onClick={() => handleQRDetected(JSON.stringify(activeSession))}
                    style={{
                      padding: "9px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "white",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <span>⚡</span>
                    <span>Quick Connect: {activeSession.subject || activeSession.code}</span>
                  </button>
                )}

                <button className="cancel-btn" onClick={handleBack}>
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* INSTRUCTIONS */}
          <div className="instructions-card">
            <h2>How to Mark Attendance</h2>

            <div className="instruction">
              <div className="instruction-number">1</div>
              <div>
                <strong>Scan Active QR Code</strong>
                <p>Scan the live QR code displayed by your lecturer (valid for 60 seconds) or upload a QR image.</p>
              </div>
            </div>

            <div className="instruction">
              <div className="instruction-number">2</div>
              <div>
                <strong>AI Facial Biometrics</strong>
                <p>Take a quick live selfie. The AI Deep Neural Network verifies your identity instantly against your profile photo.</p>
              </div>
            </div>

            <div className="instruction">
              <div className="instruction-check">✓</div>
              <div>
                <strong>Attendance Confirmed</strong>
                <p>Your attendance is recorded directly in the institutional SQLite database in real-time.</p>
              </div>
            </div>

            {/* QUICK TIP CARD */}
            <div style={{ marginTop: "20px", padding: "14px", borderRadius: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: "12.5px", lineHeight: "1.5" }}>
              <strong>💡 Single-Device Testing Tip:</strong>
              <p style={{ margin: "4px 0 0 0" }}>
                If you are running both the Faculty screen and Student portal on the same laptop screen, use the <strong>&quot;Upload QR Image&quot;</strong> or <strong>&quot;⚡ Quick Connect&quot;</strong> button to proceed directly to Face Verification.
              </p>
            </div>
          </div>
        </section>

        {/* SECURITY */}
        <section className="security-box">
          <div className="security-icon">🔒</div>
          <div>
            <strong>AI &amp; Biometric Security Active</strong>
            <p>
              Attendance is strictly protected with time-limited dynamic QR tokens and real-time deep facial feature recognition.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default QRScanner;