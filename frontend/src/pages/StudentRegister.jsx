import { useState } from "react";
import "../App.css";

function StudentRegister({ onBackToLogin }) {

  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = (e) => {

    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    console.log("Student ID:", studentId);
    console.log("Name:", name);
    console.log("Email:", email);

    // Temporary registration
    // Later connect to backend API

    alert("Registration successful! Please login.");

    onBackToLogin();
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
            Create your student account to access the
            smart attendance management system.
          </p>

          <div className="features">

            <div className="feature">
              <div className="feature-icon">✓</div>
              <span>Secure student account</span>
            </div>

            <div className="feature">
              <div className="feature-icon">QR</div>
              <span>QR-based attendance</span>
            </div>

            <div className="feature">
              <div className="feature-icon">%</div>
              <span>Track attendance percentage</span>
            </div>

            <div className="feature">
              <div className="feature-icon">
                ⚡
              </div>
              <span>Fast attendance verification</span>
            </div>

          </div>

        </div>


        {/* RIGHT SIDE */}

        <div className="login-card register-card">

          <div className="card-a">
            A
          </div>

          <h2>
            Create Account
          </h2>

          <p className="login-subtitle">
            Register to access your student dashboard
          </p>


          <form onSubmit={handleRegister}>

            {/* STUDENT ID */}

            <div className="form-group">

              <label>
                Student ID
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  👤
                </span>

                <input
                  type="text"
                  placeholder="Enter your Student ID"
                  value={studentId}
                  onChange={(e) =>
                    setStudentId(e.target.value)
                  }
                  required
                />

              </div>

            </div>


            {/* NAME */}

            <div className="form-group">

              <label>
                Full Name
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  🧑
                </span>

                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  required
                />

              </div>

            </div>


            {/* EMAIL */}

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
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                />

              </div>

            </div>


            {/* PASSWORD */}

            <div className="form-group">

              <label>
                Password
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  🔒
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

            </div>


            {/* CONFIRM PASSWORD */}

            <div className="form-group">

              <label>
                Confirm Password
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  🔒
                </span>

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  required
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                >
                  {showConfirmPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

            </div>


            <button
              type="submit"
              className="login-button"
            >
              Create Account
            </button>

          </form>


          {/* BACK TO LOGIN */}

          <div className="signup-section">

            <span>
              Already have an account?
            </span>

            <button
              type="button"
              className="signup-link"
              onClick={onBackToLogin}
            >
              Login
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

export default StudentRegister;