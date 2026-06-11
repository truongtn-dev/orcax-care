import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import RecordAvatar from "../components/RecordAvatar.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { getApiErrorMessage } from "../services/api.js";

const GENDER_LABELS = {
  male: "Male",
  female: "Female",
  other: "Other",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function StatusBadge({ active, label }) {
  return (
    <span className={`status-badge ${active ? "status-badge-active" : "status-badge-inactive"}`}>
      {label}
    </span>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value ?? "—"}</span>
    </div>
  );
}

export default function AdminPatientDetailPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    AdminApiClient.getPatient(id)
      .then(({ data }) => setPatient(data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Patient details"
        description="View and manage patient information."
        actions={
          patient ? (
            <Link to={`/admin/patient/${id}/edit`} className="btn btn-primary">
              Edit patient
            </Link>
          ) : null
        }
      >

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading patient…
        </div>
      )}

      {error && !loading && <div className="alert alert-error">{error}</div>}

      {!loading && patient && (
        <>
          <div className="card account-detail-header">
            <RecordAvatar name={patient.fullName} imageUrl={patient.profile?.avatarUrl} />
            <div>
              <h2>{patient.fullName}</h2>
              <p>{patient.email}</p>
              <p>
                <Link to={`/admin/account/${patient._id}`} className="table-link">
                  Open linked account →
                </Link>
              </p>
              <div className="status-badge-group">
                <StatusBadge active={patient.isActive} label={patient.isActive ? "Active" : "Inactive"} />
                <StatusBadge
                  active={patient.isEmailVerified}
                  label={patient.isEmailVerified ? "Email verified" : "Email not verified"}
                />
                {patient.isLocked && <span className="status-badge status-badge-locked">Locked</span>}
              </div>
            </div>
          </div>

          <div className="detail-grid">
            <section className="card detail-section">
              <h3>Linked account</h3>
              <div className="detail-list">
                <DetailItem label="Full name" value={patient.fullName} />
                <DetailItem label="Email" value={patient.email} />
                <DetailItem label="Phone number" value={patient.phone || "—"} />
                <DetailItem label="Registered" value={formatDate(patient.createdAt)} />
                <DetailItem label="Last login" value={formatDate(patient.lastLoginAt)} />
                <DetailItem label="Last password change" value={formatDate(patient.passwordChangedAt)} />
              </div>
            </section>

            <section className="card detail-section">
              <h3>Demographics</h3>
              <div className="detail-list">
                <DetailItem label="Date of birth" value={formatDateOnly(patient.profile.dateOfBirth)} />
                <DetailItem
                  label="Gender"
                  value={GENDER_LABELS[patient.profile.gender] || patient.profile.gender || "—"}
                />
                <DetailItem label="Address" value={patient.profile.address || "—"} />
                <DetailItem label="Emergency contact name" value={patient.profile.emergencyContactName || "—"} />
                <DetailItem label="Emergency contact phone" value={patient.profile.emergencyContactPhone || "—"} />
              </div>
            </section>

            <section className="card detail-section">
              <h3>Account status</h3>
              <div className="detail-list">
                <DetailItem
                  label="Account status"
                  value={
                    <StatusBadge active={patient.isActive} label={patient.isActive ? "Active" : "Inactive"} />
                  }
                />
                <DetailItem
                  label="Email verification"
                  value={
                    <StatusBadge
                      active={patient.isEmailVerified}
                      label={patient.isEmailVerified ? "Verified" : "Not verified"}
                    />
                  }
                />
                <DetailItem
                  label="Account locked"
                  value={patient.isLocked ? <span className="status-badge status-badge-locked">Locked</span> : "No"}
                />
                <DetailItem label="Last updated" value={formatDate(patient.updatedAt)} />
              </div>
            </section>
          </div>
        </>
      )}
      </AdminLayout>
    </PageLayout>
  );
}
