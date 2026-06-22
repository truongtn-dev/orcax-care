import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

function StatusBadge({ active }) {
  return (
    <span className={`status-badge ${active ? "status-badge-active" : "status-badge-inactive"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function SpecialtyDetailPage() {
  const { id } = useParams();
  const [specialty, setSpecialty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    AdminApiClient.getSpecialty(id)
      .then(({ data }) => setSpecialty(data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Specialty details"
        description="Read-only specialty profile with linked doctors."
        actions={
          <>
            <Link to="/admin/specialty" className="btn btn-secondary">
              Back to specialties
            </Link>
            {specialty && (
              <Link
                to={`/admin/doctors?specialtyId=${specialty._id}`}
                className="btn btn-primary"
              >
                View doctors
              </Link>
            )}
          </>
        }
      >
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            Loading specialty…
          </div>
        )}

        {error && !loading && <div className="alert alert-error">{error}</div>}

        {!loading && specialty && (
          <div className="detail-grid">
            <section className="card detail-section">
              <h3>Specialty information</h3>
              <div className="detail-list">
                <div className="detail-item">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{specialty.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Code</span>
                  <span className="detail-value">{specialty.code}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">
                    <StatusBadge active={specialty.isActive} />
                  </span>
                </div>
                <div className="detail-item detail-item-full">
                  <span className="detail-label">Description</span>
                  <span className="detail-value">{specialty.description || "—"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">{formatDate(specialty.createdAt)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last updated</span>
                  <span className="detail-value">{formatDate(specialty.updatedAt)}</span>
                </div>
              </div>
            </section>

            <section className="card detail-section">
              <h3>Linked doctors</h3>
              <div className="detail-list">
                <div className="detail-item">
                  <span className="detail-label">Total doctors</span>
                  <span className="detail-value">{specialty.doctorCount ?? 0}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Active doctors</span>
                  <span className="detail-value">{specialty.activeDoctorCount ?? 0}</span>
                </div>
              </div>
              <p className="detail-note">
                Open the filtered doctor list to review physicians assigned to this specialty.
              </p>
              <Link to={`/admin/doctors?specialtyId=${specialty._id}`} className="btn btn-outline btn-sm">
                Browse doctors in {specialty.name}
              </Link>
            </section>
          </div>
        )}
      </AdminLayout>
    </PageLayout>
  );
}
