import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DoctorLayout from "../components/DoctorLayout.jsx";
import { DoctorApiClient } from "../services/doctorApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./DoctorPrescriptionCreatePage.css";

function emptyLineItem() {
  return {
    medicineId: "",
    quantity: 1,
    durationDays: 1,
    dosage: "",
    instructions: "",
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function DoctorPrescriptionCreatePage() {
  const { id } = useParams();
  const [encounter, setEncounter] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [lineItems, setLineItems] = useState([emptyLineItem()]);
  const [notes, setNotes] = useState("");
  const [createdPrescription, setCreatedPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [encounterRes, medicinesRes] = await Promise.all([
        DoctorApiClient.getEncounter(id),
        DoctorApiClient.listMedicines(),
      ]);
      setEncounter(encounterRes.data);
      setMedicines(medicinesRes.data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const medicineById = useMemo(
    () => new Map(medicines.map((medicine) => [medicine._id, medicine])),
    [medicines]
  );

  const previewRows = lineItems.map((item) => {
    const medicine = medicineById.get(item.medicineId);
    const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
    const lineTotal = (medicine?.price || 0) * quantity;
    return {
      ...item,
      medicine,
      quantity,
      lineTotal,
      stockWarning: medicine ? quantity > medicine.stockQty : false,
    };
  });

  const totalAmount = previewRows.reduce((sum, item) => sum + item.lineTotal, 0);

  const updateLineItem = (index, field, value) => {
    setLineItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addLineItem = () => {
    setLineItems((current) => [...current, emptyLineItem()]);
  };

  const removeLineItem = (index) => {
    setLineItems((current) =>
      current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setCreatedPrescription(null);
    try {
      const payload = {
        notes,
        lineItems: lineItems.map((item) => ({
          medicineId: item.medicineId,
          quantity: Number.parseInt(item.quantity, 10),
          durationDays: Number.parseInt(item.durationDays, 10),
          dosage: item.dosage,
          instructions: item.instructions,
        })),
      };
      const { data } = await DoctorApiClient.createPrescription(id, payload);
      setCreatedPrescription(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout dashboard>
      <DoctorLayout title="Create prescription" description="Add medicine line items for this encounter.">
        <div className="doctor-rx-toolbar">
          <Link to={`/doctor/encounters/${id}`} className="btn btn-outline btn-sm">
            Back to encounter
          </Link>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {createdPrescription && (
          <div className="alert alert-success">
            Prescription created. Total: {formatCurrency(createdPrescription.totalAmount)}
            <Link to={`/doctor/prescriptions/${createdPrescription._id}`} className="doctor-rx-created-link">
              Open detail
            </Link>
          </div>
        )}

        {loading ? (
          <section className="card doctor-rx-state">Loading prescription form...</section>
        ) : !encounter ? (
          <section className="card doctor-rx-state">Encounter not found.</section>
        ) : (
          <form className="card doctor-rx-form" onSubmit={handleSubmit}>
            <div className="doctor-rx-context">
              <div>
                <span>Patient</span>
                <strong>{encounter.patient?.fullName || "Patient"}</strong>
              </div>
              <div>
                <span>Encounter</span>
                <strong>{encounter.chiefComplaint || encounter.visitDate}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{encounter.status}</strong>
              </div>
            </div>

            <div className="doctor-rx-lines">
              <div className="doctor-rx-lines-head">
                <h3>Medicine line items</h3>
                <button type="button" className="btn btn-outline btn-sm" onClick={addLineItem}>
                  Add line
                </button>
              </div>

              {previewRows.map((item, index) => (
                <div key={index} className="doctor-rx-line">
                  <label>
                    Medicine
                    <select
                      value={item.medicineId}
                      onChange={(event) => updateLineItem(index, "medicineId", event.target.value)}
                      required
                    >
                      <option value="">Select medicine</option>
                      {medicines.map((medicine) => (
                        <option key={medicine._id} value={medicine._id}>
                          {medicine.name} ({medicine.code}) - stock {medicine.stockQty}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Quantity
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => updateLineItem(index, "quantity", event.target.value)}
                      required
                    />
                  </label>

                  <label>
                    Duration
                    <input
                      type="number"
                      min="1"
                      value={item.durationDays}
                      onChange={(event) => updateLineItem(index, "durationDays", event.target.value)}
                      required
                    />
                  </label>

                  <label>
                    Dosage
                    <input
                      value={item.dosage}
                      onChange={(event) => updateLineItem(index, "dosage", event.target.value)}
                      placeholder="1 tablet twice daily"
                    />
                  </label>

                  <label className="doctor-rx-line-wide">
                    Instructions
                    <input
                      value={item.instructions}
                      onChange={(event) => updateLineItem(index, "instructions", event.target.value)}
                      placeholder="After meals"
                    />
                  </label>

                  <div className="doctor-rx-line-total">
                    <span>{formatCurrency(item.lineTotal)}</span>
                    {item.stockWarning && <strong>Stock warning</strong>}
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={lineItems.length === 1}
                    onClick={() => removeLineItem(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <label className="doctor-rx-notes">
              Notes
              <textarea
                rows="3"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="General prescription notes"
              />
            </label>

            <div className="doctor-rx-footer">
              <strong>Total {formatCurrency(totalAmount)}</strong>
              <button type="submit" className="btn btn-primary" disabled={submitting || encounter.status === "signed"}>
                {submitting ? "Creating..." : "Create prescription"}
              </button>
            </div>
          </form>
        )}
      </DoctorLayout>
    </PageLayout>
  );
}
