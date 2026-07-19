import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./PatientDashboardPage.css";
import "./PatientComplaintPage.css";

const statusLabels = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function PatientComplaintDetailPage() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await PatientApiClient.getComplaint(id);
      setDetail(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const complaint = detail?.complaint;
  const replies = detail?.replies || [];

  return (
    <PageLayout>
      <div className="patient-dashboard patient-complaint-page">
        <section className="patient-dashboard-hero patient-complaint-hero">
          <div className="patient-dashboard-hero-inner">
            <div className="patient-dashboard-hero-main">
              <p className="patient-dashboard-hero-eyebrow">Complaint handling</p>
              <h1>Complaint detail</h1>
              <p className="patient-dashboard-hero-lead">
                Track the conversation and status updates for this ticket.
              </p>
              <div className="patient-dashboard-hero-actions">
                <Link to="/patient/complaints" className="btn btn-outline">
                  Back to my complaints
                </Link>
              </div>
            </div>
          </div>
        </section>

        {error && <div className="alert alert-error">{error}</div>}
        {loading && <div className="patient-complaint-empty">Loading complaint…</div>}

        {!loading && complaint && (
          <section className="patient-complaint-card patient-complaint-thread">
            <header className="patient-complaint-thread-head">
              <div>
                <h2>{complaint.subject}</h2>
                <p>
                  Ticket {complaint.ticketId} · Submitted {formatDate(complaint.createdAt)}
                </p>
              </div>
              <span className={`patient-complaint-status patient-complaint-status--${complaint.status}`}>
                {statusLabels[complaint.status] || complaint.status}
              </span>
            </header>

            <div className="patient-complaint-message is-original">
              <strong>You</strong>
              <p>{complaint.content || complaint.description}</p>
              {complaint.attachmentUrl && (
                <a
                  href={complaint.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="patient-complaint-attachment"
                >
                  View attachment
                </a>
              )}
              <span>{formatDate(complaint.createdAt)}</span>
            </div>

            {replies.map((item) => (
              <div key={item._id} className="patient-complaint-message">
                <strong>
                  {item.authorName}
                  {item.authorRole ? ` · ${item.authorRole}` : ""}
                </strong>
                <p>{item.content}</p>
                <span>{formatDate(item.createdAt)}</span>
              </div>
            ))}

            {replies.length === 0 && (
              <p className="patient-complaint-readonly-note">
                No replies yet. Our support team will respond here as soon as possible.
              </p>
            )}
          </section>
        )}
      </div>
    </PageLayout>
  );
}
