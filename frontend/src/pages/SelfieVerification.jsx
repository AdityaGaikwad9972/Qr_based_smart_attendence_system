import { useEffect, useRef, useState } from "react";
import "./SelfieVerification.css";

function SelfieVerification({ onSuccess, onBack }) {

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [selfieImage, setSelfieImage] = useState(null);

  // --------------------------------------------------
  // START CAMERA
  // --------------------------------------------------

  useEffect(() => {

    startCamera();

    return () => {
      stopCamera();
    };

  }, []);


  const startCamera = async () => {

    try {

      setCameraError("");
      setCameraStarted(false);
      setSelfieCaptured(false);
      setSelfieImage(null);

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
            facingMode: "user",

            width: {
              ideal: 1280
            },

            height: {
              ideal: 720
            }
          },

          audio: false

        });


      streamRef.current = stream;


      if (videoRef.current) {

        videoRef.current.srcObject = stream;

        await videoRef.current.play();

        /*
         * Wait until browser has actual video frames.
         */
        if (videoRef.current.readyState < 2) {

          await new Promise((resolve) => {

            videoRef.current.onloadeddata =
              resolve;

          });

        }


        setCameraStarted(true);

      }

    }

    catch (error) {

      console.error(
        "Selfie camera error:",
        error
      );

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


  // --------------------------------------------------
  // STOP CAMERA
  // --------------------------------------------------

  const stopCamera = () => {

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


  // --------------------------------------------------
  // CAPTURE SELFIE
  // --------------------------------------------------

  const captureSelfie = () => {

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {

      alert("Camera is not ready.");

      return;
    }


    /*
     * Make sure video actually contains frames.
     */

    if (
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {

      alert(
        "Camera is not ready yet. Please wait a moment."
      );

      return;

    }


    /*
     * Use the actual camera resolution.
     */

    const width = video.videoWidth;
    const height = video.videoHeight;

    canvas.width = width;
    canvas.height = height;


    const context =
      canvas.getContext("2d");


    /*
     * IMPORTANT:
     * Reset canvas transformation.
     *
     * This prevents previous transforms
     * from affecting the captured image.
     */

    context.setTransform(1, 0, 0, 1, 0, 0);

    context.clearRect(
      0,
      0,
      width,
      height
    );


    /*
     * Mirror the selfie so it looks
     * natural like the camera preview.
     */

    context.translate(width, 0);

    context.scale(-1, 1);


    /*
     * Capture CURRENT camera frame.
     */

    context.drawImage(
      video,
      0,
      0,
      width,
      height
    );


    /*
     * Convert canvas to image.
     */

    const image =
      canvas.toDataURL(
        "image/jpeg",
        0.92
      );


    console.log(
      "SELFIE CAPTURED"
    );

    console.log(
      "Image size:",
      image.length
    );


    /*
     * Store captured selfie.
     */

    setSelfieImage(image);

    setSelfieCaptured(true);


    /*
     * Stop camera after capture.
     */

    stopCamera();

  };


  // --------------------------------------------------
  // RETAKE SELFIE
  // --------------------------------------------------

  const retakeSelfie = () => {

    setSelfieImage(null);

    setSelfieCaptured(false);

    startCamera();

  };


  // --------------------------------------------------
  // CONTINUE TO LOCATION
  // --------------------------------------------------

  const handleContinue = () => {

    if (!selfieImage) {

      alert(
        "Please capture your selfie first."
      );

      return;
    }


    console.log(
      "Selfie verification completed."
    );


    /*
     * Send selfie to App.jsx.
     */

    if (onSuccess) {

      onSuccess(selfieImage);

    }

  };


  // --------------------------------------------------
  // BACK
  // --------------------------------------------------

  const handleBack = () => {

    stopCamera();

    if (onBack) {

      onBack();

    }

  };


  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (

    <div className="selfie-page">

      {/* HEADER */}

      <header className="selfie-header">

        <div className="selfie-brand">

          <div className="selfie-brand-a">
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
          className="selfie-back-btn"
          onClick={handleBack}
        >
          ← Back
        </button>

      </header>


      {/* MAIN */}

      <main className="selfie-container">

        {/* TITLE */}

        <section className="selfie-title">

          <p>
            ATTENDANCE
          </p>

          <h1>
            Selfie Verification
          </h1>

          <span>
            Position your face inside the frame
            for verification.
          </span>

        </section>


        {/* CONTENT */}

        <section className="selfie-content">


          {/* CAMERA CARD */}

          <div className="selfie-card">


            <div className="selfie-card-header">

              <h2>
                Selfie Verification
              </h2>

              <span
                className={
                  cameraStarted
                    ? "selfie-camera-status live"
                    : "selfie-camera-status"
                }
              >

                {cameraStarted
                  ? "Live"
                  : "Camera Off"}

              </span>

            </div>


            {/* CAMERA AREA */}

            <div className="selfie-camera-area">

              <div className="selfie-camera-frame">


                {/* LIVE CAMERA */}

                {!selfieCaptured && (

                  <video
                    ref={videoRef}
                    className="selfie-video"
                    autoPlay
                    playsInline
                    muted
                  />

                )}


                {/* CAPTURED SELFIE */}

                {selfieCaptured &&
                  selfieImage && (

                    <img
                      src={selfieImage}
                      alt="Captured selfie"
                      className="selfie-preview"
                    />

                  )}


                {/* FACE OVAL */}

                {!selfieCaptured && cameraStarted && (

                  <div className="face-frame">
                  </div>

                )}


                {/* CAMERA ERROR */}

                {cameraError && (

                  <div className="selfie-camera-error">

                    <div>
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
                      className="retry-selfie-btn"
                    >
                      Try Again
                    </button>

                  </div>

                )}

              </div>


              {/* HIDDEN CANVAS */}

              <canvas
                ref={canvasRef}
                style={{
                  display: "none"
                }}
              />


              {/* INSTRUCTION */}

              <p className="selfie-instruction">

                {selfieCaptured
                  ? "Selfie captured successfully"
                  : cameraStarted
                  ? "Look directly at the camera"
                  : "Starting camera..."}

              </p>


              {/* CAPTURE */}

              {!selfieCaptured &&
                cameraStarted && (

                  <button
                    className="capture-selfie-btn"
                    onClick={captureSelfie}
                  >
                    Capture Selfie
                  </button>

                )}


              {/* AFTER CAPTURE */}

              {selfieCaptured && (

                <>

                  <div className="selfie-success">

                    ✓ Selfie captured

                  </div>


                  {/* RETAKE */}

                  <button
                    className="retry-selfie-btn"
                    onClick={retakeSelfie}
                    style={{
                      marginTop: "10px"
                    }}
                  >
                    Retake Selfie
                  </button>


                  {/* CONTINUE */}

                  <button
                    className="continue-location-btn"
                    onClick={handleContinue}
                  >
                    Continue to Location Verification →
                  </button>

                </>

              )}

            </div>

          </div>


          {/* VERIFICATION CARD */}

          <div className="selfie-verification-card">

            <h2>
              Attendance Verification
            </h2>


            {/* STEP 1 */}

            <div className="selfie-step completed">

              <div className="selfie-step-icon">
                ✓
              </div>

              <div>

                <strong>
                  QR Code Verified
                </strong>

                <p>
                  Your classroom QR code has been detected.
                </p>

              </div>

            </div>


            {/* STEP 2 */}

            <div
              className={
                selfieCaptured
                  ? "selfie-step completed"
                  : "selfie-step active"
              }
            >

              <div className="selfie-step-icon">

                {selfieCaptured
                  ? "✓"
                  : "2"}

              </div>

              <div>

                <strong>
                  Selfie Verification
                </strong>

                <p>

                  {selfieCaptured
                    ? "Your selfie has been captured successfully."
                    : "Take a live selfie to verify your identity."}

                </p>

              </div>

            </div>


            {/* STEP 3 */}

            <div className="selfie-step">

              <div className="selfie-step-icon">
                3
              </div>

              <div>

                <strong>
                  Location Verification
                </strong>

                <p>
                  Your classroom location will be checked next.
                </p>

              </div>

            </div>


          </div>

        </section>

      </main>

    </div>

  );

}

export default SelfieVerification;