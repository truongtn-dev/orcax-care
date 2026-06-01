import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function PatientDashboardPage() {
  const { fullName } = useAuth();

  return (
    <PageLayout>
      <div className="dashboard">
        <h1>Patient Dashboard</h1>
        <p className="muted">Welcome back, {fullName || "Patient"}.</p>
        <div className="shortcut-grid">
          <Link to="/search-doctors" className="card shortcut">
            <h3>Search Doctors</h3>
            <p>Find specialists and book (Iter 2)</p>
          </Link>
          <Link to="/change-password" className="card shortcut">
            <h3>Change Password</h3>
            <p>Update your account security</p>
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
