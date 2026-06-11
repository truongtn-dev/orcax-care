import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { getApiErrorMessage } from "../services/api.js";

const GENDER_LABELS = {
  male: "Male",
  female: "Female",
  other: "Other",
};

function formatRoleLabel(role) {
  const labels = { admin: "Administrator", doctor: "Doctor", staff: "Staff", patient: "Patient" };
  return labels[role] || role;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
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

export default function AdminAccountDetailPage() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    AdminApiClient.getAccount(id)
      .then(({ data }) => setAccount(data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <PageLayout>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <Link to="/admin/account" className="back-link">
              ← Back to account list
            </Link>
            <h1>Account details</h1>
            <p>View complete information for this user account.</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading account…
        </div>
      )}

      {error && !loading && <div className="alert alert-error">{error}</div>}

      {!loading && account && (
        <>
          <div className="card account-detail-header">
            <div className="account-detail-avatar">{account.fullName?.charAt(0)?.toUpperCase() || "?"}</div>
            <div>
              <h2>{account.fullName}</h2>
              <p>{account.email}</p>
              <div className="status-badge-group">
                <span className="role-badge">{formatRoleLabel(account.role)}</span>
                <StatusBadge active={account.isActive} label={account.isActive ? "Active" : "Inactive"} />
                <StatusBadge
                  active={account.isEmailVerified}
                  label={account.isEmailVerified ? "Email verified" : "Email not verified"}
                />
                {account.isLocked && <span className="status-badge status-badge-locked">Locked</span>}
              </div>
            </div>
          </div>

          <div className="detail-grid">
            <section className="card detail-section">
              <h3>Account information</h3>
              <div className="detail-list">
                <DetailItem label="Full name" value={account.fullName} />
                <DetailItem label="Email" value={account.email} />
                <DetailItem label="Phone number" value={account.phone || "—"} />
                <DetailItem label="Role" value={formatRoleLabel(account.role)} />
                <DetailItem label="Last login" value={formatDate(account.lastLoginAt)} />
                <DetailItem label="Last password change" value={formatDate(account.passwordChangedAt)} />
                <DetailItem label="Created" value={formatDate(account.createdAt)} />
                <DetailItem label="Last updated" value={formatDate(account.updatedAt)} />
              </div>
            </section>

            {account.role === "patient" && (
              <section className="card detail-section">
                <h3>Patient profile</h3>
                <div className="detail-list">
                  <DetailItem label="Date of birth" value={formatDateOnly(account.profile.dateOfBirth)} />
                  <DetailItem
                    label="Gender"
                    value={GENDER_LABELS[account.profile.gender] || account.profile.gender || "—"}
                  />
                  <DetailItem label="Address" value={account.profile.address || "—"} />
                  <DetailItem label="Emergency contact" value={account.profile.emergencyContactName || "—"} />
                  <DetailItem label="Emergency phone" value={account.profile.emergencyContactPhone || "—"} />
                  <DetailItem
                    label="Profile status"
                    value={account.profile.isActive ? "Active" : "Inactive"}
                  />
                </div>
              </section>
            )}

            {account.role === "doctor" && (
              <section className="card detail-section">
                <h3>Doctor profile</h3>
                <div className="detail-list">
                  <DetailItem label="License number" value={account.profile.licenseNo || "—"} />
                  <DetailItem label="Specialty" value={account.profile.specialty?.name || "—"} />
                  <DetailItem label="Department" value={account.profile.department?.name || "—"} />
                  <DetailItem label="Profile status" value={account.profile.isActive ? "Active" : "Inactive"} />
                  <div className="detail-item detail-item-full">
                    <span className="detail-label">Bio</span>
                    <span className="detail-value">{account.profile.bio || "—"}</span>
                  </div>
                </div>
              </section>
            )}

            {account.role === "admin" && (
              <section className="card detail-section">
                <h3>Administrator</h3>
                <p className="detail-note">This account has system administrator privileges.</p>
              </section>
            )}
          </div>
        </>
      )}
    </PageLayout>
  );
}
