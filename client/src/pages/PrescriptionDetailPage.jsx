import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DoctorLayout from "../components/DoctorLayout.jsx";
import PageLayout from "../components/PageLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiErrorMessage } from "../services/api.js";
import { DoctorApiClient } from "../services/doctorApi.js";
import { PatientApiClient } from "../services/patientApi.js";
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

function PrescriptionDetailContent({ prescription, loading, error, backTo, backLabel }) {
  return (
    <div className="prescription-detail-page">
      <div className="prescription-detail-toolbar">
        <Link to={backTo} className="btn btn-outline btn-sm">
          {backLabel}
        </Link>
        {prescription && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
            Print
          </button>
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
          <div className="prescription-detail-head">
            <div>
              <p className="patient-section-label">Prescription</p>
              <h1>Prescription Detail</h1>
              <p>Issued from encounter {prescription.encounter?.chiefComplaint || "Clinical encounter"}</p>
            </div>
            <span className={`prescription-detail-status prescription-detail-status--${prescription.status}`}>
              {prescription.status}
            </span>
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
  const [error, setError] = useState("");

  const apiClient = role === "doctor" ? DoctorApiClient : PatientApiClient;
  const backTarget = useMemo(() => {
    if (role === "doctor") {
      return prescription?.encounter?._id
        ? `/doctor/encounters/${prescription.encounter._id}`
        : "/doctor/today-appointments";
    }
    return "/patient/emr";
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

  const content = (
    <PrescriptionDetailContent
      prescription={prescription}
      loading={loading}
      error={error}
      backTo={backTarget}
      backLabel={role === "doctor" ? "Back to encounter" : "Back to EMR"}
    />
  );

  if (role === "doctor") {
    return (
      <PageLayout dashboard>
        <DoctorLayout title="Prescription detail" description="Read-only prescription review and print view.">
          {content}
        </DoctorLayout>
      </PageLayout>
    );
  }

  return <PageLayout>{content}</PageLayout>;
}
