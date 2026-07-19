import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import StaffLayout from "../components/StaffLayout.jsx";
import FilterFormField from "../components/FilterFormField.jsx";
import { StaffApiClient } from "../services/staffApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./StaffVerifyPrescriptionPage.css";

function statusTone(validationStatus) {
  switch (validationStatus) {
    case "valid":
      return "valid";
    case "expired":
      return "expired";
    case "already_dispensed":
    case "dispensed":
      return "dispensed";
    default:
      return "invalid";
  }
}

function statusLabel(validationStatus) {
  switch (validationStatus) {
    case "valid":
      return "Valid";
    case "expired":
      return "Expired";
    case "already_dispensed":
      return "Already dispensed";
    case "dispensed":
      return "Dispensed";
    default:
      return "Invalid";
  }
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} VND`;
}

export default function StaffVerifyPrescriptionPage() {
  const [prescriptionId, setPrescriptionId] = useState("");
  const [lookup, setLookup] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [dispensing, setDispensing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onLookup = async (e) => {
    e.preventDefault();
    if (!prescriptionId.trim()) return;

    setSubmitting(true);
    setError("");
    setMessage("");
    setLookup(null);

    try {
      const { data } = await StaffApiClient.lookupPrescription(prescriptionId.trim());
      setLookup(data);
      if (data.validationStatus !== "valid") {
        setError(data.message || "Prescription is not valid for dispensing.");
      } else {
        setMessage(data.message || "Prescription is valid.");
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  const onDispense = async () => {
    if (!lookup?.canDispense || !lookup?.prescription?._id) return;
    setDispensing(true);
    setError("");
    setMessage("");
    try {
      const { data } = await StaffApiClient.verifyPrescription({
        prescriptionId: lookup.prescription._id,
      });
      setLookup({
        ...lookup,
        validationStatus: data.validationStatus || "dispensed",
        canDispense: false,
        message: data.message,
        prescription: data.prescription,
      });
      setMessage(data.message || "Prescription dispensed successfully.");
      setPrescriptionId("");
    } catch (err) {
      const body = err.response?.data;
      setError(body?.message || getApiErrorMessage(err));
      if (body?.validationStatus) {
        setLookup((current) =>
          current
            ? {
                ...current,
                validationStatus: body.validationStatus,
                canDispense: false,
                message: body.message,
              }
            : current
        );
      }
    } finally {
      setDispensing(false);
      inputRef.current?.focus();
    }
  };

  const prescription = lookup?.prescription;

  return (
    <PageLayout dashboard>
      <StaffLayout
        title="Verify Prescription"
        description="Scan QR to validate prescription status, then dispense when valid."
      >
        <div className="dash-page-stack">
          <div className="card staff-verify-toolbar">
            <p className="staff-verify-lead">
              Scan the patient QR or enter the prescription ID. Validation states: Valid, Invalid, Expired.
            </p>
            <Link to="/staff/pharmacy" className="btn btn-outline btn-sm">
              Back to Pharmacy
            </Link>
          </div>

          <form className="card form staff-verify-form" onSubmit={onLookup}>
            <div className="staff-verify-form-head">
              <h3>Scan Prescription QR</h3>
            </div>

            <div className="form-grid">
              <FilterFormField
                id="staff-verify-prescription-id"
                className="form-grid-span-2"
                label="Prescription ID"
                ref={inputRef}
                type="text"
                required
                placeholder="Scan QR or type ID…"
                value={prescriptionId}
                onChange={(e) => setPrescriptionId(e.target.value)}
                disabled={submitting || dispensing}
              />
            </div>

            <div className="form-actions" style={{ marginTop: "1rem" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || dispensing || !prescriptionId.trim()}
              >
                {submitting ? "Checking…" : "Validate QR"}
              </button>
            </div>
          </form>

          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          {lookup && (
            <section className="card staff-verify-result">
              <div className="staff-verify-result-header">
                <h3>Validation result</h3>
                <span className={`staff-verify-status staff-verify-status--${statusTone(lookup.validationStatus)}`}>
                  {statusLabel(lookup.validationStatus)}
                </span>
              </div>

              <p className="staff-verify-result-message">{lookup.message}</p>

              {lookup.expiresAt && (
                <p className="staff-verify-expiry">
                  Expires: <strong>{new Date(lookup.expiresAt).toLocaleString()}</strong>
                  {lookup.validityDays ? ` (${lookup.validityDays}-day validity)` : ""}
                </p>
              )}

              {prescription && (
                <>
                  <div className="staff-verify-info-grid">
                    <div>
                      <span className="text-muted">Patient</span>
                      <strong>{prescription.patientUserId?.fullName || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-muted">Doctor</span>
                      <strong>{prescription.doctorId?.userId?.fullName || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-muted">Status</span>
                      <strong>{prescription.status}</strong>
                    </div>
                    <div>
                      <span className="text-muted">Total</span>
                      <strong>{formatMoney(prescription.totalAmount)}</strong>
                    </div>
                  </div>

                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Quantity</th>
                          <th>Dosage</th>
                          <th>Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescription.lineItems?.map((item, index) => (
                          <tr key={item.medicineId || index}>
                            <td>
                              <strong>{item.medicineName}</strong>
                              <div className="text-muted">{item.medicineCode}</div>
                            </td>
                            <td>
                              {item.quantity} {item.unit}
                            </td>
                            <td>{item.dosage}</td>
                            <td>{item.instructions || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {lookup.canDispense && (
                <div className="staff-verify-dispense-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onDispense}
                    disabled={dispensing}
                  >
                    {dispensing ? "Dispensing…" : "Confirm & Dispense"}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </StaffLayout>
    </PageLayout>
  );
}
