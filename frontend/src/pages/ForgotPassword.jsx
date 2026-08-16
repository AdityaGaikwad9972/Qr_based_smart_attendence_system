import { useState } from "react";
import "../App.css";

function ForgotPassword({ onBackToLogin }) {

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {

    e.preventDefault();

    console.log("Password reset requested for:", email);

    // Temporary implementation
    // Later connect to backend API

    setSubmitted(true);
  };


  return (
    <div className="login-page">

      <div className="background-overlay"></div>

      <div className="login-container">

        {/* LEFT SIDE */}

        <div className="login-info">

          <div className="a-badge">
            A
          </div>

          <h1>
            Smart <span>Attendance</span>
            <br />
            System
          </h1>

          <p className="description">
            Recover your account securely and continue
            using the Smart Attendance System.
          </p>

          <div className="features">

            <div className="feature">
              <div className="feature-icon">🔒</div>
              <span>Secure account recovery</span>
            </div>

            <div className="feature">
              <div className="feature-icon">✓</div>
              <span>Protected student accounts</span>
            </div>

            <div className="feature">
              <div className="feature-icon">✉</div>
              <span>Password reset through email</span>
            </div>

          </div>

        </div>


        {/* RIGHT SIDE */}

        <div className="login-card">

          <div className="card-a">
            A
          </div>

          {!submitted ? (

            <>

              <h2>
                Forgot Password?
              </h2>

              <p className="login-subtitle">
                Enter your registered email to reset
                your password.
              </p>


              <form onSubmit={handleSubmit}>

                <div className="form-group">

                  <label>
                    Email
                  </label>

                  <div className="input-wrapper">

                    <span className="input-icon">
                      ✉️
                    </span>

                    <input
                      type="email"
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      required
                    />

                  </div>

                </div>


                <button
                  type="submit"
                  className="login-button"
                >
                  Send Reset Link
                </button>

              </form>

            </>

          ) : (

            <div className="reset-success">

              <div className="reset-success-icon">
                ✓
              </div>

              <h2>
                Check Your Email
              </h2>

              <p className="login-subtitle">
                If an account exists with this email,
                you will receive instructions to reset
                your password.
              </p>

            </div>

          )}


          {/* BACK TO LOGIN */}

          <div className="signup-section">

            <button
              type="button"
              className="signup-link"
              onClick={onBackToLogin}
            >
              ← Back to Login
            </button>

          </div>


          <div className="card-footer">

            <strong>
              Acharya Institute of Technology
            </strong>

            <span>
              Student Attendance Management System
            </span>

          </div>

        </div>

      </div>

    </div>
  );
}

export default ForgotPassword;