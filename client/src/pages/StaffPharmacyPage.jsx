import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import StaffLayout from "../components/StaffLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import DatePicker from "../components/DatePicker.jsx";
import DashboardKpiGrid from "../components/dashboard/DashboardKpiGrid.jsx";
import DashboardBarChart from "../components/dashboard/DashboardBarChart.jsx";
import { StaffApiClient } from "../services/staffApi.js";
import { AdminApiClient } from "../services/adminApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import FilterFormField from "../components/FilterFormField.jsx";
import AppModal from "../components/AppModal.jsx";
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

const EMPTY_MEDICINE = {
  code: "",
  name: "",
  unit: "",
  price: "",
  minStockLevel: "",
  initialQuantity: "",
  batchNo: "",
};

const EMPTY_EDIT = {
  name: "",
  unit: "",
  price: "",
  minStockLevel: "",
  isActive: true,
};

export default function StaffPharmacyPage() {
  const { role } = useAuth();
  const [searchParams] = useSearchParams();
  const [dashboard, setDashboard] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState(EMPTY_INBOUND);
  const [outboundForm, setOutboundForm] = useState(EMPTY_OUTBOUND);
  const [createForm, setCreateForm] = useState(EMPTY_MEDICINE);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(
    searchParams.get("lowStockOnly") === "1" || searchParams.get("lowStockOnly") === "true"
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

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

  const openEditModal = (medicine) => {
    setEditTarget(medicine);
    setEditForm({
      name: medicine.name || "",
      unit: medicine.unit || "",
      price: medicine.price ?? "",
      minStockLevel: medicine.minStockLevel ?? 0,
      isActive: medicine.isActive ?? true,
    });
    setEditError("");
    setEditSuccess("");
  };

  const closeEditModal = () => {
    if (updating) return;
    setEditTarget(null);
    setEditError("");
    setEditSuccess("");
  };

  const onEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
    setEditError("");
    setEditSuccess("");
  };

  const onEditSubmit = async (event) => {
    event.preventDefault();
    if (!editTarget) return;

    setEditError("");
    setEditSuccess("");

    if (!editForm.name.trim()) {
      setEditError("Medicine name is required.");
      return;
    }
    if (!editForm.unit.trim()) {
      setEditError("Unit is required.");
      return;
    }
    const threshold = Number(editForm.minStockLevel);
    if (Number.isNaN(threshold) || threshold < 0) {
      setEditError("Low stock threshold must be greater than or equal to 0.");
      return;
    }

    setUpdating(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        unit: editForm.unit.trim(),
        minStockLevel: threshold,
        isActive: editForm.isActive === true || editForm.isActive === "true",
      };
      if (editForm.price !== "") {
        payload.price = Number(editForm.price);
      }

      if (role === "admin") {
        await AdminApiClient.updateMedicine(editTarget._id, payload);
      } else {
        await StaffApiClient.updateMedicine(editTarget._id, payload);
      }

      setEditSuccess("Medicine updated successfully.");
      await loadData();
      setTimeout(() => {
        closeEditModal();
      }, 900);
    } catch (err) {
      setEditError(getApiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

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

  const onCreateFormChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((current) => ({ ...current, [name]: value }));
    setCreateError("");
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm(EMPTY_MEDICINE);
    setCreateError("");
  };

  const onCreateMedicine = async (event) => {
    event.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const { data } = await StaffApiClient.createMedicine(createForm);
      setMessage(`Medicine ${data.name} created successfully.`);
      closeCreateModal();
      await loadData();
    } catch (err) {
      setCreateError(getApiErrorMessage(err));
    } finally {
      setCreating(false);
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
                  <div className="staff-pharmacy-inventory-actions">
                    <label className="staff-pharmacy-filter-toggle">
                      <input
                        type="checkbox"
                        checked={lowStockOnly}
                        onChange={(event) => setLowStockOnly(event.target.checked)}
                      />
                      Low stock only
                    </label>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setShowCreateModal(true)}
                    >
                      + New medicine
                    </button>
                  </div>
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
                        <th className="table-actions-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.map((med) => (
                        <tr
                          key={med._id}
                          className={
                            !med.isActive ? "row-inactive" : med.isLowStock ? "staff-pharmacy-row-low" : ""
                          }
                        >
                          <td>{med.code}</td>
                          <td>
                            <Link to={`/staff/pharmacy/medicines/${med._id}`} className="table-link">
                              <strong>{med.name}</strong>
                            </Link>
                            <div className="text-muted">Min {med.minStockLevel} {med.unit}</div>
                          </td>
                          <td>
                            {med.stockQty} {med.unit}
                          </td>
                          <td>{med.nearestExpiry || "—"}</td>
                          <td>
                            {!med.isActive ? (
                              <span className="status-badge status-badge-inactive">Inactive</span>
                            ) : med.isLowStock ? (
                              <span className="status-badge status-badge-inactive">Low stock</span>
                            ) : (
                              <span className="status-badge status-badge-active">OK</span>
                            )}
                          </td>
                          <td className="table-actions-col">
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => openEditModal(med)}
                            >
                              Edit
                            </button>
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
                            <td>
                              {row.medicine?._id ? (
                                <Link
                                  to={`/staff/pharmacy/medicines/${row.medicine._id}?tab=movements`}
                                  className="table-link"
                                >
                                  {row.medicine.name}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
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
          {showCreateModal && (
            <AppModal
              title="Add New Medicine"
              description="Create a new SKU and optionally seed initial stock."
              titleId="create-medicine-title"
              onClose={closeCreateModal}
            >
              <form className="form form-compact" onSubmit={onCreateMedicine}>
                {createError && <div className="alert alert-error">{createError}</div>}

                <div className="form-grid">
                  <FilterFormField
                    id="medicine-code"
                    label="Code"
                    name="code"
                    value={createForm.code}
                    onChange={onCreateFormChange}
                    placeholder="e.g. PARA500"
                    required
                    disabled={creating}
                  />
                  <FilterFormField
                    id="medicine-name"
                    label="Name"
                    name="name"
                    value={createForm.name}
                    onChange={onCreateFormChange}
                    placeholder="e.g. Paracetamol 500mg"
                    required
                    disabled={creating}
                  />
                  <FilterFormField
                    id="medicine-unit"
                    label="Unit"
                    name="unit"
                    value={createForm.unit}
                    onChange={onCreateFormChange}
                    placeholder="e.g. tablet"
                    required
                    disabled={creating}
                  />
                  <FilterFormField
                    id="medicine-price"
                    label="Price"
                    name="price"
                    type="number"
                    min="0"
                    value={createForm.price}
                    onChange={onCreateFormChange}
                    required
                    disabled={creating}
                  />
                  <FilterFormField
                    id="medicine-min-stock"
                    className="form-grid-span-2"
                    label="Minimum stock level"
                    name="minStockLevel"
                    type="number"
                    min="0"
                    value={createForm.minStockLevel}
                    onChange={onCreateFormChange}
                    required
                    disabled={creating}
                  />
                  <FilterFormField
                    id="medicine-initial-qty"
                    label="Initial quantity (optional)"
                    name="initialQuantity"
                    type="number"
                    min="0"
                    value={createForm.initialQuantity}
                    onChange={onCreateFormChange}
                    placeholder="e.g. 100"
                    disabled={creating}
                  />
                  <FilterFormField
                    id="medicine-batch-no"
                    label="Initial batch no (optional)"
                    name="batchNo"
                    value={createForm.batchNo}
                    onChange={onCreateFormChange}
                    placeholder="e.g. BATCH-01"
                    disabled={
                      creating ||
                      !createForm.initialQuantity ||
                      createForm.initialQuantity === "0"
                    }
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={closeCreateModal} disabled={creating}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? "Saving…" : "Create Medicine"}
                  </button>
                </div>
              </form>
            </AppModal>
          )}
          {editTarget && (
            <AppModal
              title="Update medicine"
              description={`Edit ${editTarget.name} (${editTarget.code}).`}
              titleId="edit-medicine-title"
              onClose={closeEditModal}
            >
              <form onSubmit={onEditSubmit} className="form form-compact">
                {editError && <div className="alert alert-error">{editError}</div>}
                {editSuccess && <div className="alert alert-success">{editSuccess}</div>}

                <div className="form-grid">
                  <FilterFormField
                    id="edit-medicine-name"
                    label="Medicine name"
                    name="name"
                    value={editForm.name}
                    onChange={onEditFormChange}
                    required
                    disabled={updating}
                  />
                  <FilterFormField
                    id="edit-medicine-unit"
                    label="Unit"
                    name="unit"
                    value={editForm.unit}
                    onChange={onEditFormChange}
                    required
                    disabled={updating}
                  />
                  <FilterFormField
                    id="edit-medicine-price"
                    label="Price"
                    name="price"
                    type="number"
                    min="0"
                    value={editForm.price}
                    onChange={onEditFormChange}
                    disabled={updating}
                  />
                  <FilterFormField
                    id="edit-medicine-min-stock"
                    label="Low stock threshold"
                    name="minStockLevel"
                    type="number"
                    min="0"
                    value={editForm.minStockLevel}
                    onChange={onEditFormChange}
                    required
                    disabled={updating}
                  />
                  <CustomSelect
                    className="form-grid-span-2"
                    label="Status"
                    value={editForm.isActive ? "true" : "false"}
                    onChange={(val) => setEditForm((current) => ({ ...current, isActive: val === "true" }))}
                    options={[
                      { value: "true", label: "Active" },
                      { value: "false", label: "Inactive" },
                    ]}
                    disabled={updating}
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={closeEditModal} disabled={updating}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={updating}>
                    {updating ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </AppModal>
          )}
        </div>
      </StaffLayout>
    </PageLayout>
  );
}
