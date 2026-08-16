import "../App.css";

function StudentProfile({ onBack }) {
  return (
    <div className="simple-page">

      <div className="simple-page-card">

        <button
          className="back-button"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>

        <div className="simple-page-header">

          <div className="simple-page-icon profile-page-icon">
            👤
          </div>

          <div>
            <h1>My Profile</h1>
            <p>View your student information</p>
          </div>

        </div>

        <div className="profile-section">

          <div className="profile-avatar">
            S
          </div>

          <div>
            <h2>Student</h2>
            <p>Student ID: AIT2026001</p>
          </div>

        </div>

        <div className="profile-details">

          <div className="profile-detail">
            <span>Student ID</span>
            <strong>AIT2026001</strong>
          </div>

          <div className="profile-detail">
            <span>Name</span>
            <strong>Student</strong>
          </div>

          <div className="profile-detail">
            <span>College</span>
            <strong>Acharya Institute of Technology</strong>
          </div>

          <div className="profile-detail">
            <span>Department</span>
            <strong>Computer Science & Engineering</strong>
          </div>

          <div className="profile-detail">
            <span>Academic Year</span>
            <strong>2026</strong>
          </div>

          <div className="profile-detail">
            <span>Account Status</span>
            <strong className="active-status">
              ✓ Active
            </strong>
          </div>

        </div>

      </div>

    </div>
  );
}

export default StudentProfile;