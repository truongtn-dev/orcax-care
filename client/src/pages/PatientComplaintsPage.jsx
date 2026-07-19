import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./PatientDashboardPage.css";
import "./PatientComplaintPage.css";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

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

export default function PatientComplaintsPage() {
  const [status, setStatus] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo(() => (status === "all" ? {} : { status }), [status]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    PatientApiClient.listComplaints(params)
      .then(({ data }) => {
        if (!active) return;
        setItems(data.items || []);
      })
      .catch((err) => {
        if (active) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params]);

  return (
    <PageLayout>
      <div className="patient-dashboard patient-complaint-page">
        <section className="patient-dashboard-hero patient-complaint-hero">
          <div className="patient-dashboard-hero-inner">
            <div className="patient-dashboard-hero-main">
              <p className="patient-dashboard-hero-eyebrow">Complaint handling</p>
              <h1>My complaints</h1>
              <p className="patient-dashboard-hero-lead">Track submitted complaint tickets, current status, and submission dates.</p>
              <div className="patient-dashboard-hero-actions">
                <Link to="/patient/complaints/new" className="btn btn-primary">Submit complaint</Link>
                <Link to="/patient" className="btn btn-outline">Back to dashboard</Link>
              </div>
            </div>
          </div>
        </section>

        {error && <div className="alert alert-error">{error}</div>}

        <section className="patient-complaint-card">
          <div className="patient-complaint-list-head">
            <div>
              <h2>Complaint tickets</h2>
              <p>{items.length} ticket{items.length === 1 ? "" : "s"} shown</p>
            </div>
            <CustomSelect
              label="Filter status"
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
            />
          </div>

          {loading ? (
            <div className="patient-complaint-empty">Loading complaints…</div>
          ) : items.length === 0 ? (
            <div className="patient-complaint-empty">No complaints match this filter.</div>
          ) : (
            <div className="patient-complaint-table-wrap">
              <table className="patient-complaint-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <Link to={`/patient/complaints/${item._id}`} className="table-link">
                          <strong>{item.ticketId}</strong>
                        </Link>
                      </td>
                      <td>{item.ticketType}</td>
                      <td>{item.category}</td>
                      <td><span className={`patient-complaint-status patient-complaint-status--${item.status}`}>{statusLabels[item.status] || item.status}</span></td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>{formatDate(item.statusUpdatedAt || item.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
