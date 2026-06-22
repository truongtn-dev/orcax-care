import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import {
  DetailItem,
  RecordDetailHeader,
  RecordDetailSection,
  RecordIdChip,
  StatusBadge,
} from "../components/admin/RecordDetailParts.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { useAdminSlugRedirect } from "../hooks/useAdminSlugRedirect.js";
import {
  getAdminAccountPath,
  getAdminPatientEditPath,
  getAdminPatientPath,
} from "../utils/adminUrls.js";

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

export default function AdminPatientDetailPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const accountId = patient?.userId || patient?._id;
  const accountIsActive = patient?.accountIsActive ?? patient?.isActive;
  const profileIsActive = patient?.accountIsActive != null ? patient?.isActive : null;

  const loadPatient = () => {
    setLoading(true);
    setError("");
    AdminApiClient.getPatient(id)
      .then(({ data }) => setPatient(data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPatient();
  }, [id]);

  useAdminSlugRedirect({
    record: patient,
    paramKey: id,
    buildPath: getAdminPatientPath,
  });

  const handleDeactivate = async () => {
    if (!accountId || !patient) return;
    setStatusLoading(true);
    setMessage("");
    try {
      await AdminApiClient.deactivateUser(accountId);
      await AdminApiClient.updatePatient(id, {
        fullName: patient.fullName,
        phone: patient.phone || "",
        gender: patient.profile?.gender || "",
        address: patient.profile?.address || "",
        emergencyContactName: patient.profile?.emergencyContactName || "",
        emergencyContactPhone: patient.profile?.emergencyContactPhone || "",
        dateOfBirth: patient.profile?.dateOfBirth || "",
        isActive: false,
        accountIsActive: false,
      });
      setShowDeactivate(false);
      setMessage("Patient deactivated. They cannot sign in or book appointments.");
      loadPatient();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setStatusLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!accountId || !patient) return;
    setStatusLoading(true);
    setMessage("");
    try {
      await AdminApiClient.reactivateUser(accountId);
      await AdminApiClient.updatePatient(id, {
        fullName: patient.fullName,
        phone: patient.phone || "",
        gender: patient.profile?.gender || "",
        address: patient.profile?.address || "",
        emergencyContactName: patient.profile?.emergencyContactName || "",
        emergencyContactPhone: patient.profile?.emergencyContactPhone || "",
        dateOfBirth: patient.profile?.dateOfBirth || "",
        isActive: true,
        accountIsActive: true,
      });
      setMessage("Patient reactivated.");
      loadPatient();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Patient details"
        description="Demographics, linked account, and access status."
        actions={
          patient ? (
            <>
              <Link to={getAdminPatientEditPath(patient)} className="btn btn-primary">
                Edit patient
              </Link>
              {accountIsActive ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowDeactivate(true)}
                  disabled={statusLoading}
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleReactivate}
                  disabled={statusLoading}
                >
                  Reactivate
                </button>
              )}
              <Link to="/admin/patients" className="btn btn-secondary">
                Back to list
              </Link>
            </>
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
        {message && <div className="alert alert-success">{message}</div>}

        {!loading && patient && (
          <div className="record-detail-page">
            <RecordDetailHeader
              name={patient.fullName}
              email={patient.email}
              imageUrl={patient.profile?.avatarUrl}
              meta={
                accountId ? (
                  <p className="record-detail-meta-link">
                    <Link to={getAdminAccountPath(patient)} className="table-link">
                      Open linked account →
                    </Link>
                  </p>
                ) : null
              }
              badges={[
                <StatusBadge
                  key="account"
                  active={accountIsActive}
                  label={accountIsActive ? "Active" : "Inactive"}
                />,
                profileIsActive != null && (
                  <StatusBadge
                    key="profile"
                    active={profileIsActive}
                    label={profileIsActive ? "Profile active" : "Profile inactive"}
                  />
                ),
                <StatusBadge
                  key="email"
                  active={patient.isEmailVerified}
                  label={patient.isEmailVerified ? "Email verified" : "Email not verified"}
                />,
                patient.isLocked && (
                  <span key="locked" className="status-badge status-badge-locked">
                    Locked
                  </span>
                ),
              ].filter(Boolean)}
            />

            <div className="detail-grid">
              <RecordDetailSection title="Linked account">
                <div className="detail-list">
                  <DetailItem label="Full name" value={patient.fullName} />
                  <DetailItem label="Email" value={patient.email} />
                  <DetailItem label="Phone number" value={patient.phone || "—"} />
                  <DetailItem label="Registered" value={formatDate(patient.createdAt)} />
                  <DetailItem label="Last login" value={formatDate(patient.lastLoginAt)} />
                  <DetailItem label="Last password change" value={formatDate(patient.passwordChangedAt)} />
                  <RecordIdChip label="Patient record ID" value={patient._id} />
                  <RecordIdChip label="Linked account ID" value={accountId} />
                </div>
              </RecordDetailSection>

              <RecordDetailSection title="Demographics">
                <div className="detail-list">
                  <DetailItem label="Date of birth" value={formatDateOnly(patient.profile?.dateOfBirth)} />
                  <DetailItem
                    label="Gender"
                    value={GENDER_LABELS[patient.profile?.gender] || patient.profile?.gender || "—"}
                  />
                  <DetailItem label="Address" value={patient.profile?.address || "—"} />
                  <DetailItem
                    label="Emergency contact name"
                    value={patient.profile?.emergencyContactName || "—"}
                  />
                  <DetailItem
                    label="Emergency contact phone"
                    value={patient.profile?.emergencyContactPhone || "—"}
                  />
                </div>
              </RecordDetailSection>

              <RecordDetailSection title="Account status">
                <div className="detail-list">
                  <DetailItem
                    label="Account status"
                    value={
                      <StatusBadge
                        active={accountIsActive}
                        label={accountIsActive ? "Active" : "Inactive"}
                      />
                    }
                  />
                  {profileIsActive != null && (
                    <DetailItem
                      label="Profile status"
                      value={
                        <StatusBadge
                          active={profileIsActive}
                          label={profileIsActive ? "Active" : "Inactive"}
                        />
                      }
                    />
                  )}
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
                    value={
                      patient.isLocked ? (
                        <span className="status-badge status-badge-locked">Locked</span>
                      ) : (
                        "No"
                      )
                    }
                  />
                  <DetailItem label="Last updated" value={formatDate(patient.updatedAt)} />
                </div>
              </RecordDetailSection>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={showDeactivate}
          title="Deactivate patient?"
          description="The patient account will be disabled and cannot book appointments. Data is retained."
          confirmText={statusLoading ? "Processing…" : "Deactivate"}
          variant="danger"
          loading={statusLoading}
          onConfirm={handleDeactivate}
          onCancel={() => setShowDeactivate(false)}
        />
      </AdminLayout>
    </PageLayout>
  );
}
