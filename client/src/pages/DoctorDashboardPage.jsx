import PageLayout from "../components/PageLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function DoctorDashboardPage() {
  const { fullName } = useAuth();

  return (
    <PageLayout>
      <div className="dashboard">
        <h1>Doctor Dashboard</h1>
        <p className="muted">Welcome, {fullName || "Doctor"}.</p>
        <div className="card">
          <p>Doctor console shell for Iteration 1. Clinical modules arrive in Iteration 2.</p>
        </div>
      </div>
    </PageLayout>
  );
}
