import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import StaffLayout from "../components/StaffLayout.jsx";
import { getApiErrorMessage } from "../services/api.js";
import { StaffApiClient } from "../services/staffApi.js";
import "./StaffMedicineDetailPage.css";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "batches", label: "Batches" },
  { key: "movements", label: "Movement history" },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function StaffMedicineDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeTab = useMemo(() => {
    const tab = searchParams.get("tab") || "overview";
    return TABS.some((item) => item.key === tab) ? tab : "overview";
  }, [searchParams]);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await StaffApiClient.getMedicine(id);
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

  const medicine = detail?.medicine;

  return (
    <PageLayout dashboard>
      <StaffLayout
        title={medicine ? medicine.name : "Medicine detail"}
        description="Read-only inventory batches and stock movement history."
      >
        <div className="staff-medicine-detail dash-page-stack">
          <div className="staff-medicine-toolbar card">
            <Link to="/staff/pharmacy" className="btn btn-outline btn-sm">
              Back to pharmacy
            </Link>
            {medicine && (
              <span className={`status-badge ${medicine.isLowStock ? "status-badge-inactive" : "status-badge-active"}`}>
                {medicine.isLowStock ? "Low stock" : "OK"}
              </span>
            )}
          </div>

          {loading && (
            <div className="loading-state">
              <div className="loading-spinner" />
              Loading medicine detail...
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {!loading && medicine && (
            <>
              <section className="card staff-medicine-summary">
                <div>
                  <span>SKU</span>
                  <strong>{medicine.code}</strong>
                </div>
                <div>
                  <span>On hand</span>
                  <strong>
                    {medicine.stockQty} {medicine.unit}
                  </strong>
                </div>
                <div>
                  <span>Reorder level</span>
                  <strong>{medicine.minStockLevel}</strong>
                </div>
                <div>
                  <span>Price</span>
                  <strong>{formatCurrency(medicine.price)}</strong>
                </div>
              </section>

              <nav className="staff-medicine-tabs" aria-label="Medicine detail tabs">
                {TABS.map((tab) => (
                  <Link
                    key={tab.key}
                    to={`/staff/pharmacy/medicines/${medicine._id}?tab=${tab.key}`}
                    className={tab.key === activeTab ? "staff-medicine-tab is-active" : "staff-medicine-tab"}
                  >
                    {tab.label}
                  </Link>
                ))}
              </nav>

              {activeTab === "overview" && (
                <section className="card staff-medicine-panel">
                  <h3>Medicine profile</h3>
                  <dl className="staff-medicine-facts">
                    <div>
                      <dt>Name</dt>
                      <dd>{medicine.name}</dd>
                    </div>
                    <div>
                      <dt>Unit</dt>
                      <dd>{medicine.unit}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{medicine.isActive ? "Active" : "Inactive"}</dd>
                    </div>
                    <div>
                      <dt>Last updated</dt>
                      <dd>{formatDateTime(medicine.updatedAt)}</dd>
                    </div>
                  </dl>
                </section>
              )}

              {activeTab === "batches" && (
                <section className="card staff-medicine-panel">
                  <h3>Batches</h3>
                  {detail.batches.length === 0 ? (
                    <p className="text-muted">No batches recorded for this medicine.</p>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Batch</th>
                            <th>Inbound</th>
                            <th>Outbound</th>
                            <th>On hand</th>
                            <th>Expiry</th>
                            <th>Supplier</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.batches.map((batch) => (
                            <tr key={batch.batchNo}>
                              <td>{batch.batchNo}</td>
                              <td>{batch.inboundQty}</td>
                              <td>{batch.outboundQty}</td>
                              <td>{batch.onHandQty}</td>
                              <td>{formatDate(batch.expiryDate)}</td>
                              <td>{batch.supplierRefs?.join(", ") || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {activeTab === "movements" && (
                <section className="card staff-medicine-panel">
                  <h3>Movement history</h3>
                  {detail.movements.length === 0 ? (
                    <p className="text-muted">No stock movements recorded for this medicine.</p>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Qty</th>
                            <th>Batch</th>
                            <th>Expiry</th>
                            <th>Supplier</th>
                            <th>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.movements.map((row) => (
                            <tr key={row._id}>
                              <td>{formatDateTime(row.createdAt)}</td>
                              <td>{row.type}</td>
                              <td>{row.quantity}</td>
                              <td>{row.batchNo || "-"}</td>
                              <td>{formatDate(row.expiryDate)}</td>
                              <td>{row.supplierRef || "-"}</td>
                              <td>{row.note || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </StaffLayout>
    </PageLayout>
  );
}
