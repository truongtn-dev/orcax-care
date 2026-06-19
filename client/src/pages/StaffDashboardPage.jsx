import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import StaffLayout from "../components/StaffLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function StaffDashboardPage() {
  const { fullName } = useAuth();

  return (
    <PageLayout dashboard>
      <StaffLayout
        title="Staff overview"
        description={`Welcome back${fullName ? `, ${fullName}` : ""}. Use the sidebar to manage your account or look up doctors for patients.`}
      >
        <div className="shortcut-grid">
          <Link to="/search-doctors" className="card shortcut card-hover">
            <span className="shortcut-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 2v2M5 2v2" />
                <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
                <path d="M8 15a6 6 0 0 0 12 0v-2" />
              </svg>
            </span>
            <h3>Find doctors</h3>
            <p>Search the public doctor directory to assist patients at the front desk.</p>
          </Link>

          <Link to="/staff/pharmacy" className="card shortcut card-hover">
            <span className="shortcut-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.5 20.5 3.5 13.5" />
                <path d="M14 4l6 6" />
                <path d="m21 3-3 3" />
                <path d="M11 13 8 10" />
              </svg>
            </span>
            <h3>Pharmacy stock</h3>
            <p>Record inbound deliveries and monitor low-stock medicines.</p>
          </Link>

          <Link to="/profile" className="card shortcut card-hover">
            <span className="shortcut-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <h3>My profile</h3>
            <p>View and update your contact information.</p>
          </Link>

          <Link to="/change-password" className="card shortcut card-hover">
            <span className="shortcut-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <h3>Change password</h3>
            <p>Keep your staff account secure with a new password.</p>
          </Link>
        </div>
      </StaffLayout>
    </PageLayout>
  );
}
