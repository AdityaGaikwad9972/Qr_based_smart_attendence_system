import { useState } from "react";
import { authAPI } from "../services/api";
import "../App.css";

function StudentLogin({
  onLogin,
  onSwitchToFaculty,
  onSwitchToAdmin,
  onSwitchRole,
  onNavigateToSignup,
}) {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Page state
  const [authPage, setAuthPage] = useState("login");

  // Forgot password
  const [forgotId, setForgotId] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Sign up
  const [signupData, setSignupData] = useState({
    studentId: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showSignupPassword, setShowSignupPassword] = useState(false);

  /*
   * LOGIN
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await authAPI.login(studentId, password, "student");
      setIsLoading(false);
      const userObj = res.user || { identifier: studentId, role: "student", name: "Student" };
      localStorage.setItem("currentUser", JSON.stringify(userObj));
      onLogin(userObj);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(err.message || "Invalid credentials. Please check your USN and password.");
    }
  };


  /*
   * FORGOT PASSWORD
   */
  const handleForgotPassword = (e) => {

    e.preventDefault();

    console.log("Password reset requested for:", forgotId);

    // Temporary frontend behavior
    setResetSent(true);
  };


  /*
   * SIGN UP
   */
  const handleSignup = (e) => {

    e.preventDefault();

    if (
      signupData.password !==
      signupData.confirmPassword
    ) {

      alert("Passwords do not match.");
      return;
    }

    console.log("New student registration:");
    console.log(signupData);

    // Later connect this to backend API

    alert(
      "Registration submitted successfully!"
    );

    // Return to login
    setAuthPage("login");

    setSignupData({
      studentId: "",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  };


  /*
   * UPDATE SIGNUP DATA
   */
  const handleSignupChange = (e) => {

    setSignupData({
      ...signupData,
      [e.target.name]: e.target.value,
    });

  };


  /*
   * =====================================================
   * FORGOT PASSWORD PAGE
   * =====================================================
   */

  if (authPage === "forgot") {

    return (

      <div className="login-page">

        <div className="background-overlay"></div>

        <div className="login-container">

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
              Reset your password securely and
              continue using the Smart Attendance
              System.
            </p>

            <div className="features">

              <div className="feature">
                <div className="feature-icon">
                  ✓
                </div>

                <span>
                  Secure account recovery
                </span>
              </div>

              <div className="feature">
                <div className="feature-icon">
                  🔒
                </div>

                <span>
                  Protected password reset
                </span>
              </div>

            </div>

          </div>


          <div className="login-card">

            <div className="card-a">
              🔒
            </div>

            <h2>
              Forgot Password?
            </h2>

            <p className="login-subtitle">
              Enter your Student ID to reset your password
            </p>


            {!resetSent ? (

              <form onSubmit={handleForgotPassword}>

                <div className="form-group">

                  <label htmlFor="forgotId">
                    Student ID
                  </label>

                  <div className="input-wrapper">

                    <span className="input-icon">
                      👤
                    </span>

                    <input
                      id="forgotId"
                      type="text"
                      placeholder="Enter your Student ID"
                      value={forgotId}
                      onChange={(e) =>
                        setForgotId(e.target.value)
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

            ) : (

              <div className="reset-success">

                <div className="reset-success-icon">
                  ✓
                </div>

                <h3>
                  Reset Link Sent
                </h3>

                <p>
                  If the Student ID is registered,
                  password reset instructions will
                  be sent to the registered email.
                </p>

              </div>

            )}


            <button
              type="button"
              className="back-auth-button"
              onClick={() => {
                setAuthPage("login");
                setResetSent(false);
                setForgotId("");
              }}
            >
              ← Back to Login
            </button>


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


  /*
   * =====================================================
   * SIGN UP PAGE
   * =====================================================
   */

  if (authPage === "signup") {

    return (

      <div className="login-page">

        <div className="background-overlay"></div>

        <div className="login-container">

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
              Create your student account to access
              attendance tracking and verification.
            </p>

            <div className="features">

              <div className="feature">

                <div className="feature-icon">
                  ✓
                </div>

                <span>
                  Secure student account
                </span>

              </div>

              <div className="feature">

                <div className="feature-icon">
                  QR
                </div>

                <span>
                  QR-based attendance
                </span>

              </div>

              <div className="feature">

                <div className="feature-icon">
                  %
                </div>

                <span>
                  Track attendance percentage
                </span>

              </div>

            </div>

          </div>


          <div className="login-card">

            <div className="card-a">
              A
            </div>

            <h2>
              Student Sign Up
            </h2>

            <p className="login-subtitle">
              Create your student account
            </p>


            <form onSubmit={handleSignup}>

              {/* Student ID */}

              <div className="form-group">

                <label>
                  Student ID
                </label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    👤
                  </span>

                  <input
                    name="studentId"
                    type="text"
                    placeholder="Enter your Student ID"
                    value={signupData.studentId}
                    onChange={handleSignupChange}
                    required
                  />

                </div>

              </div>


              {/* Name */}

              <div className="form-group">

                <label>
                  Full Name
                </label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    👤
                  </span>

                  <input
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={signupData.name}
                    onChange={handleSignupChange}
                    required
                  />

                </div>

              </div>


              {/* Email */}

              <div className="form-group">

                <label>
                  Email Address
                </label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    ✉
                  </span>

                  <input
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={signupData.email}
                    onChange={handleSignupChange}
                    required
                  />

                </div>

              </div>


              {/* Password */}

              <div className="form-group">

                <label>
                  Password
                </label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    🔒
                  </span>

                  <input
                    name="password"
                    type={
                      showSignupPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Create a password"
                    value={signupData.password}
                    onChange={handleSignupChange}
                    required
                  />

                  <button
                    type="button"
                    className="show-password"
                    onClick={() =>
                      setShowSignupPassword(
                        !showSignupPassword
                      )
                    }
                  >
                    {showSignupPassword
                      ? "Hide"
                      : "Show"}
                  </button>

                </div>

              </div>


              {/* Confirm Password */}

              <div className="form-group">

                <label>
                  Confirm Password
                </label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    🔒
                  </span>

                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={
                      signupData.confirmPassword
                    }
                    onChange={handleSignupChange}
                    required
                  />

                </div>

              </div>


              <button
                type="submit"
                className="login-button"
              >
                Create Account
              </button>

            </form>


            <button
              type="button"
              className="back-auth-button"
              onClick={() =>
                setAuthPage("login")
              }
            >
              ← Back to Login
            </button>


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


  /*
   * =====================================================
   * NORMAL LOGIN PAGE
   * =====================================================
   */

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
            A smart and secure attendance management
            platform designed for students of
            Acharya Institute of Technology.
          </p>

          <div className="features">

            <div className="feature">
              <div className="feature-icon">
                ✓
              </div>

              <span>
                Secure student authentication
              </span>
            </div>

            <div className="feature">
              <div className="feature-icon">
                QR
              </div>

              <span>
                Quick QR-based attendance
              </span>
            </div>

            <div className="feature">
              <div className="feature-icon">
                %
              </div>

              <span>
                Track your attendance percentage
              </span>
            </div>

            <div className="feature">

              <div className="feature-icon lightning">
                ⚡
              </div>

              <span>
                Fast and reliable attendance tracking
              </span>

            </div>

          </div>

        </div>


        {/* RIGHT SIDE */}

        <div className="login-card">

          <div className="card-a">
            A
          </div>

          <h2>
            Student Login
          </h2>

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
                  onChange={(e) =>
                    setStudentId(e.target.value)
                  }
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
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
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
                    setShowPassword(
                      !showPassword
                    )
                  }
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

            </div>


            {/* FORGOT PASSWORD */}

            <div className="forgot-password-container">

              <button
                type="button"
                className="forgot-password-button"
                onClick={() =>
                  setAuthPage("forgot")
                }
              >
                <span className="forgot-lock">
                  🔒
                </span>

                Forgot Password?
              </button>

            </div>


            {/* ERROR MESSAGE */}
            {errorMessage && (
              <div
                style={{
                  color: "#dc2626",
                  background: "#fef2f2",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "14px",
                  border: "1px solid #fecaca",
                  fontWeight: "600",
                }}
              >
                ⚠️ {errorMessage}
              </div>
            )}

            {/* LOGIN */}
            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? "Authenticating..." : "Login"}
            </button>


            {/* SIGN UP */}

            <div className="signup-container">

              <span>
                Don't have an account?
              </span>

              <button
                type="button"
                className="signup-button"
                onClick={() => {
                  if (typeof onNavigateToSignup === "function") {
                    onNavigateToSignup();
                  } else {
                    setAuthPage("signup");
                  }
                }}
              >
                Sign Up
              </button>

            </div>

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
                onClick={() => {
                  if (typeof onSwitchToFaculty === "function") {
                    onSwitchToFaculty();
                  } else if (typeof onSwitchRole === "function") {
                    onSwitchRole("faculty");
                  }
                }}
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
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  if (typeof onSwitchToAdmin === "function") {
                    onSwitchToAdmin();
                  } else if (typeof onSwitchRole === "function") {
                    onSwitchRole("admin");
                  }
                }}
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

export default StudentLogin;