import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DoctorLayout from "../components/DoctorLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import AppIcon from "../components/icons/AppIcon.jsx";
import { getApiErrorMessage } from "../services/api.js";
import { DoctorApiClient } from "../services/doctorApi.js";
import { exportPrescriptionPdf } from "../utils/exportPrescriptionPdf.js";
import "./DoctorPrescriptionsPage.css";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
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

export default function DoctorPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [exportingId, setExportingId] = useState("");

  const loadPrescriptions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, pageSize, sort };
      if (keyword.trim()) {
        params.keyword = keyword.trim();
      }
      if (status !== "all") {
        params.status = status;
      }

      const { data } = await DoctorApiClient.listPrescriptions(params);
      setPrescriptions(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sort, keyword, status]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const handleExportPdf = async (id) => {
    setExportingId(id);
    setError("");
    try {
      const { data } = await DoctorApiClient.getPrescription(id);
      await exportPrescriptionPdf(data);
    } catch (err) {
      setError(getApiErrorMessage(err) || "Failed to export PDF");
    } finally {
      setExportingId("");
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadPrescriptions();
  };

  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  const pageSummary = loading
    ? "Loading prescriptions list…"
    : total > 0
      ? `Found ${total} prescription${total === 1 ? "" : "s"}`
      : "Review all your issued and draft patient prescriptions.";

  return (
    <PageLayout dashboard>
      <DoctorLayout title="My prescriptions" description={pageSummary}>
        <div className="card prescriptions-toolbar-card">
          <form className="prescriptions-filters" onSubmit={handleSearchSubmit}>
            <div className="search-box-container">
              <input
                type="text"
                placeholder="Search patient name, MRN..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="search-input-field"
              />
              <button type="submit" className="btn btn-primary search-btn" disabled={loading}>
                <AppIcon name="search" size={16} />
                <span>Search</span>
              </button>
            </div>

            <div className="dropdowns-container">
              <CustomSelect
                label="Status"
                value={status}
                onChange={handleFilterChange(setStatus)}
                options={STATUS_OPTIONS}
              />
              <CustomSelect
                label="Sort by"
                value={sort}
                onChange={handleFilterChange(setSort)}
                options={SORT_OPTIONS}
              />
              <button
                type="button"
                className="btn btn-outline refresh-btn"
                onClick={() => {
                  setPage(1);
                  loadPrescriptions();
                }}
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </form>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <section className="card prescriptions-table-card">
          {loading ? (
            <div className="empty-state-cell">Loading prescriptions…</div>
          ) : prescriptions.length === 0 ? (
            <div className="empty-state-cell">No prescriptions found matching current filters.</div>
          ) : (
            <>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Created date</th>
                      <th>Patient name</th>
                      <th>Patient MRN</th>
                      <th>Status</th>
                      <th>Medications</th>
                      <th className="table-actions-col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((prescription) => (
                      <tr key={prescription._id}>
                        <td>
                          {new Date(prescription.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td>
                          <strong>{prescription.patientName}</strong>
                        </td>
                        <td>
                          <code className="patient-mrn-code">{prescription.patientMRN}</code>
                        </td>
                        <td>
                          <span className={statusClassName(prescription.status)}>
                            {formatStatus(prescription.status)}
                          </span>
                        </td>
                        <td>
                          <span className="medications-badge">
                            {prescription.totalMedications} item(s)
                          </span>
                        </td>
                        <td className="table-actions-col">
                          <div className="prescriptions-row-actions">
                            <Link to={`/doctor/prescriptions/${prescription._id}`} className="btn btn-outline btn-sm">
                              View details
                            </Link>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={exportingId === prescription._id}
                              onClick={() => handleExportPdf(prescription._id)}
                            >
                              {exportingId === prescription._id ? "Exporting…" : "Download PDF"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="prescriptions-pagination">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="btn btn-outline btn-sm prev-page-btn"
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="btn btn-outline btn-sm next-page-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </DoctorLayout>
    </PageLayout>
  );
}
