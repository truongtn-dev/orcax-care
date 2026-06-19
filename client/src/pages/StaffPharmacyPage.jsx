import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import StaffLayout from "../components/StaffLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import { StaffApiClient } from "../services/staffApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./StaffPharmacyPage.css";

const EMPTY_INBOUND = {
  medicineId: "",
  quantity: "",
  batchNo: "",
  expiryDate: "",
  supplierRef: "",
  note: "",
};

export default function StaffPharmacyPage() {
  const [dashboard, setDashboard] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState(EMPTY_INBOUND);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashRes, medRes, moveRes] = await Promise.all([
        StaffApiClient.getPharmacyDashboard(),
        StaffApiClient.listMedicines(),
        StaffApiClient.listStockMovements({ limit: 20 }),
      ]);
      setDashboard(dashRes.data);
      setMedicines(medRes.data.items || []);
      setMovements(moveRes.data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const medicineOptions = [
    { value: "", label: "Select medicine" },
    ...medicines.map((med) => ({
      value: med._id,
      label: `${med.name} (${med.code}) — ${med.stockQty} ${med.unit}`,
    })),
  ];

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const { data } = await StaffApiClient.stockInbound({
        ...form,
        quantity: Number(form.quantity),
      });
      setMessage(data.message || "Stock inbound recorded.");
      setForm(EMPTY_INBOUND);
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout dashboard>
      <StaffLayout
        title="Pharmacy inventory"
        description="Record stock inbound and monitor on-hand quantities."
        actions={
          <Link to="/staff" className="btn btn-secondary btn-sm">
            Back to overview
          </Link>
        }
      >
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            Loading pharmacy…
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {!loading && (
          <>
            <div className="staff-pharmacy-stats">
              <div className="card staff-pharmacy-stat">
                <span className="staff-pharmacy-stat-label">Medicines</span>
                <strong>{dashboard?.medicineCount ?? 0}</strong>
              </div>
              <div className="card staff-pharmacy-stat">
                <span className="staff-pharmacy-stat-label">Low stock</span>
                <strong>{dashboard?.lowStockCount ?? 0}</strong>
              </div>
              <div className="card staff-pharmacy-stat">
                <span className="staff-pharmacy-stat-label">Inbound today</span>
                <strong>{dashboard?.inboundToday ?? 0}</strong>
              </div>
            </div>

            <div className="staff-pharmacy-grid">
              <form className="card form-card staff-pharmacy-form" onSubmit={onSubmit}>
                <h3>Stock inbound</h3>
                <p className="form-help">Increase on-hand quantity with batch and supplier reference.</p>
                <div className="form-grid">
                  <CustomSelect
                    label="Medicine *"
                    value={form.medicineId}
                    onChange={(medicineId) => setForm((current) => ({ ...current, medicineId }))}
                    options={medicineOptions}
                  />
                  <label className="form-field">
                    <span>Quantity *</span>
                    <input
                      name="quantity"
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Batch number *</span>
                    <input
                      name="batchNo"
                      value={form.batchNo}
                      onChange={(e) => setForm((current) => ({ ...current, batchNo: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Expiry date</span>
                    <input
                      name="expiryDate"
                      type="date"
                      value={form.expiryDate}
                      onChange={(e) => setForm((current) => ({ ...current, expiryDate: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span>Supplier reference</span>
                    <input
                      name="supplierRef"
                      value={form.supplierRef}
                      onChange={(e) => setForm((current) => ({ ...current, supplierRef: e.target.value }))}
                    />
                  </label>
                  <label className="form-field form-field-full">
                    <span>Note</span>
                    <input
                      name="note"
                      value={form.note}
                      onChange={(e) => setForm((current) => ({ ...current, note: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Saving…" : "Record inbound"}
                  </button>
                </div>
              </form>

              <section className="card staff-pharmacy-inventory">
                <h3>Inventory</h3>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>On hand</th>
                        <th>Min level</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.map((med) => (
                        <tr key={med._id}>
                          <td>
                            <strong>{med.name}</strong>
                            <div className="text-muted">{med.code}</div>
                          </td>
                          <td>
                            {med.stockQty} {med.unit}
                          </td>
                          <td>{med.minStockLevel}</td>
                          <td>
                            <span
                              className={`status-badge ${
                                med.isLowStock ? "status-badge-inactive" : "status-badge-active"
                              }`}
                            >
                              {med.isLowStock ? "Low stock" : "OK"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <section className="card staff-pharmacy-ledger">
              <h3>Recent stock movements</h3>
              {movements.length === 0 ? (
                <p className="text-muted">No stock movements yet.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Medicine</th>
                        <th>Type</th>
                        <th>Qty</th>
                        <th>Batch</th>
                        <th>Supplier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((row) => (
                        <tr key={row._id}>
                          <td>{new Date(row.createdAt).toLocaleString()}</td>
                          <td>{row.medicine?.name || "—"}</td>
                          <td>{row.type}</td>
                          <td>{row.quantity}</td>
                          <td>{row.batchNo || "—"}</td>
                          <td>{row.supplierRef || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </StaffLayout>
    </PageLayout>
  );
}
