import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import ResendVerificationForm from "../components/ResendVerificationForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const SHORTCUTS = [
  {
    to: "/patient/book",
    title: "Book Appointment",
    description: "Start from doctor search and choose the right specialist for your visit.",
    badge: "Care",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M3 10h18" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M12 14v4" />
        <path d="M10 16h4" />
      </svg>
    ),
  },
  {
    to: "/patient/appointments",
    title: "Appointments",
    description: "Review upcoming and past appointments from your patient workspace.",
    badge: "Care",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </svg>
    ),
  },
  {
    to: "/patient/wallet",
    title: "Wallet",
    description: "Check patient wallet balance, billing shortcuts, and payment activity.",
    badge: "Billing",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
        <path d="M17 12h.01" />
        <path d="M14 10h6v6h-6a3 3 0 0 1 0-6z" />
      </svg>
    ),
  },
  {
    to: "/profile",
    title: "Profile",
    description: "Update your name, phone, address, DOB, and emergency contact.",
    badge: "Account",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    to: "/search-doctors",
    title: "Find Doctors",
    description: "Browse active doctors by specialty or department before booking.",
    badge: "Care",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
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
              <span className="shortcut-badge">{s.badge}</span>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
              <span className="shortcut-arrow">Open →</span>
            </Link>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal variant="up" delay={120}>
        <div className="card account-section">
          <div className="account-section-header">
            <div>
              <h3>Account Settings</h3>
              <p className="muted">Signed in as {email || "your account"}</p>
            </div>
            <Link to="/change-password" className="btn btn-outline">
              Change Password
            </Link>
          </div>
          <ResendVerificationForm defaultEmail={email} />
        </div>
      </ScrollReveal>
    </PageLayout>
  );
}
