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
