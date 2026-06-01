import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminDashboardPage() {
  const { fullName } = useAuth();

  return (
    <PageLayout>
      <div className="dashboard-welcome">
        <h1>Admin Console</h1>
        <p>Welcome, {fullName || "Administrator"}. Manage the OrcaXCare platform from here.</p>
        <span className="dashboard-role-badge">Administrator</span>
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
          <p>Update your administrator account details.</p>
          <span className="shortcut-arrow">Open →</span>
        </Link>
      </div>

      <div className="card info-panel">
        <h3 style={{ marginBottom: "0.75rem" }}>Coming in next sprint</h3>
        <p>
          Admin modules — Accounts, Specialties, Doctors, Departments — are planned for the next iteration.
          Authentication and doctor search are live in Iteration 1.
        </p>
      </div>
    </PageLayout>
  );
}
