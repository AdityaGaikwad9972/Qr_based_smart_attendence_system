import { useState } from "react";
import "../App.css";

function StudentLogin({ onLogin }) {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();

    console.log("Student ID:", studentId);
    console.log("Password:", password);

    // Temporary login
    // Later we will connect this to the backend/API
    onLogin();
  };

  return (
    <div className="login-page">

      {/* Background overlay */}
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
            A smart and secure attendance management platform designed for
            students of Acharya Institute of Technology.
          </p>

          <div className="features">

            <div className="feature">
              <div className="feature-icon">✓</div>
              <span>Secure student authentication</span>
            </div>

            <div className="feature">
              <div className="feature-icon">QR</div>
              <span>Quick QR-based attendance</span>
            </div>

            <div className="feature">
              <div className="feature-icon">%</div>
              <span>Track your attendance percentage</span>
            </div>

            <div className="feature">
              <div className="feature-icon lightning">⚡</div>
              <span>Fast and reliable attendance tracking</span>
            </div>

          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="login-card">

          <div className="card-a">
            A
          </div>

          <h2>Student Login</h2>

          <p className="login-subtitle">
            Sign in to access your attendance dashboard
          </p>

          <form onSubmit={handleLogin}>

            {/* Student ID */}
            <div className="form-group">

              <label htmlFor="studentId">
                Student ID
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  👤
                </span>

                <input
                  id="studentId"
                  type="text"
                  placeholder="Enter your Student ID"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />

              </div>

            </div>

            {/* Password */}
            <div className="form-group">

              <label htmlFor="password">
                Password
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  🔒
                </span>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>

              </div>

            </div>

            <button
              type="submit"
              className="login-button"
            >
              Login
            </button>

          </form>

          <div className="card-footer">
            <strong>Acharya Institute of Technology</strong>
            <span>
              Student Attendance Management System
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}

export default StudentLogin;