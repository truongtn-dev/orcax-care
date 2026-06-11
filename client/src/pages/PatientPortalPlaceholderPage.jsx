import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";

const CONTENT = {
  book: {
    title: "Book an appointment",
    description: "Online booking will be available once appointment slots are connected. You can browse doctors in the meantime.",
    primaryLabel: "Find a doctor",
    primaryTo: "/search-doctors",
  },
  appointments: {
    title: "Appointments",
    description: "Upcoming appointments and visit history will appear here when this feature is released.",
    primaryLabel: "Find a doctor",
    primaryTo: "/search-doctors",
  },
  wallet: {
    title: "Wallet",
    description: "Wallet balance and payment history will appear here when payments are fully enabled.",
    primaryLabel: "Back to dashboard",
    primaryTo: "/patient",
  },
};

export default function PatientPortalPlaceholderPage({ type }) {
  const content = CONTENT[type] || CONTENT.appointments;

  return (
    <PageLayout>
      <div className="page-header">
        <h1>{content.title}</h1>
        <p>{content.description}</p>
      </div>

      <div className="card empty-state">
        <div className="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M8 12h8" />
            <path d="M8 16h5" />
          </svg>
        </div>
        <h3>{content.title} — Coming soon</h3>
        <p>This feature is under development and will be available on the platform soon.</p>
        <div className="form-actions">
          <Link to={content.primaryTo} className="btn btn-primary">
            {content.primaryLabel}
          </Link>
          <Link to="/patient" className="btn btn-outline">
            Back to dashboard
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
