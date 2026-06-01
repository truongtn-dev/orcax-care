import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function DoctorDashboardPage() {
  const { fullName } = useAuth();

  return (
    <PageLayout>
      <div className="dashboard-welcome">
        <h1>Doctor Portal</h1>
        <p>Welcome, Dr. {fullName?.split(" ").slice(-1)[0] || fullName || "Doctor"}. Your clinical workspace awaits.</p>
        <span className="dashboard-role-badge">Doctor</span>
      </div>

      <div className="shortcut-grid">
        <Link to="/profile" className="card shortcut card-hover">
          <div className="shortcut-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h3>Edit Profile</h3>
          <p>Update your bio and contact information.</p>
          <span className="shortcut-arrow">Open →</span>
        </Link>
      </div>

      <div className="card info-panel">
        <h3 style={{ marginBottom: "0.75rem" }}>Iteration 1 — Foundation</h3>
        <p>
          This is your doctor console shell for Iteration 1. Appointment management, patient records, and clinical
          modules will arrive in Iteration 2.
        </p>
      </div>
    </PageLayout>
  );
}
