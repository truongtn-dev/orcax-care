import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";

const CONTENT = {
  book: {
    title: "Book Appointment",
    description: "Booking will start from the doctor search flow once appointment slots are connected.",
    primaryLabel: "Find Doctors",
    primaryTo: "/search-doctors",
  },
  appointments: {
    title: "Appointments",
    description: "Your upcoming and past appointments will appear here when appointment management is available.",
    primaryLabel: "Find Doctors",
    primaryTo: "/search-doctors",
  },
  wallet: {
    title: "Wallet",
    description: "Wallet balance and billing activity will be shown here after payment features are connected.",
    primaryLabel: "Back to Dashboard",
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
        <h3>{content.title} is coming soon</h3>
        <p>This patient-only page is ready for the next module integration.</p>
        <div className="form-actions">
          <Link to={content.primaryTo} className="btn btn-primary">
            {content.primaryLabel}
          </Link>
          <Link to="/patient" className="btn btn-outline">
            Patient Dashboard
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
