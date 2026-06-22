import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import {
  DetailItem,
  RecordDetailHeader,
  RecordDetailSection,
  RecordIdChip,
  StatusBadge,
} from "../../components/admin/RecordDetailParts.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";
import { useAdminSlugRedirect } from "../../hooks/useAdminSlugRedirect.js";
import {
  getAdminAccountPath,
  getAdminDoctorEditPath,
  getAdminDoctorPath,
} from "../../utils/adminUrls.js";
import { getDoctorProfilePath } from "../../utils/doctorUrls.js";

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
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

  useAdminSlugRedirect({
    record: doctor,
    paramKey: id,
    buildPath: getAdminDoctorPath,
  });

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
        description="Professional profile, schedule summary, and linked account."
        actions={
          doctor && (
            <>
              <Link to={getAdminDoctorEditPath(doctor)} className="btn btn-primary">
                Edit profile
              </Link>
              {doctor.userId && (
                <Link to={getAdminAccountPath(doctor.userSlug || doctor.userId)} className="btn btn-outline">
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
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            Loading doctor…
          </div>
        )}

        {error && !loading && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {!loading && doctor && (
          <div className="record-detail-page">
            <RecordDetailHeader
              name={doctor.fullName}
              email={doctor.email}
              imageUrl={doctor.photoUrl}
              badges={[
                <StatusBadge key="status" active={isActive} label={isActive ? "Active" : "Inactive"} />,
                <span key="specialty" className="role-badge">
                  {doctor.specialtyName || "Specialty"}
                </span>,
              ]}
            />

            <div className="detail-grid">
              <RecordDetailSection title="Professional profile">
                <div className="detail-list">
                  <DetailItem label="License number" value={doctor.licenseNo} />
                  <DetailItem label="Consultation fee" value={formatCurrency(doctor.consultationFee)} />
                  <DetailItem label="Specialty" value={doctor.specialtyName} />
                  <DetailItem label="Department" value={doctor.departmentName} />
                  <DetailItem label="Phone" value={doctor.phone || "—"} />
                  <DetailItem label="Public profile">
                    {doctor.slug ? (
                      <Link
                        to={getDoctorProfilePath(doctor)}
                        className="table-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open public page
                      </Link>
                    ) : (
                      "N/A"
                    )}
                  </DetailItem>
                  <DetailItem label="Bio" value={doctor.bio || "—"} fullWidth />
                </div>
              </RecordDetailSection>

              <RecordDetailSection title="Schedule summary">
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
              </RecordDetailSection>

              <RecordDetailSection title="Linked account">
                <div className="detail-list">
                  {doctor.userId && (
                    <DetailItem label="Account">
                      <Link to={getAdminAccountPath(doctor.userSlug || doctor.userId)} className="table-link">
                        View linked account
                      </Link>
                    </DetailItem>
                  )}
                  <RecordIdChip label="User ID" value={doctor.userId} />
                  <RecordIdChip label="Doctor ID" value={doctor._id} />
                  <DetailItem
                    label="Account status"
                    value={doctor.accountIsActive ? "Active" : "Inactive"}
                  />
                </div>
              </RecordDetailSection>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={showDeactivate}
          title="Deactivate doctor?"
          description="This doctor will be hidden from patient search. Historical appointments are retained."
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
