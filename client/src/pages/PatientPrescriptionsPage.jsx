import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import { getApiErrorMessage } from "../services/api.js";
import { PatientApiClient } from "../services/patientApi.js";
import { exportPrescriptionPdf } from "../utils/exportPrescriptionPdf.js";
import "../styles/patient.shared.css";
import "./DoctorPrescriptionsPage.css";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "issued", label: "Issued" },
  { value: "dispensed", label: "Dispensed" },
  { value: "cancelled", label: "Cancelled" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

function formatStatus(status) {
  if (!status) return "";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusClassName(status) {
  const mapping = {
    draft: "status-pill status-draft",
    issued: "status-pill status-active",
    dispensed: "status-pill status-completed",
    cancelled: "status-pill status-cancelled",
  };
  return mapping[status] || "status-pill";
}

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [exportingId, setExportingId] = useState("");

  const loadPrescriptions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, pageSize, sort };
      if (status !== "all") params.status = status;
      const { data } = await PatientApiClient.listPrescriptions(params);
      setPrescriptions(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sort, status]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const handleExportPdf = async (id) => {
    setExportingId(id);
    setError("");
    try {
      const { data } = await PatientApiClient.getPrescription(id);
      await exportPrescriptionPdf(data);
    } catch (err) {
      setError(getApiErrorMessage(err) || "Failed to export PDF");
    } finally {
      setExportingId("");
    }
  };

  return (
    <PageLayout>
      <div className="prescription-detail-page">
        <div className="patient-panel" style={{ padding: "1.25rem" }}>
          <div className="doctor-rx-lines-head" style={{ marginBottom: "1rem" }}>
            <div>
              <p className="patient-section-label">Prescriptions</p>
              <h1 style={{ margin: 0 }}>My prescriptions</h1>
              <p style={{ margin: "0.35rem 0 0", color: "var(--color-text-secondary)" }}>
                Past prescriptions from your clinical visits. Download PDF anytime.
              </p>
            </div>
            <Link to="/patient/emr" className="btn btn-outline btn-sm">
              Back to EMR
            </Link>
          </div>

          <div className="filter-bar" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <CustomSelect
              label="Status"
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={STATUS_OPTIONS}
            />
            <CustomSelect
              label="Sort"
              value={sort}
              onChange={(value) => {
                setSort(value);
                setPage(1);
              }}
              options={SORT_OPTIONS}
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <p>Loading prescriptions…</p>
          ) : prescriptions.length === 0 ? (
            <p className="doctor-encounter-empty">No prescriptions found.</p>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Doctor</th>
                    <th>Visit</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th className="table-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((rx) => (
                    <tr key={rx._id}>
                      <td>{new Date(rx.createdAt).toLocaleDateString()}</td>
                      <td>
                        <strong>{rx.doctorName}</strong>
                      </td>
                      <td>{rx.chiefComplaint || (rx.visitDate ? new Date(rx.visitDate).toLocaleDateString() : "—")}</td>
                      <td>
                        <span className={statusClassName(rx.status)}>{formatStatus(rx.status)}</span>
                      </td>
                      <td>{formatMoney(rx.totalAmount)}</td>
                      <td className="table-actions-col">
                        <div style={{ display: "inline-flex", gap: "0.35rem", flexWrap: "wrap" }}>
                          <Link to={`/patient/prescriptions/${rx._id}`} className="btn btn-outline btn-sm">
                            View
                          </Link>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={exportingId === rx._id}
                            onClick={() => handleExportPdf(rx._id)}
                          >
                            {exportingId === rx._id ? "Exporting…" : "Download PDF"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="prescriptions-pagination">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
