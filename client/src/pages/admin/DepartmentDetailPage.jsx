import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

const emptyForm = {
  name: "",
  location: "",
  phone: "",
  isActive: true,
};

export default function DepartmentDetailPage() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDepartment = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.getDepartment(id);
      setDetail(data);
      setForm({
        name: data.department.name || "",
        location: data.department.location || "",
        phone: data.department.phone || "",
        isActive: Boolean(data.department.isActive),
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDepartment();
  }, [loadDepartment]);

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
    setSuccess("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await AdminApiClient.updateDepartment(id, form);
      setSuccess(data.message || "Department updated successfully.");
      await loadDepartment();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await AdminApiClient.deactivateDepartment(id);
      setSuccess(data.message || "Department deactivated.");
      setShowDeactivateConfirm(false);
      await loadDepartment();
    } catch (err) {
      setError(getApiErrorMessage(err));
      setShowDeactivateConfirm(false);
    } finally {
      setDeactivating(false);
    }
  };

  const activeDoctorCount = detail?.summary?.activeDoctors ?? 0;

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Department details"
        description="View and update department metadata. Inactive departments are hidden from patient filters."
        actions={
          detail && (
            <>
              {detail.department.isActive ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={deactivating || activeDoctorCount > 0}
                  title={
                    activeDoctorCount > 0
                      ? `Reassign or deactivate ${activeDoctorCount} active doctor(s) first`
                      : "Deactivate department"
                  }
                  onClick={() => setShowDeactivateConfirm(true)}
                >
                  Deactivate
                </button>
              ) : null}
              <Link to="/admin?tab=departments" className="btn btn-secondary">
                Back to list
              </Link>
            </>
          )
        }
      >
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            Loading department...
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!loading && detail && (
          <>
            <div className="card form-card-centered">
              <form onSubmit={onSubmit} className="form">
                <fieldset className="form-section">
                  <legend>Department information</legend>
                  <label>
                    Department name
                    <input type="text" name="name" value={form.name} onChange={onChange} minLength={2} required />
                  </label>
                  <label>
                    Location
                    <input type="text" name="location" value={form.location} onChange={onChange} minLength={3} required />
                  </label>
                  <label>
                    Phone number
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={onChange}
                      pattern="[0-9+\-\s()]{8,20}"
                      title="Use 8–20 characters including digits, spaces, +, -, or parentheses."
                      required
                    />
                  </label>
                  <label className="checkbox-row">
                    <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
                    Department is active
                  </label>
                </fieldset>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      setForm({
                        name: detail.department.name || "",
                        location: detail.department.location || "",
                        phone: detail.department.phone || "",
                        isActive: Boolean(detail.department.isActive),
                      })
                    }
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            <div className="card">
              <div className="admin-detail-header">
                <div>
                  <h2>{detail.department.name}</h2>
                  <p className="muted">{detail.department.location}</p>
                </div>
                <span className={`status-pill ${detail.department.isActive ? "status-active" : ""}`}>
                  {detail.department.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="admin-detail-list">
                <div>
                  <span>Phone number</span>
                  <strong>{detail.department.phone}</strong>
                </div>
                <div>
                  <span>Total doctors</span>
                  <strong>{detail.summary.totalDoctors}</strong>
                </div>
                <div>
                  <span>Active doctors</span>
                  <strong>{detail.summary.activeDoctors}</strong>
                </div>
                <div>
                  <span>Total rooms</span>
                  <strong>{detail.summary.totalRooms}</strong>
                </div>
                <div>
                  <span>Active rooms</span>
                  <strong>{detail.summary.activeRooms}</strong>
                </div>
              </div>
            </div>

            <div className="card admin-table-card">
              <h3>Rooms in department</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Room name</th>
                    <th>Floor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.rooms.map((room) => (
                    <tr key={room._id}>
                      <td>{room.name}</td>
                      <td>{room.floor || "-"}</td>
                      <td>
                        <span className={`status-pill ${room.isActive ? "status-active" : ""}`}>
                          {room.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {detail.rooms.length === 0 && (
                    <tr>
                      <td colSpan="3" className="empty-cell">
                        No rooms belong to this department yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card admin-table-card">
              <h3>Doctors in department</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Specialty</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.doctors.map((doctor) => (
                    <tr key={doctor._id}>
                      <td>
                        <Link to={`/admin/doctors/${doctor._id}/edit`} className="table-link">
                          {doctor.fullName}
                        </Link>
                      </td>
                      <td>{doctor.specialtyName || "-"}</td>
                      <td>
                        <span className={`status-pill ${doctor.isActive ? "status-active" : ""}`}>
                          {doctor.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {detail.doctors.length === 0 && (
                    <tr>
                      <td colSpan="3" className="empty-cell">
                        No doctors belong to this department yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <ConfirmDialog
          open={showDeactivateConfirm}
          title="Deactivate department?"
          description={
            detail
              ? activeDoctorCount > 0
                ? `Cannot deactivate while ${activeDoctorCount} active doctor(s) remain assigned.`
                : `Deactivate "${detail.department.name}"? It will be hidden from patient-facing filters.`
              : ""
          }
          confirmText="Deactivate"
          variant="danger"
          loading={deactivating}
          onConfirm={activeDoctorCount > 0 ? () => setShowDeactivateConfirm(false) : handleDeactivate}
          onCancel={() => setShowDeactivateConfirm(false)}
        />
      </AdminLayout>
    </PageLayout>
  );
}
