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
