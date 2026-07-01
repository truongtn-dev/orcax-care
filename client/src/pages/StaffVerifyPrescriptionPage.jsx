import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import StaffLayout from "../components/StaffLayout.jsx";
import FilterFormField from "../components/FilterFormField.jsx";
import { StaffApiClient } from "../services/staffApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./StaffVerifyPrescriptionPage.css";

export default function StaffVerifyPrescriptionPage() {
  const [prescriptionId, setPrescriptionId] = useState("");
  const [prescription, setPrescription] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const onVerify = async (e) => {
    e.preventDefault();
    if (!prescriptionId.trim()) return;

    setSubmitting(true);
    setError("");
    setMessage("");
    setPrescription(null);

    try {
      const { data } = await StaffApiClient.verifyPrescription({ prescriptionId: prescriptionId.trim() });
      setMessage(data.message || "Prescription verified and dispensed successfully!");
      setPrescription(data.prescription);
      setPrescriptionId("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
      // focus back to input for the next scan
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  return (
    <PageLayout dashboard>
      <StaffLayout
        title="Verify Prescription"
        description="Scan QR code or enter prescription ID to dispense medicines."
      >
        <div className="dash-page-stack">
          <div className="card staff-verify-toolbar">
            <p className="staff-verify-lead">
              Use a barcode scanner to scan the patient's QR code, or enter the ID manually.
            </p>
            <Link to="/staff/pharmacy" className="btn btn-outline btn-sm">Back to Pharmacy</Link>
          </div>

          <form className="card form staff-verify-form" onSubmit={onVerify}>
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
                disabled={submitting}
              />
            </div>
            
            <div className="form-actions" style={{ marginTop: "1rem" }}>
              <button type="submit" className="btn btn-primary" disabled={submitting || !prescriptionId.trim()}>
                {submitting ? "Verifying..." : "Verify & Dispense"}
              </button>
            </div>
          </form>

          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          {prescription && (
            <section className="card staff-verify-result">
              <div className="staff-verify-result-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h3 style={{ margin: 0 }}>Dispensed Prescription Details</h3>
                <span className="status-badge status-badge-active">Dispensed</span>
              </div>
              
              <div className="staff-verify-info-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <span className="text-muted">Patient: </span>
                  <strong>{prescription.patientUserId?.fullName || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-muted">Doctor: </span>
                  <strong>{prescription.doctorId?.userId?.fullName || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-muted">Total Amount: </span>
                  <strong>{prescription.totalAmount?.toLocaleString()} VND</strong>
                </div>
                <div>
                  <span className="text-muted">Date: </span>
                  <strong>{new Date(prescription.dispensedAt).toLocaleString()}</strong>
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
                      <tr key={index}>
                        <td>
                          <strong>{item.medicineName}</strong>
                          <div className="text-muted">{item.medicineCode}</div>
                        </td>
                        <td>{item.quantity} {item.unit}</td>
                        <td>{item.dosage}</td>
                        <td>{item.instructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      </StaffLayout>
    </PageLayout>
  );
}
