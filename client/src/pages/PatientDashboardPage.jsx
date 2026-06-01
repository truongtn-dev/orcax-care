import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const SHORTCUTS = [
  {
    to: "/search-doctors",
    title: "Search Doctors",
    description: "Find specialists by name, specialty, or department.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    to: "/change-password",
    title: "Change Password",
    description: "Keep your account secure with a strong password.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

export default function PatientDashboardPage() {
  const { fullName } = useAuth();

  return (
    <PageLayout>
      <div className="dashboard-welcome">
        <h1>Welcome back, {fullName?.split(" ")[0] || "Patient"}</h1>
        <p>Your health portal is ready. Explore services and manage your account below.</p>
        <span className="dashboard-role-badge">Patient</span>
      </div>

      <div className="shortcut-grid">
        {SHORTCUTS.map((s) => (
          <Link key={s.to} to={s.to} className="card shortcut card-hover">
            <div className="shortcut-icon">{s.icon}</div>
            <h3>{s.title}</h3>
            <p>{s.description}</p>
            <span className="shortcut-arrow">Open →</span>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
