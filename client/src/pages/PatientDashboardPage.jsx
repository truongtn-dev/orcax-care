import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import ResendVerificationForm from "../components/ResendVerificationForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const SHORTCUTS = [
  {
    to: "/profile",
    title: "Edit Profile",
    description: "Update your name, phone, and personal details.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
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
  const { fullName, email } = useAuth();

  return (
    <PageLayout>
      <ScrollReveal variant="up">
        <div className="dashboard-welcome">
          <h1>Welcome back, {fullName?.split(" ")[0] || "Patient"}</h1>
          <p>Your health portal is ready. Explore services and manage your account below.</p>
          <span className="dashboard-role-badge">Patient</span>
        </div>
      </ScrollReveal>

      <div className="shortcut-grid scroll-stagger-grid">
        {SHORTCUTS.map((s, i) => (
          <ScrollReveal key={s.to} variant="float" delay={i * 100}>
            <Link to={s.to} className="card shortcut card-hover">
              <div className="shortcut-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
              <span className="shortcut-arrow">Open →</span>
            </Link>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal variant="up" delay={120}>
        <div className="card account-section">
        <h3>Account Settings</h3>
        <p className="muted">Signed in as {email || "your account"}</p>
        <ResendVerificationForm defaultEmail={email} />
        </div>
      </ScrollReveal>
    </PageLayout>
  );
}
