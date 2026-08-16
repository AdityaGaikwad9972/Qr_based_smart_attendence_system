import { useEffect, useState } from "react";
import "./LocationVerification.css";

function LocationVerification({ onSuccess, onBack }) {
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState(
    "Checking your current location..."
  );

  useEffect(() => {
    checkLocation();
  }, []);

  /*
   * CHECK USER LOCATION
   */
  const checkLocation = () => {
    // Check browser support
    if (!navigator.geolocation) {
      setStatus("error");
      setMessage(
        "Geolocation is not supported by your browser."
      );
      return;
    }

    setStatus("checking");
    setMessage("Getting your current location...");

    navigator.geolocation.getCurrentPosition(
      /*
       * LOCATION SUCCESS
       */
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        console.log("Latitude:", latitude);
        console.log("Longitude:", longitude);
        console.log("Accuracy:", accuracy);

        /*
         * LOCATION DATA
         *
         * This data will be sent to App.jsx
         */
        const locationData = {
          latitude: latitude,
          longitude: longitude,
          accuracy: accuracy,
        };

        /*
         * TEMPORARY VERIFICATION
         *
         * Later we can compare these coordinates
         * with the actual classroom coordinates.
         */
        setStatus("success");

        setMessage(
          "Your classroom location has been verified."
        );

        /*
         * Move to Attendance Confirmed page
         *
         * Delay allows the user to see
         * "Location Verified" first.
         */
        setTimeout(() => {
          onSuccess(locationData);
        }, 1500);
      },

      /*
       * LOCATION ERROR
       */
      (error) => {
        console.error("Location error:", error);

        setStatus("error");

        if (error.code === error.PERMISSION_DENIED) {
          setMessage(
            "Location permission was denied. Please allow location access and try again."
          );
        } else if (
          error.code === error.POSITION_UNAVAILABLE
        ) {
          setMessage(
            "Unable to determine your current location."
          );
        } else if (error.code === error.TIMEOUT) {
          setMessage(
            "Location request timed out. Please try again."
          );
        } else {
          setMessage(
            "Unable to verify your location."
          );
        }
      },

      /*
       * GPS OPTIONS
       */
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="location-page">

      {/* ================= HEADER ================= */}

      <header className="location-header">

        <div className="location-brand">

          <div className="location-brand-a">
            A
          </div>

          <div>
            <h2>Smart Attendance</h2>

            <span>
              Student Portal
            </span>
          </div>

        </div>

        <button
          className="location-back-btn"
          onClick={onBack}
        >
          ← Back
        </button>

      </header>


      {/* ================= MAIN ================= */}

      <main className="location-container">

        {/* ================= TITLE ================= */}

        <section className="location-title">

          <p>ATTENDANCE</p>

          <h1>
            Location Verification
          </h1>

          <span>
            Verifying that you are inside the classroom.
          </span>

        </section>


        {/* ================= CONTENT ================= */}

        <section className="location-content">


          {/* ================= LOCATION CARD ================= */}

          <div className="location-card">

            {/* Location Icon */}

            <div className="location-icon">
              📍
            </div>


            {/* ================= CHECKING ================= */}

            {status === "checking" && (
              <>
                <div className="location-spinner"></div>

                <h2>
                  Checking Location
                </h2>

                <p>
                  {message}
                </p>
              </>
            )}


            {/* ================= SUCCESS ================= */}

            {status === "success" && (
              <>
                <div className="location-success-icon">
                  ✓
                </div>

                <h2>
                  Location Verified
                </h2>

                <p>
                  {message}
                </p>

                <div className="success-message">
                  ✓ You are inside the classroom
                </div>
              </>
            )}


            {/* ================= ERROR ================= */}

            {status === "error" && (
              <>
                <div className="location-error-icon">
                  ⚠
                </div>

                <h2>
                  Location Verification Failed
                </h2>

                <p>
                  {message}
                </p>

                <button
                  className="retry-location-btn"
                  onClick={checkLocation}
                >
                  Try Again
                </button>
              </>
            )}

          </div>


          {/* ================= VERIFICATION STEPS ================= */}

          <div className="verification-card">

            <h2>
              Attendance Verification
            </h2>


            {/* QR */}

            <div className="verification-step completed">

              <div className="step-icon">
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


            {/* SELFIE */}

            <div className="verification-step completed">

              <div className="step-icon">
                ✓
              </div>

              <div>

                <strong>
                  Selfie Verified
                </strong>

                <p>
                  Your live selfie has been captured.
                </p>

              </div>

            </div>


            {/* LOCATION */}

            <div
              className={`verification-step ${
                status === "success"
                  ? "completed"
                  : "active"
              }`}
            >

              <div className="step-icon">

                {status === "success"
                  ? "✓"
                  : "3"}

              </div>

              <div>

                <strong>
                  Location Verification
                </strong>

                <p>

                  {status === "success"
                    ? "Your classroom location has been verified."
                    : "Checking your current location..."}

                </p>

              </div>

            </div>


            {/* ATTENDANCE */}

            <div
              className={`verification-step ${
                status === "success"
                  ? "active"
                  : ""
              }`}
            >

              <div className="step-icon">

                {status === "success"
                  ? "4"
                  : "4"}

              </div>

              <div>

                <strong>
                  Attendance Confirmed
                </strong>

                <p>

                  {status === "success"
                    ? "All verification checks have passed."
                    : "Attendance will be marked after all checks pass."}

                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ================= SECURITY BOX ================= */}

        <section className="location-security">

          <div>
            🔒
          </div>

          <div>

            <strong>
              Secure Location Verification
            </strong>

            <p>
              Your location is checked to ensure you are
              present inside the classroom during attendance.
            </p>

          </div>

        </section>

      </main>

    </div>
  );
}

export default LocationVerification;