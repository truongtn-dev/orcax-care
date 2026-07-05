import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import StaffLayout from "../components/StaffLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import DatePicker from "../components/DatePicker.jsx";
import DashboardKpiGrid from "../components/dashboard/DashboardKpiGrid.jsx";
import DashboardBarChart from "../components/dashboard/DashboardBarChart.jsx";
import { StaffApiClient } from "../services/staffApi.js";
import { getApiErrorMessage } from "../services/api.js";
import FilterFormField from "../components/FilterFormField.jsx";
import "./StaffPharmacyPage.css";

const EMPTY_INBOUND = {
  medicineId: "",
  quantity: "",
  batchNo: "",
  expiryDate: "",
  supplierRef: "",
  note: "",
};

const EMPTY_OUTBOUND = {
  medicineId: "",
  quantity: "",
  reason: "",
  prescriptionId: "",
};

export default function StaffPharmacyPage() {
  const [dashboard, setDashboard] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState(EMPTY_INBOUND);
  const [outboundForm, setOutboundForm] = useState(EMPTY_OUTBOUND);
  const [lowStockOnly, setLowStockOnly] = useState(false);
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
        StaffApiClient.listMedicines({ lowStockOnly: lowStockOnly || undefined }),
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
  }, [lowStockOnly]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onSubmitOutbound = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const { data } = await StaffApiClient.stockOutbound({
        ...outboundForm,
        quantity: Number(outboundForm.quantity),
        prescriptionId: outboundForm.prescriptionId || undefined,
      });
      setMessage(data.message || "Stock outbound recorded.");
      setOutboundForm(EMPTY_OUTBOUND);
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

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

  const kpiItems = dashboard
    ? [
        {
          key: "medicines",
          tone: "cyan",
          label: "Medicines",
          value: dashboard.medicineCount ?? 0,
          hint: "Active SKUs",
        },
        {
          key: "low-stock",
          tone: dashboard.lowStockCount > 0 ? "amber" : "emerald",
          label: "Low stock",
          value: dashboard.lowStockCount ?? 0,
          hint: "At or below minimum",
        },
        {
          key: "inbound",
          tone: "teal",
          label: "Inbound today",
          value: dashboard.inboundToday ?? 0,
          hint: "Movements recorded",
        },
      ]
    : [];

  return (
    <PageLayout dashboard>
      <StaffLayout
        title="Pharmacy inventory"
        description="Record stock inbound and monitor on-hand quantities."
      >
        <div className="staff-pharmacy-page dash-page-stack">
          <div className="staff-pharmacy-toolbar card">
            <p className="staff-pharmacy-toolbar-lead">Manage deliveries, stock levels, and movement history.</p>
            <Link to="/staff" className="btn btn-outline btn-sm">
              Back to overview
            </Link>
          </div>

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
              <DashboardKpiGrid items={kpiItems} loading={false} columns={3} />

              <div className="dash-charts-row staff-pharmacy-charts">
                <DashboardBarChart
                  title="Stock on hand"
                  description="Current quantity by medicine code"
                  data={dashboard?.stockChart || []}
                  emptyMessage="No medicines in inventory."
                  valueFormatter={(value, point) => point.title || `${point.label}: ${value}`}
                />
                <DashboardBarChart
                  title="Inbound trend (7 days)"
                  description="Units received per day"
                  data={(dashboard?.inboundTrend || []).map((point) => ({
                    ...point,
                    title: `${point.date}: ${point.value} units`,
                  }))}
                  emptyMessage="No inbound deliveries in the last 7 days."
                  barClassName="dash-chart-bar--cyan"
                />
              </div>

              <form className="card form staff-pharmacy-form" onSubmit={onSubmit}>
                <div className="staff-pharmacy-form-head">
                  <div>
                    <h3>Stock inbound</h3>
                    <p className="form-help">Increase on-hand quantity with batch and supplier reference.</p>
                  </div>
                </div>
                <div className="form-grid staff-pharmacy-form-grid">
                  <CustomSelect
                    className="filter-field form-grid-span-2"
                    label="Medicine"
                    value={form.medicineId}
                    onChange={(medicineId) => setForm((current) => ({ ...current, medicineId }))}
                    options={medicineOptions}
                  />
                  <FilterFormField
                    id="pharmacy-inbound-qty"
                    label="Quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))}
                    required
                  />
                  <FilterFormField
                    id="pharmacy-inbound-batch"
                    label="Batch number"
                    name="batchNo"
                    value={form.batchNo}
                    onChange={(e) => setForm((current) => ({ ...current, batchNo: e.target.value }))}
                    required
                  />
                  <DatePicker
                    className="filter-field"
                    label="Expiry date"
                    name="expiryDate"
                    value={form.expiryDate}
                    onChange={(e) => setForm((current) => ({ ...current, expiryDate: e.target.value }))}
                    min={new Date().toISOString().slice(0, 10)}
                    placeholder="Select expiry date"
                  />
                  <FilterFormField
                    id="pharmacy-inbound-supplier"
                    label="Supplier reference"
                    name="supplierRef"
                    value={form.supplierRef}
                    onChange={(e) => setForm((current) => ({ ...current, supplierRef: e.target.value }))}
                  />
                  <FilterFormField
                    id="pharmacy-inbound-note"
                    className="form-grid-span-2"
                    label="Note"
                    name="note"
                    value={form.note}
                    onChange={(e) => setForm((current) => ({ ...current, note: e.target.value }))}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Saving…" : "Record inbound"}
                  </button>
                </div>
              </form>

              <form className="card form staff-pharmacy-form" onSubmit={onSubmitOutbound}>
                <div className="staff-pharmacy-form-head">
                  <div>
                    <h3>Stock outbound</h3>
                    <p className="form-help">Decrease on-hand stock with reason and optional prescription link.</p>
                  </div>
                </div>
                <div className="form-grid staff-pharmacy-form-grid">
                  <CustomSelect
                    className="filter-field form-grid-span-2"
                    label="Medicine"
                    value={outboundForm.medicineId}
                    onChange={(medicineId) => setOutboundForm((current) => ({ ...current, medicineId }))}
                    options={medicineOptions}
                  />
                  <FilterFormField
                    id="pharmacy-outbound-qty"
                    label="Quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    value={outboundForm.quantity}
                    onChange={(e) => setOutboundForm((current) => ({ ...current, quantity: e.target.value }))}
                    required
                  />
                  <FilterFormField
                    id="pharmacy-outbound-reason"
                    label="Reason"
                    name="reason"
                    value={outboundForm.reason}
                    onChange={(e) => setOutboundForm((current) => ({ ...current, reason: e.target.value }))}
                    required
                  />
                  <FilterFormField
                    id="pharmacy-outbound-rx"
                    className="form-grid-span-2"
                    label="Prescription ID (optional)"
                    name="prescriptionId"
                    value={outboundForm.prescriptionId}
                    onChange={(e) => setOutboundForm((current) => ({ ...current, prescriptionId: e.target.value }))}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Saving…" : "Record outbound"}
                  </button>
                </div>
              </form>

              <section className="card staff-pharmacy-inventory">
                <div className="staff-pharmacy-inventory-head">
                  <h3>Inventory</h3>
                  <label className="staff-pharmacy-filter-toggle">
                    <input
                      type="checkbox"
                      checked={lowStockOnly}
                      onChange={(event) => setLowStockOnly(event.target.checked)}
                    />
                    Low stock only
                  </label>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Name</th>
                        <th>Qty</th>
                        <th>Nearest expiry</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.map((med) => (
                        <tr key={med._id} className={med.isLowStock ? "staff-pharmacy-row-low" : ""}>
                          <td>{med.code}</td>
                          <td>
                            <strong>{med.name}</strong>
                            <div className="text-muted">Min {med.minStockLevel} {med.unit}</div>
                          </td>
                          <td>
                            {med.stockQty} {med.unit}
                          </td>
                          <td>{med.nearestExpiry || "—"}</td>
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
        </div>
      </StaffLayout>
    </PageLayout>
  );
}
