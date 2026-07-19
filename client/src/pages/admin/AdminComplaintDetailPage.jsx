import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";
import "./AdminComplaintsPage.css";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export default function AdminComplaintDetailPage() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [status, setStatus] = useState("open");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.getComplaint(id);
      setDetail(data);
      setStatus(data.complaint.status);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const onUpdateStatus = async () => {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const { data } = await AdminApiClient.updateComplaintStatus(id, status);
      setDetail(data);
      setMessage("Complaint status updated.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onReply = async (event) => {
    event.preventDefault();
    if (!reply.trim()) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const { data } = await AdminApiClient.replyToComplaint(id, reply.trim());
      setDetail(data);
      setReply("");
      setStatus(data.complaint.status);
      setMessage("Reply sent.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const complaint = detail?.complaint;
  const replies = detail?.replies || [];

  return (
    <PageLayout dashboard>
      <AdminLayout title="Complaint detail" description="Full thread, patient context, and status management.">
        <div className="admin-complaints-page dash-page-stack">
          <div className="admin-complaints-toolbar">
            <Link to="/admin/complaints" className="btn btn-outline btn-sm">Back to list</Link>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}
          {loading && <p className="admin-complaints-loading">Loading complaint…</p>}

          {complaint && (
            <>
              <section className="card admin-complaint-thread">
                <header className="admin-complaint-thread-head">
                  <div>
                    <h2>{complaint.subject}</h2>
                    <p>Submitted {new Date(complaint.createdAt).toLocaleString()}</p>
                    {complaint.statusUpdatedAt && (
                      <p className="admin-complaint-audit">
                        Status last updated {new Date(complaint.statusUpdatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <CustomSelect
                    label="Status"
                    value={status}
                    onChange={setStatus}
                    options={STATUS_OPTIONS}
                  />
                </header>
                <div className="admin-complaint-message is-original">
                  <strong>{complaint.patient?.fullName || "Patient"}</strong>
                  <p>{complaint.content}</p>
                </div>
                {replies.map((item) => (
                  <div key={item._id} className="admin-complaint-message">
                    <strong>{item.authorName} · {item.authorRole}</strong>
                    <p>{item.content}</p>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                ))}
                <div className="form-actions">
                  <button type="button" className="btn btn-primary" disabled={submitting} onClick={onUpdateStatus}>
                    Save status
                  </button>
                </div>
              </section>

              <section className="card admin-complaint-patient">
                <h3>Patient information</h3>
                <dl className="detail-list">
                  <div><dt>Name</dt><dd>{complaint.patient?.fullName || "—"}</dd></div>
                  <div><dt>Email</dt><dd>{complaint.patient?.email || "—"}</dd></div>
                  <div><dt>Phone</dt><dd>{complaint.patient?.phone || "—"}</dd></div>
                  <div><dt>Address</dt><dd>{complaint.patient?.address || "—"}</dd></div>
                </dl>
              </section>

              <form className="card form admin-complaint-reply" onSubmit={onReply}>
                <h3>Reply to patient</h3>
                <div className="filter-field form-grid-span-2">
                  <label className="filter-field-label" htmlFor="admin-complaint-reply">Message</label>
                  <textarea
                    id="admin-complaint-reply"
                    className="filter-field-control"
                    rows={4}
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={submitting || !reply.trim()}>
                    {submitting ? "Sending…" : "Send reply"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </AdminLayout>
    </PageLayout>
  );
}
