import PageLayout from "../components/PageLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminDashboardPage() {
  const { fullName } = useAuth();

  return (
    <PageLayout>
      <div className="dashboard">
        <h1>Admin Dashboard</h1>
        <p className="muted">Welcome, {fullName || "Administrator"}.</p>
        <div className="card">
          <p>
            Admin modules (Accounts, Specialties, Doctors, …) are planned for the next sprint.
            Auth and Search Doctors are live in Iteration 1.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
