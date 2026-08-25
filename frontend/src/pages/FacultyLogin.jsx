import { useState } from "react";
import { authAPI } from "../services/api";
import "../App.css";

function FacultyLogin({
  onLogin,
  onSwitchToStudent,
  onSwitchToAdmin,
  onSwitchRole,
  onNavigateToSignup,
  onForgotPassword,
}) {
  const [facultyId, setFacultyId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password
  const [authPage, setAuthPage] = useState("login"); // "login" | "forgot"
  const [forgotId, setForgotId] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  /*
   * LOGIN
   */
  const handleLogin = (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    const trimmedFacultyId = facultyId.trim();
    const trimmedPassword = password.trim();

    if (!trimmedFacultyId) {
      setMessage({
        text: "Please enter your Faculty ID.",
        type: "error",
      });
      return;
    }

    if (!trimmedPassword) {
      setMessage({
        text: "Please enter your password.",
        type: "error",
      });
      return;
    }

    setIsLoading(true);
    setMessage({
      text: "Authenticating Faculty credentials...",
      type: "success",
    });

    authAPI.login(trimmedFacultyId, trimmedPassword, "faculty")
      .then((res) => {
        setIsLoading(false);
        const resolvedUser = res.user || { identifier: trimmedFacultyId, role: "faculty", name: "Faculty" };
        localStorage.setItem("facultyLoggedIn", "true");
        localStorage.setItem("facultyId", resolvedUser.identifier || trimmedFacultyId);
        localStorage.setItem("currentUser", JSON.stringify(resolvedUser));
        if (typeof onLogin === "function") {
          onLogin(resolvedUser);
        }
      })
      .catch((err) => {
        setIsLoading(false);
        setMessage({
          text: err.message || "Invalid Faculty credentials. Please verify your ID and password.",
          type: "error",
        });
      });
  };

  /*
   * FORGOT PASSWORD
   */
  const handleForgotPasswordSubmit = (e) => {
    e.preventDefault();
    if (!forgotId.trim()) return;

    if (typeof onForgotPassword === "function") {
      onForgotPassword(forgotId);
    }
    setResetSent(true);
  };

  const switchToStudent = () => {
    if (typeof onSwitchToStudent === "function") {
      onSwitchToStudent();
    } else if (typeof onSwitchRole === "function") {
      onSwitchRole("student");
    }
  };

  const switchToAdmin = () => {
    if (typeof onSwitchToAdmin === "function") {
      onSwitchToAdmin();
    } else if (typeof onSwitchRole === "function") {
      onSwitchRole("admin");
    }
  };

  /*
   * FORGOT PASSWORD VIEW
   */
  if (authPage === "forgot") {
    return (
      <div className="login-page">
        <div className="background-overlay" />
        <div className="login-container">
          <div className="login-info">
            <div className="a-badge">A</div>
            <h1>
              Smart <span>Attendance</span>
              <br />
              System
            </h1>
            <p className="description">
              Reset your faculty password securely to regain access to your class dashboard.
            </p>
            <div className="features">
              <div className="feature">
                <div className="feature-icon">✓</div>
                <span>Secure faculty account recovery</span>
              </div>
              <div className="feature">
                <div className="feature-icon">🔒</div>
                <span>Encrypted credential management</span>
              </div>
            </div>
          </div>

          <div className="login-card">
            <div className="card-a">A</div>
            <h2>Reset Password</h2>
            <p className="login-subtitle">Faculty Account Recovery</p>

            {resetSent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "38px", marginBottom: "10px" }}>✉️</div>
                <strong style={{ display: "block", color: "#15803d", marginBottom: "8px" }}>
                  Reset Link Dispatched
                </strong>
                <p style={{ fontSize: "13.5px", color: "#475569", marginBottom: "20px" }}>
                  Password reset instructions have been dispatched to the faculty administrator email for{" "}
                  <strong>{forgotId}</strong>.
                </p>
                <button
                  type="button"
                  className="login-button"
                  onClick={() => {
                    setAuthPage("login");
                    setResetSent(false);
                    setForgotId("");
                  }}
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit}>
                <div className="form-group">
                  <label htmlFor="forgotId">Faculty ID</label>
                  <div className="input-wrapper">
                    <span className="input-icon">👨‍🏫</span>
                    <input
                      id="forgotId"
                      type="text"
                      placeholder="Enter your Faculty ID (e.g. FAC001)"
                      value={forgotId}
                      onChange={(e) => setForgotId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="login-button">
                  Send Reset Link
                </button>

                <div style={{ textAlign: "center", marginTop: "16px" }}>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "600", fontSize: "13.5px" }}
                    onClick={() => setAuthPage("login")}
                  >
                    ← Back to Faculty Login
                  </button>
                </div>
              </form>
            )}

            <div className="card-footer">
              <strong>Acharya Institute of Technology</strong>
              <span>Faculty Attendance Management System</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * MAIN FACULTY LOGIN VIEW (Exact same layout as Student Login)
   */
  return (
    <div className="login-page">
      <div className="background-overlay" />

      <div className="login-container">
        {/* LEFT SIDE HERO */}
        <div className="login-info">
          <div className="a-badge">A</div>

          <h1>
            Smart <span>Attendance</span>
            <br />
            System
          </h1>

          <p className="description">
            A secure and smart attendance management platform designed for the faculty of
            Acharya Institute of Technology.
          </p>

          <div className="features">
            <div className="feature">
              <div className="feature-icon">✓</div>
              <span>Secure faculty authentication</span>
            </div>

            <div className="feature">
              <div className="feature-icon">QR</div>
              <span>Dynamic 60s class QR generator</span>
            </div>

            <div className="feature">
              <div className="feature-icon">%</div>
              <span>Real-time student attendance tracking</span>
            </div>

            <div className="feature">
              <div className="feature-icon lightning">⚡</div>
              <span>Instant report generation & CSV export</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE LOGIN CARD */}
        <div className="login-card">
          <div className="card-a">A</div>

          <h2>Faculty Login</h2>

          <p className="login-subtitle">
            Sign in to manage classes and start attendance
          </p>

          <form onSubmit={handleLogin}>
            {/* Feedback Message */}
            {message.text && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  marginBottom: "14px",
                  fontSize: "13.5px",
                  fontWeight: "600",
                  textAlign: "center",
                  background: message.type === "error" ? "#fef2f2" : "#f0fdf4",
                  color: message.type === "error" ? "#dc2626" : "#15803d",
                  border: `1px solid ${message.type === "error" ? "#fecaca" : "#bbf7d0"}`,
                }}
              >
                {message.text}
              </div>
            )}

            {/* Faculty ID */}
            <div className="form-group">
              <label htmlFor="facultyId">Faculty ID</label>
              <div className="input-wrapper">
                <span className="input-icon">👨‍🏫</span>
                <input
                  id="facultyId"
                  type="text"
                  placeholder="Enter your Faculty ID (e.g. FAC001)"
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
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
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="forgot-password-container">
              <button
                type="button"
                className="forgot-password-button"
                onClick={() => setAuthPage("forgot")}
              >
                <span className="forgot-lock">🔒</span>
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>

            {/* Sign Up Link */}
            <div className="signup-container">
              <span>Don&apos;t have an account?</span>
              <button
                type="button"
                className="signup-button"
                onClick={() => {
                  if (typeof onNavigateToSignup === "function") {
                    onNavigateToSignup();
                  }
                }}
              >
                Sign Up
              </button>
            </div>

            {/* Switch Role Links */}
            <div
              style={{
                marginTop: "18px",
                paddingTop: "14px",
                borderTop: "1px solid #edf0f5",
                display: "flex",
                justifyContent: "center",
                gap: "18px",
                fontSize: "13px",
                color: "#6b7280",
              }}
            >
              <button
                type="button"
                onClick={switchToStudent}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                🎓 Student Portal
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={switchToAdmin}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                🛡️ Admin Portal
              </button>
            </div>
          </form>

          <div className="card-footer">
            <strong>Acharya Institute of Technology</strong>
            <span>Faculty Attendance Management System</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FacultyLogin;
