import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import "./QRScanner.css";

function QRScanner({ onBack, onQRDetected }) {

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  // Prevent multiple callbacks
  const processingRef = useRef(false);

  // Used to make sure the same QR is detected multiple times
  const lastQRRef = useRef("");
  const stableCountRef = useRef(0);

  const [cameraError, setCameraError] = useState("");
  const [cameraStarted, setCameraStarted] = useState(false);
  const [qrDetected, setQrDetected] = useState(false);

  /*
   * START CAMERA
   */
  useEffect(() => {

    startCamera();

    return () => {
      stopCamera();
    };

  }, []);


  /*
   * START CAMERA
   */
  const startCamera = async () => {

    try {

      setCameraError("");
      setCameraStarted(false);
      setQrDetected(false);

      processingRef.current = false;
      lastQRRef.current = "";
      stableCountRef.current = 0;

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {

        setCameraError(
          "Camera access is not supported by this browser."
        );

        return;
      }


      const stream =
        await navigator.mediaDevices.getUserMedia({

          video: {

            facingMode: {
              ideal: "environment",
            },

            width: {
              ideal: 1280,
            },

            height: {
              ideal: 720,
            },

          },

          audio: false,

        });


      streamRef.current = stream;


      if (videoRef.current) {

        videoRef.current.srcObject = stream;

        await videoRef.current.play();

        setCameraStarted(true);

        startQRScanning();

      }

    } catch (error) {

      console.error("Camera error:", error);

      setCameraStarted(false);


      if (error.name === "NotAllowedError") {

        setCameraError(
          "Camera permission was denied. Please allow camera access."
        );

      }

      else if (error.name === "NotFoundError") {

        setCameraError(
          "No camera was found on this device."
        );

      }

      else if (error.name === "NotReadableError") {

        setCameraError(
          "The camera is already being used by another application."
        );

      }

      else {

        setCameraError(
          "Unable to access the camera."
        );

      }

    }

  };


  /*
   * CHECK WHETHER QR BELONGS TO OUR ATTENDANCE SYSTEM
   */
  const isValidAttendanceQR = (data) => {

    if (!data) {
      return false;
    }

    const value = String(data).trim();

    console.log("QR detected:", value);


    /*
     * IMPORTANT
     *
     * Only QR codes beginning with
     *
     * ATTENDANCE:
     *
     * will be accepted.
     */

    if (!value.startsWith("ATTENDANCE:")) {

      console.log(
        "Rejected QR - not an attendance QR"
      );

      return false;
    }


    /*
     * Example:
     *
     * ATTENDANCE:AIT:2026:ABC123
     *
     */

    const parts = value.split(":");


    if (parts.length < 4) {

      console.log(
        "Rejected QR - invalid format"
      );

      return false;
    }


    return true;
  };


  /*
   * QR SCANNING
   */
  const startQRScanning = () => {

    const scan = () => {

      const video = videoRef.current;
      const canvas = canvasRef.current;


      /*
       * If camera elements are not ready,
       * keep scanning.
       */
      if (!video || !canvas) {

        animationRef.current =
          requestAnimationFrame(scan);

        return;
      }


      /*
       * Do not scan after successful detection.
       */
      if (
        !processingRef.current &&
        video.readyState === video.HAVE_ENOUGH_DATA
      ) {

        const width = video.videoWidth;
        const height = video.videoHeight;


        if (width > 0 && height > 0) {

          canvas.width = width;
          canvas.height = height;


          const context =
            canvas.getContext("2d", {
              willReadFrequently: true,
            });


          if (context) {

            context.drawImage(
              video,
              0,
              0,
              width,
              height
            );


            const imageData =
              context.getImageData(
                0,
                0,
                width,
                height
              );


            /*
             * Detect QR
             */
            const code = jsQR(
              imageData.data,
              imageData.width,
              imageData.height,
              {
                inversionAttempts: "attemptBoth",
              }
            );


            /*
             * QR FOUND
             */
            if (code) {

              const qrData =
                String(code.data).trim();


              console.log(
                "QR detected by jsQR:",
                qrData
              );


              /*
               * FIRST:
               * Check whether it is our QR.
               */
              if (isValidAttendanceQR(qrData)) {


                /*
                 * Same QR detected again
                 */
                if (
                  lastQRRef.current === qrData
                ) {

                  stableCountRef.current += 1;

                }

                /*
                 * New QR detected
                 */
                else {

                  lastQRRef.current = qrData;

                  stableCountRef.current = 1;

                }


                console.log(
                  "Stable QR count:",
                  stableCountRef.current
                );


                /*
                 * Require the SAME QR
                 * to be detected 3 times.
                 */
                if (
                  stableCountRef.current >= 3
                ) {

                  handleQRDetected(qrData);

                  return;
                }

              }

              else {

                /*
                 * Invalid QR
                 *
                 * Reset detection.
                 */
                lastQRRef.current = "";

                stableCountRef.current = 0;

              }

            }

            else {

              /*
               * No QR visible.
               *
               * DO NOTHING.
               *
               * Scanner continues waiting.
               */

            }

          }

        }

      }


      /*
       * Continue scanning forever
       */
      if (!processingRef.current) {

        animationRef.current =
          requestAnimationFrame(scan);

      }

    };


    animationRef.current =
      requestAnimationFrame(scan);

  };


  /*
   * QR DETECTED
   */
  const handleQRDetected = (qrData) => {

    /*
     * Prevent duplicate calls
     */
    if (processingRef.current) {

      return;

    }


    processingRef.current = true;


    console.log(
      "VALID ATTENDANCE QR:",
      qrData
    );


    setQrDetected(true);


    /*
     * Stop camera
     */
    stopCamera();


    /*
     * NOW move to selfie.
     */
    if (onQRDetected) {

      onQRDetected(qrData);

    }

  };


  /*
   * STOP CAMERA
   */
  const stopCamera = () => {

    /*
     * Stop animation
     */
    if (animationRef.current) {

      cancelAnimationFrame(
        animationRef.current
      );

      animationRef.current = null;

    }


    /*
     * Stop camera tracks
     */
    if (streamRef.current) {

      streamRef.current
        .getTracks()
        .forEach((track) => {

          track.stop();

        });


      streamRef.current = null;

    }


    setCameraStarted(false);

  };


  /*
   * BACK
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

          <div className="qr-brand-a">
            A
          </div>

          <div>

            <h2>
              Smart Attendance
            </h2>

            <span>
              Student Portal
            </span>

          </div>

        </div>


        <button
          className="back-dashboard-btn"
          onClick={handleBack}
        >
          ← Back to Dashboard
        </button>

      </header>



      {/* MAIN */}

      <main className="qr-container">


        {/* TITLE */}

        <section className="qr-title">

          <p>
            ATTENDANCE
          </p>

          <h1>
            Scan QR Code
          </h1>

          <span>
            Scan the QR code displayed by your lecturer
            to mark your attendance.
          </span>

        </section>



        {/* CONTENT */}

        <section className="qr-content">


          {/* CAMERA CARD */}

          <div className="scanner-card">


            <div className="scanner-card-header">

              <h2>
                Scanning QR Code
              </h2>


              <span
                className={
                  cameraStarted
                    ? "camera-status live"
                    : "camera-status"
                }
              >

                {cameraStarted
                  ? "Live"
                  : "Camera Off"}

              </span>

            </div>



            {/* CAMERA */}

            <div className="camera-area">

              <div className="camera-frame">


                <video
                  ref={videoRef}
                  className="camera-video"
                  autoPlay
                  playsInline
                  muted
                />


                {/* Hidden canvas */}

                <canvas
                  ref={canvasRef}
                  style={{
                    display: "none",
                  }}
                />


                {/* Scanner corners */}

                <div className="scanner-corner top-left"></div>

                <div className="scanner-corner top-right"></div>

                <div className="scanner-corner bottom-left"></div>

                <div className="scanner-corner bottom-right"></div>



                {/* Scanning line */}

                {cameraStarted &&
                  !qrDetected && (

                    <div className="scanner-line"></div>

                  )}



                {/* QR DETECTED */}

                {qrDetected && (

                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        "rgba(0,0,0,0.45)",
                      color: "white",
                      fontSize: "20px",
                      fontWeight: "600",
                    }}
                  >

                    QR Code Verified ✓

                  </div>

                )}



                {/* ERROR */}

                {cameraError && (

                  <div className="camera-error">

                    <div className="error-icon">
                      ⚠
                    </div>

                    <strong>
                      Camera unavailable
                    </strong>

                    <p>
                      {cameraError}
                    </p>


                    <button
                      onClick={startCamera}
                      className="retry-camera-btn"
                    >
                      Try Again
                    </button>

                  </div>

                )}

              </div>



              {/* INSTRUCTION */}

              <p className="camera-instruction">

                {qrDetected

                  ? "QR code verified. Opening selfie verification..."

                  : cameraStarted

                  ? "Point your camera at the lecturer's QR code"

                  : "Starting camera..."}

              </p>



              {/* CANCEL */}

              <button
                className="cancel-btn"
                onClick={handleBack}
              >
                Cancel
              </button>


            </div>

          </div>



          {/* INSTRUCTIONS */}

          <div className="instructions-card">

            <h2>
              How to Mark Attendance
            </h2>


            <div className="instruction">

              <div className="instruction-number">
                1
              </div>

              <div>

                <strong>
                  Scan the QR Code
                </strong>

                <p>
                  Scan the live QR code displayed
                  on the lecturer's screen.
                </p>

              </div>

            </div>


            <div className="instruction">

              <div className="instruction-number">
                2
              </div>

              <div>

                <strong>
                  Take a Live Selfie
                </strong>

                <p>
                  After scanning, you'll be asked
                  to take a live selfie.
                </p>

              </div>

            </div>


            <div className="instruction">

              <div className="instruction-number">
                3
              </div>

              <div>

                <strong>
                  Verify Your Location
                </strong>

                <p>
                  Your current GPS location will
                  be checked against the classroom.
                </p>

              </div>

            </div>


            <div className="instruction">

              <div className="instruction-check">
                ✓
              </div>

              <div>

                <strong>
                  Attendance Confirmed
                </strong>

                <p>
                  If all checks pass, your attendance
                  will be marked automatically.
                </p>

              </div>

            </div>

          </div>

        </section>



        {/* SECURITY */}

        <section className="security-box">

          <div className="security-icon">
            🔒
          </div>

          <div>

            <strong>
              Secure Attendance Verification
            </strong>

            <p>
              Your attendance is verified using
              QR authentication, selfie verification
              and classroom location.
            </p>

          </div>

        </section>


      </main>

    </div>

  );

}

export default QRScanner;