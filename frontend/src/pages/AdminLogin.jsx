import { useState } from "react";
import { authAPI } from "../services/api";
import "../App.css";

function AdminLogin({
  onLogin,
  onSwitchToStudent,
  onSwitchToFaculty,
  onSwitchRole,
  onNavigateToSignup,
}) {
  const [adminId, setAdminId] = useState("");
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

    const trimmedAdminId = adminId.trim();
    const trimmedPassword = password.trim();

    if (!trimmedAdminId) {
      setMessage({
        text: "Please enter your Admin ID.",
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
      text: "Verifying Institutional Administrator credentials...",
      type: "success",
    });

    authAPI.login(trimmedAdminId, trimmedPassword, "admin")
      .then((res) => {
        setIsLoading(false);
        const resolvedUser = res.user || { identifier: trimmedAdminId, role: "admin", name: "Institutional Administrator" };
        localStorage.setItem("adminLoggedIn", "true");
        localStorage.setItem("adminId", resolvedUser.identifier || trimmedAdminId);
        localStorage.setItem("currentUser", JSON.stringify(resolvedUser));
        if (typeof onLogin === "function") {
          onLogin(resolvedUser);
        }
      })
      .catch((err) => {
        setIsLoading(false);
        setMessage({
          text: err.message || "Invalid Admin credentials. Please check your ID and password.",
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
    setResetSent(true);
  };

  const switchToStudent = () => {
    if (typeof onSwitchToStudent === "function") {
      onSwitchToStudent();
    } else if (typeof onSwitchRole === "function") {
      onSwitchRole("student");
    }
  };

  const switchToFaculty = () => {
    if (typeof onSwitchToFaculty === "function") {
      onSwitchToFaculty();
    } else if (typeof onSwitchRole === "function") {
      onSwitchRole("faculty");
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
              Secure administrator access recovery for Acharya Institute of Technology.
            </p>
            <div className="features">
              <div className="feature">
                <div className="feature-icon">🛡️</div>
                <span>Superadmin verification & recovery</span>
              </div>
              <div className="feature">
                <div className="feature-icon">🔒</div>
                <span>High-grade institutional encryption</span>
              </div>
            </div>
          </div>

          <div className="login-card">
            <div className="card-a">A</div>
            <h2>Admin Recovery</h2>
            <p className="login-subtitle">Administrator Account Recovery</p>

            {resetSent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "38px", marginBottom: "10px" }}>🛡️</div>
                <strong style={{ display: "block", color: "#15803d", marginBottom: "8px" }}>
                  Verification Dispatched
                </strong>
                <p style={{ fontSize: "13.5px", color: "#475569", marginBottom: "20px" }}>
                  A root security token and reset link has been dispatched to the principal institutional email for{" "}
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
                  <label htmlFor="forgotAdminId">Admin ID</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🛡️</span>
                    <input
                      id="forgotAdminId"
                      type="text"
                      placeholder="Enter Admin ID (e.g. ADM001)"
                      value={forgotId}
                      onChange={(e) => setForgotId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="login-button">
                  Send Recovery Link
                </button>

                <div style={{ textAlign: "center", marginTop: "16px" }}>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "600", fontSize: "13.5px" }}
                    onClick={() => setAuthPage("login")}
                  >
                    ← Back to Admin Login
                  </button>
                </div>
              </form>
            )}

            <div className="card-footer">
              <strong>Acharya Institute of Technology</strong>
              <span>Central Administrative Management Portal</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * MAIN ADMIN LOGIN VIEW
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
            Centralized administrative portal for Acharya Institute of Technology. Manage academic departments,
            faculty credentials, student registries, and institutional audit logs.
          </p>

          <div className="features">
            <div className="feature">
              <div className="feature-icon">🛡️</div>
              <span>Institutional access & security control</span>
            </div>

            <div className="feature">
              <div className="feature-icon">👥</div>
              <span>Faculty & student directory management</span>
            </div>

            <div className="feature">
              <div className="feature-icon">🏫</div>
              <span>Department & class session administration</span>
            </div>

            <div className="feature">
              <div className="feature-icon lightning">⚡</div>
              <span>Campus-wide attendance auditing & analytics</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE LOGIN CARD */}
        <div className="login-card">
          <div className="card-a">A</div>

          <h2>Admin Login</h2>

          <p className="login-subtitle">
            Sign in with institutional administrator credentials
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

            {/* Admin ID */}
            <div className="form-group">
              <label htmlFor="adminId">Admin ID</label>
              <div className="input-wrapper">
                <span className="input-icon">🛡️</span>
                <input
                  id="adminId"
                  type="text"
                  placeholder="Enter your Admin ID (e.g. ADM001)"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
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
              {isLoading ? "Authenticating..." : "Login as Admin"}
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
                onClick={switchToFaculty}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                👨‍🏫 Faculty Portal
              </button>
            </div>
          </form>

          <div className="card-footer">
            <strong>Acharya Institute of Technology</strong>
            <span>Central Administrative Management Portal</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
