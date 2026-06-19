import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import RecordAvatar from "../../components/RecordAvatar.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";
import { getDoctorProfilePath } from "../../utils/doctorUrls.js";

function StatusBadge({ active, label }) {
  return (
    <span className={`status-badge ${active ? "status-badge-active" : "status-badge-inactive"}`}>
      {label}
    </span>
  );
}

function DetailItem({ label, value, children }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{children ?? value ?? "—"}</span>
    </div>
  );
}

export default function DoctorDetailPage() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const loadDoctor = () => {
    setLoading(true);
    setError("");
    AdminApiClient.getDoctor(id)
      .then(({ data }) => setDoctor(data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDoctor();
  }, [id]);

  const handleDeactivate = async () => {
    setStatusLoading(true);
    setMessage("");
    try {
      await AdminApiClient.updateDoctor(id, { isActive: false, accountIsActive: false });
      setShowDeactivate(false);
      setMessage("Doctor deactivated. Profile is hidden from patient search.");
      loadDoctor();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setStatusLoading(false);
    }
  };

  const handleReactivate = async () => {
    setStatusLoading(true);
    setMessage("");
    try {
      await AdminApiClient.updateDoctor(id, { isActive: true, accountIsActive: true });
      setMessage("Doctor reactivated.");
      loadDoctor();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setStatusLoading(false);
    }
  };

  const isActive = doctor?.isActive && doctor?.accountIsActive;

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Doctor details"
        description="Read-only professional profile with schedule summary."
        actions={
          doctor && (
            <>
              <Link to={`/admin/doctors/${id}/edit`} className="btn btn-primary">
                Edit profile
              </Link>
              {doctor.userId && (
                <Link to={`/admin/account/${doctor.userId}`} className="btn btn-outline">
                  View account
                </Link>
              )}
              {isActive ? (
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
              <Link to="/admin/doctors" className="btn btn-secondary">
                Back to list
              </Link>
            </>
          )
        }
      >
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/admin">Admin</Link>
          <span aria-hidden="true">/</span>
          <Link to="/admin/doctors">Doctors</Link>
          <span aria-hidden="true">/</span>
          <span>{doctor?.fullName || "Detail"}</span>
        </nav>

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            Loading doctor…
          </div>
        )}

        {error && !loading && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {!loading && doctor && (
          <>
            <div className="card account-detail-header">
              <RecordAvatar name={doctor.fullName} imageUrl={doctor.photoUrl} />
              <div>
                <h2>{doctor.fullName}</h2>
                <p>{doctor.email}</p>
                <div className="status-badge-group">
                  <StatusBadge active={isActive} label={isActive ? "Active" : "Inactive"} />
                  <span className="role-badge">{doctor.specialtyName || "Specialty"}</span>
                </div>
              </div>
            </div>

            <div className="detail-grid">
              <section className="card detail-section">
                <h3>Professional profile</h3>
                <div className="detail-list">
                  <DetailItem label="License number" value={doctor.licenseNo} />
                  <DetailItem label="Specialty" value={doctor.specialtyName} />
                  <DetailItem label="Department" value={doctor.departmentName} />
                  <DetailItem label="Phone" value={doctor.phone || "—"} />
                  <DetailItem label="Public profile">
                    {doctor.slug ? (
                      <Link to={getDoctorProfilePath(doctor)} className="table-link" target="_blank" rel="noreferrer">
                        Open public page
                      </Link>
                    ) : (
                      "N/A"
                    )}
                  </DetailItem>
                  <div className="detail-item detail-item-full">
                    <span className="detail-label">Bio</span>
                    <span className="detail-value">{doctor.bio || "—"}</span>
                  </div>
                </div>
              </section>

              <section className="card detail-section">
                <h3>Schedule summary</h3>
                <div className="detail-list">
                  <DetailItem
                    label="Work-shift templates"
                    value={doctor.scheduleSummary?.workShiftCount ?? 0}
                  />
                  <DetailItem
                    label="Confirmed appointments"
                    value={doctor.scheduleSummary?.upcomingAppointments ?? 0}
                  />
                </div>
                <p className="detail-note">{doctor.scheduleSummary?.note}</p>
                <Link to="/admin/work-shifts" className="btn btn-outline btn-sm">
                  Manage work shifts
                </Link>
              </section>

              <section className="card detail-section">
                <h3>Linked account</h3>
                <div className="detail-list">
                  <DetailItem label="User ID" value={doctor.userId || "N/A"} />
                  <DetailItem label="Doctor ID" value={doctor._id} />
                  <DetailItem
                    label="Account status"
                    value={doctor.accountIsActive ? "Active" : "Inactive"}
                  />
                </div>
              </section>
            </div>
          </>
        )}

        <ConfirmDialog
          open={showDeactivate}
          title="Deactivate doctor?"
          message="This doctor will be hidden from patient search. Historical appointments are retained."
          confirmLabel={statusLoading ? "Processing…" : "Deactivate"}
          onConfirm={handleDeactivate}
          onCancel={() => setShowDeactivate(false)}
        />
      </AdminLayout>
    </PageLayout>
  );
}
