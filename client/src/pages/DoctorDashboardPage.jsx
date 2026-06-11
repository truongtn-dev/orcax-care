import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function DoctorDashboardPage() {
  const { fullName } = useAuth();

  return (
    <PageLayout>
      <ScrollReveal variant="up">
        <div className="dashboard-welcome">
          <h1>Doctor workspace</h1>
          <p>
            Hello, Dr. {fullName?.split(" ").slice(-1)[0] || fullName || "Doctor"}. Your workspace is ready.
          </p>
          <span className="dashboard-role-badge">Doctor</span>
        </div>
      </ScrollReveal>

      <div className="shortcut-grid scroll-stagger-grid">
        <ScrollReveal variant="float">
          <Link to="/doctor/schedule" className="card shortcut card-hover">
            <div className="shortcut-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M8 2v4M16 2v4M3 10h18" />
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
              </svg>
            </div>
            <h3>Schedule calendar</h3>
            <p>Week/day view of available, booked, and blocked slots.</p>
            <span className="shortcut-arrow">Open calendar →</span>
          </Link>
        </ScrollReveal>
        <ScrollReveal variant="float">
          <Link to="/doctor/work-shifts" className="card shortcut card-hover">
            <div className="shortcut-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <h3>My work shifts</h3>
            <p>View your weekly shift schedule (read-only).</p>
            <span className="shortcut-arrow">Open schedule →</span>
          </Link>
        </ScrollReveal>
        <ScrollReveal variant="float">
          <Link to="/profile" className="card shortcut card-hover">
            <div className="shortcut-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3>Update profile</h3>
            <p>Edit your professional bio and contact information.</p>
            <span className="shortcut-arrow">View details →</span>
          </Link>
        </ScrollReveal>
      </div>

      <ScrollReveal variant="up" delay={100}>
        <div className="card info-panel">
          <h3 style={{ marginBottom: "0.75rem" }}>Phase 1 — Foundation</h3>
          <p>
            This is the core workspace for doctors. Appointment management, patient records, and clinical workflows will be added in upcoming phases.
          </p>
        </div>
      </ScrollReveal>
    </PageLayout>
  );
}
