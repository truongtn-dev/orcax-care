import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import DoctorLayout from "../components/DoctorLayout.jsx";
import PageLayout from "../components/PageLayout.jsx";
import AppModal from "../components/AppModal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import FilterFormField from "../components/FilterFormField.jsx";
import SearchableSelect from "../components/SearchableSelect.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiErrorMessage } from "../services/api.js";
import { DoctorApiClient } from "../services/doctorApi.js";
import { PatientApiClient } from "../services/patientApi.js";
import { exportPrescriptionPdf } from "../utils/exportPrescriptionPdf.js";
import "../styles/patient.shared.css";
import "./PrescriptionDetailPage.css";

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatVisitDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function PrescriptionDetailContent({
  prescription,
  loading,
  error,
  backTo,
  backLabel,
  role,
  canEdit,
  onRemoveItem,
  onEditItem,
  onAddItem,
  onExportPdf,
  exporting,
  submitting,
}) {
  const showQr =
    Boolean(prescription?._id) &&
    (role === "doctor" || prescription.status === "issued" || prescription.status === "dispensed");

  return (
    <div className="prescription-detail-page">
      <div className="prescription-detail-toolbar">
        <Link to={backTo} className="btn btn-outline btn-sm">
          {backLabel}
        </Link>
        {prescription && (
          <div className="prescription-detail-toolbar-actions">
            {canEdit && (
              <button type="button" className="btn btn-outline btn-sm" onClick={onAddItem} disabled={submitting}>
                Add medicine
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onExportPdf}
              disabled={exporting}
            >
              {exporting ? "Exporting…" : "Export PDF"}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
              Print
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <section className="patient-panel prescription-detail-state">Loading prescription...</section>
      ) : !prescription ? (
        <section className="patient-panel prescription-detail-state">
          <h2>Prescription not found</h2>
          <p>This prescription may not belong to your account.</p>
        </section>
      ) : (
        <section className="patient-panel prescription-detail-sheet">
          <div className="prescription-detail-brandbar">
            <div>
              <strong>OrcaX Care</strong>
              <span>Electronic Prescription</span>
            </div>
            <span className={`prescription-detail-status prescription-detail-status--${prescription.status}`}>
              {prescription.status}
            </span>
          </div>

          <div className="prescription-detail-head">
            <div>
              <p className="patient-section-label">Prescription</p>
              <h1>Prescription Detail</h1>
              <p>Issued from encounter {prescription.encounter?.chiefComplaint || "Clinical encounter"}</p>
            </div>
            {showQr && (
              <div className="prescription-detail-qr">
                <div className="prescription-detail-qr-frame">
                  <QRCodeSVG value={prescription._id} size={88} level="M" />
                </div>
                <div className="prescription-detail-qr-label">
                  {role === "doctor" ? "Prescription ID QR" : "Show at pharmacy"}
                </div>
              </div>
            )}
          </div>

          <div className="prescription-detail-facts">
            <dl>
              <div>
                <dt>Patient</dt>
                <dd>{prescription.patient?.fullName || "Patient"}</dd>
              </div>
              <div>
                <dt>Doctor</dt>
                <dd>{prescription.doctor?.fullName || "Doctor"}</dd>
              </div>
              <div>
                <dt>Visit date</dt>
                <dd>{formatVisitDate(prescription.encounter?.visitDate)}</dd>
              </div>
              <div>
                <dt>Created at</dt>
                <dd>{formatDateTime(prescription.createdAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="prescription-detail-table-wrap">
            <table className="prescription-detail-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Qty</th>
                  <th>Duration</th>
                  <th>Dosage</th>
                  <th>Instructions</th>
                  <th className="prescription-detail-money">Line total</th>
                  {canEdit && <th className="prescription-detail-actions-col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {prescription.lineItems?.map((item) => (
                  <tr key={`${item.medicineId}-${item.medicineCode}`}>
                    <td>
                      <strong>{item.medicineName}</strong>
                      <span>{item.medicineCode}</span>
                    </td>
                    <td>
                      {item.quantity} {item.unit}
                    </td>
                    <td>{item.durationDays} days</td>
                    <td>{item.dosage || "-"}</td>
                    <td>{item.instructions || "-"}</td>
                    <td className="prescription-detail-money">{formatCurrency(item.lineTotal)}</td>
                    {canEdit && (
                      <td className="prescription-detail-actions-col">
                        <div className="prescription-detail-row-actions">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={submitting}
                            onClick={() => onEditItem(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={submitting || prescription.lineItems.length === 1}
                            onClick={() => onRemoveItem(item)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="prescription-detail-bottom">
            <div>
              <h2>Notes</h2>
              <p>{prescription.notes || "No notes."}</p>
            </div>
            <div className="prescription-detail-total">
              <span>Total</span>
              <strong>{formatCurrency(prescription.totalAmount)}</strong>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function PrescriptionDetailPage() {
  const { id } = useParams();
  const { role } = useAuth();
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [itemToRemove, setItemToRemove] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [editForm, setEditForm] = useState({
    quantity: "",
    durationDays: "",
    dosage: "",
    instructions: "",
  });
  const [modalError, setModalError] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [addForm, setAddForm] = useState({
    medicineId: "",
    quantity: "1",
    durationDays: "1",
    dosage: "",
    instructions: "",
  });

  const apiClient = role === "doctor" ? DoctorApiClient : PatientApiClient;
  const backTarget = useMemo(() => {
    if (role === "doctor") {
      return prescription?.encounter?._id
        ? `/doctor/encounters/${prescription.encounter._id}`
        : "/doctor/today-appointments";
    }
    return "/patient/prescriptions";
  }, [prescription, role]);

  const loadPrescription = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.getPrescription(id);
      setPrescription(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setPrescription(null);
    } finally {
      setLoading(false);
    }
  }, [apiClient, id]);

  useEffect(() => {
    loadPrescription();
  }, [loadPrescription]);

  useEffect(() => {
    if (role !== "doctor") return undefined;
    let active = true;
    DoctorApiClient.listMedicines()
      .then(({ data }) => {
        if (active) setMedicines(data.items || []);
      })
      .catch(() => {
        if (active) setMedicines([]);
      });
    return () => {
      active = false;
    };
  }, [role]);

  const medicineOptions = useMemo(
    () =>
      medicines.map((medicine) => ({
        value: medicine._id,
        label: `${medicine.name} (${medicine.code}) · stock ${medicine.stockQty}`,
      })),
    [medicines]
  );

  const handleExportPdf = async () => {
    if (!prescription || exporting) return;
    setExporting(true);
    setError("");
    try {
      await exportPrescriptionPdf(prescription);
    } catch (err) {
      setError(err.message || "Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  const openEditItem = (item) => {
    setItemToEdit(item);
    setEditForm({
      quantity: String(item.quantity || ""),
      durationDays: String(item.durationDays || ""),
      dosage: item.dosage || "",
      instructions: item.instructions || "",
    });
    setModalError("");
  };

  const handleSaveEditItem = async () => {
    if (!prescription || !itemToEdit || submitting) return;
    const quantity = Number.parseInt(editForm.quantity, 10);
    const durationDays = Number.parseInt(editForm.durationDays, 10);
    if (!Number.isFinite(quantity) || quantity < 1) {
      setModalError("Quantity must be at least 1.");
      return;
    }
    if (!Number.isFinite(durationDays) || durationDays < 1) {
      setModalError("Duration must be at least 1 day.");
      return;
    }
    if (!editForm.dosage.trim()) {
      setModalError("Dosage is required.");
      return;
    }

    setSubmitting(true);
    setModalError("");
    setError("");
    try {
      const { data } = await DoctorApiClient.updatePrescriptionLineItem(
        prescription._id,
        itemToEdit.medicineId,
        {
          quantity,
          durationDays,
          dosage: editForm.dosage.trim(),
          instructions: editForm.instructions.trim(),
        }
      );
      setPrescription(data);
      setItemToEdit(null);
    } catch (err) {
      setModalError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmRemoveItem = async () => {
    if (!prescription || !itemToRemove || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const { data } = await DoctorApiClient.removePrescriptionLineItem(
        prescription._id,
        itemToRemove.medicineId
      );
      setPrescription(data);
      setItemToRemove(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setItemToRemove(null);
    } finally {
      setSubmitting(false);
    }
  };

  const openAddItem = () => {
    setAddForm({
      medicineId: "",
      quantity: "1",
      durationDays: "1",
      dosage: "",
      instructions: "",
    });
    setModalError("");
    setIsAddOpen(true);
  };

  const handleSaveAddItem = async () => {
    if (!prescription || submitting) return;
    const quantity = Number.parseInt(addForm.quantity, 10);
    const durationDays = Number.parseInt(addForm.durationDays, 10);
    if (!addForm.medicineId) {
      setModalError("Please select a medicine.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      setModalError("Quantity must be at least 1.");
      return;
    }
    if (!Number.isFinite(durationDays) || durationDays < 1) {
      setModalError("Duration must be at least 1 day.");
      return;
    }
    if (!addForm.dosage.trim()) {
      setModalError("Dosage is required.");
      return;
    }
    if (prescription.lineItems?.some((item) => item.medicineId === addForm.medicineId)) {
      setModalError("This medicine is already on the prescription.");
      return;
    }

    setSubmitting(true);
    setModalError("");
    setError("");
    try {
      const { data } = await DoctorApiClient.addPrescriptionLineItem(prescription._id, {
        medicineId: addForm.medicineId,
        quantity,
        durationDays,
        dosage: addForm.dosage.trim(),
        instructions: addForm.instructions.trim(),
      });
      setPrescription(data);
      setIsAddOpen(false);
    } catch (err) {
      setModalError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <>
      <PrescriptionDetailContent
        prescription={prescription}
        loading={loading}
        error={error}
        backTo={backTarget}
        backLabel={role === "doctor" ? "Back to encounter" : "Back to prescriptions"}
        role={role}
        canEdit={role === "doctor" && prescription?.status === "draft"}
        onRemoveItem={setItemToRemove}
        onEditItem={openEditItem}
        onAddItem={openAddItem}
        onExportPdf={handleExportPdf}
        exporting={exporting}
        submitting={submitting}
      />

      {isAddOpen && (
        <AppModal
          title="Add medicine"
          description="Add a new line item to this draft prescription. Duplicate drugs are blocked."
          onClose={() => (!submitting ? setIsAddOpen(false) : undefined)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveAddItem();
            }}
          >
            {modalError && <div className="alert alert-error">{modalError}</div>}
            <SearchableSelect
              label="Medicine"
              placeholder="Select medicine…"
              searchPlaceholder="Search name or code…"
              value={addForm.medicineId}
              onChange={(value) => setAddForm({ ...addForm, medicineId: value })}
              options={medicineOptions}
              required
            />
            <div className="prescription-edit-grid">
              <FilterFormField
                id="rx-add-qty"
                label="Quantity"
                type="number"
                min="1"
                value={addForm.quantity}
                onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                required
              />
              <FilterFormField
                id="rx-add-days"
                label="Duration (days)"
                type="number"
                min="1"
                value={addForm.durationDays}
                onChange={(e) => setAddForm({ ...addForm, durationDays: e.target.value })}
                required
              />
            </div>
            <FilterFormField
              id="rx-add-dosage"
              label="Dosage"
              value={addForm.dosage}
              onChange={(e) => setAddForm({ ...addForm, dosage: e.target.value })}
              placeholder="e.g. 1 tablet twice daily"
              required
            />
            <label className="prescription-edit-notes">
              <span className="filter-field-label">Instructions</span>
              <textarea
                className="filter-field-control"
                value={addForm.instructions}
                onChange={(e) => setAddForm({ ...addForm, instructions: e.target.value })}
                placeholder="Optional patient instructions"
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsAddOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Saving…" : "Add line item"}
              </button>
            </div>
          </form>
        </AppModal>
      )}

      {itemToEdit && (
        <AppModal
          title="Update line item"
          description={`Adjust quantity, duration, and dosage for ${itemToEdit.medicineName}. Total recalculates automatically.`}
          onClose={() => (!submitting ? setItemToEdit(null) : undefined)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEditItem();
            }}
          >
            {modalError && <div className="alert alert-error">{modalError}</div>}
            <div className="prescription-edit-grid">
              <FilterFormField
                id="rx-edit-qty"
                label="Quantity"
                type="number"
                min="1"
                value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                required
              />
              <FilterFormField
                id="rx-edit-days"
                label="Duration (days)"
                type="number"
                min="1"
                value={editForm.durationDays}
                onChange={(e) => setEditForm({ ...editForm, durationDays: e.target.value })}
                required
              />
            </div>
            <FilterFormField
              id="rx-edit-dosage"
              label="Dosage"
              value={editForm.dosage}
              onChange={(e) => setEditForm({ ...editForm, dosage: e.target.value })}
              placeholder="e.g. 1 tablet twice daily"
              required
            />
            <label className="prescription-edit-notes">
              <span className="filter-field-label">Instructions</span>
              <textarea
                className="filter-field-control"
                value={editForm.instructions}
                onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                placeholder="Optional patient instructions"
              />
            </label>
            <div className="prescription-edit-preview">
              Estimated line total:{" "}
              <strong>
                {formatCurrency(
                  (itemToEdit.unitPrice || 0) * (Number.parseInt(editForm.quantity, 10) || 0)
                )}
              </strong>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setItemToEdit(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </AppModal>
      )}

      <ConfirmDialog
        open={Boolean(itemToRemove)}
        title="Remove line item?"
        description={
          itemToRemove
            ? `Remove "${itemToRemove.medicineName}" from this draft prescription? Total will recalculate.`
            : ""
        }
        confirmText={submitting ? "Removing…" : "Remove"}
        variant="danger"
        loading={submitting}
        onConfirm={handleConfirmRemoveItem}
        onCancel={() => setItemToRemove(null)}
      />
    </>
  );

  if (role === "doctor") {
    return (
      <PageLayout dashboard>
        <DoctorLayout
          title="Prescription detail"
          description="Review, edit draft line items, export PDF, and show prescription QR."
        >
          {content}
        </DoctorLayout>
      </PageLayout>
    );
  }

  return <PageLayout>{content}</PageLayout>;
}
