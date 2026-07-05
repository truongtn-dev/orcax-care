import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";
import "./AdminComplaintsPage.css";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function statusLabel(status) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
}

export default function AdminComplaintsListPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listComplaints({ status: status || undefined });
      setItems(data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  return (
    <PageLayout dashboard>
      <AdminLayout title="Complaints" description="Review patient feedback and service issues.">
        <div className="admin-complaints-page dash-page-stack">
          <div className="card filters-card">
            <div className="filters-toolbar">
              <CustomSelect
                label="Status"
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS}
              />
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {loading && <p className="admin-complaints-loading">Loading complaints…</p>}

          {!loading && (
            <section className="card admin-complaints-list">
              {items.length === 0 ? (
                <p className="admin-complaints-empty">No complaints found.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Patient</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item._id}>
                          <td>{item.subject}</td>
                          <td>{item.patientName}</td>
                          <td>
                            <span className={`status-pill status-${item.status === "open" ? "pending" : item.status === "resolved" ? "active" : "cancelled"}`}>
                              {statusLabel(item.status)}
                            </span>
                          </td>
                          <td>{new Date(item.createdAt).toLocaleString()}</td>
                          <td>
                            <Link to={`/admin/complaints/${item._id}`} className="btn btn-outline btn-sm">
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </AdminLayout>
    </PageLayout>
  );
}
