import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { firstFormError, validateAdminCreateClinicRoomForm } from "../utils/validation.js";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const EMPTY_FORM = {
  departmentId: "",
  roomCode: "",
  name: "",
  floor: "",
  capacity: "1",
  equipmentNotes: "",
  isActive: true,
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function StatusBadge({ active }) {
  return (
    <span className={`status-badge ${active ? "status-badge-active" : "status-badge-inactive"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function AdminClinicRoomPage() {
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ q: "", departmentId: "", isActive: "", page: 1, limit: 20 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);

  const loadDepartments = useCallback(() => {
    return AdminApiClient.listClinicRoomDepartments()
      .then(({ data }) => setDepartments(data.items || []))
      .catch(() => setDepartments([]));
  }, []);

  const loadClinicRooms = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listClinicRooms(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], total: 0, totalPages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadClinicRooms(filters);
  }, [filters, loadClinicRooms]);

  const applyFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  const clearFilters = () => {
    setFilters({ q: "", departmentId: "", isActive: "", page: 1, limit: 20 });
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setCreateError("");
    setCreateSuccess("");
    loadDepartments();
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFieldErrors({});
    setCreateError("");
    setCreateSuccess("");
  };

  const onFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setCreateError("");
    setCreateSuccess("");
  };

  const onCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    const errors = validateAdminCreateClinicRoomForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setCreateError(firstFormError(errors));
      return;
    }

    setFieldErrors({});
    setCreating(true);

    try {
      const { data } = await AdminApiClient.createClinicRoom({
        departmentId: form.departmentId,
        roomCode: form.roomCode.trim(),
        name: form.name.trim(),
        floor: form.floor.trim(),
        capacity: parseInt(form.capacity, 10),
        equipmentNotes: form.equipmentNotes.trim(),
        isActive: form.isActive,
      });
      setCreateSuccess(data.message);
      setForm(EMPTY_FORM);
      applyFilters({ page: 1 });
      setTimeout(() => closeCreateModal(), 900);
    } catch (err) {
      const message = getApiErrorMessage(err);
      setCreateError(message);
      if (err?.response?.status === 409) {
        setFieldErrors({ roomCode: message });
      }
    } finally {
      setCreating(false);
    }
  };

  const fieldError = (name) => fieldErrors[name];

  return (
    <PageLayout>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <Link to="/admin" className="back-link">
              ← Admin Console
            </Link>
            <h1>Clinic Rooms</h1>
            <p>View and manage examination and treatment rooms across departments.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            Create Clinic Room
          </button>
        </div>
      </div>

      <div className="card filters-card">
        <div className="filters-row">
          <input
            type="search"
            placeholder="Search by code, name, floor, or equipment…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && applyFilters({ q: filters.q })}
          />
          <select
            value={filters.departmentId}
            onChange={(e) => applyFilters({ departmentId: e.target.value })}
          >
            <option value="">All departments</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>
          <select value={filters.isActive} onChange={(e) => applyFilters({ isActive: e.target.value })}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={() => applyFilters({ q: filters.q })}>
            Search
          </button>
          <button type="button" className="btn btn-outline" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading clinic rooms…
        </div>
      )}

      {!loading && result.items.length === 0 && (
        <div className="empty-state card">
          <h3>No clinic rooms found</h3>
          <p>Try adjusting your search criteria or create a new clinic room.</p>
          <button type="button" className="btn btn-outline" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      )}

      {!loading && result.items.length > 0 && (
        <div className="card data-table-card">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Room code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Floor</th>
                  <th>Capacity</th>
                  <th>Equipment</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((room) => (
                  <tr key={room._id} className={!room.isActive ? "row-inactive" : ""}>
                    <td>
                      <span className="code-badge">{room.roomCode}</span>
                    </td>
                    <td className="specialty-name-cell">{room.name}</td>
                    <td>
                      <div>{room.department?.name || "—"}</div>
                      {room.department?.location && (
                        <div className="table-subtext">{room.department.location}</div>
                      )}
                    </td>
                    <td>{room.floor || "—"}</td>
                    <td>{room.capacity}</td>
                    <td className="description-cell">{room.equipmentNotes || "—"}</td>
                    <td>
                      <StatusBadge active={room.isActive} />
                    </td>
                    <td>{formatDate(room.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result.totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="btn btn-outline"
            disabled={result.page <= 1}
            onClick={() => applyFilters({ page: result.page - 1 })}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {result.page} of {result.totalPages} · {result.total} rooms
          </span>
          <button
            type="button"
            className="btn btn-outline"
            disabled={result.page >= result.totalPages}
            onClick={() => applyFilters({ page: result.page + 1 })}
          >
            Next
          </button>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-backdrop" onClick={closeCreateModal}>
          <div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-clinic-room-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="create-clinic-room-title">Create Clinic Room</h2>
                <p>Add a new examination or treatment room.</p>
              </div>
              <button type="button" className="modal-close" onClick={closeCreateModal} aria-label="Close">
                ×
              </button>
            </div>

            <form onSubmit={onCreateSubmit} className="form form-compact">
              {createError && <div className="alert alert-error">{createError}</div>}
              {createSuccess && <div className="alert alert-success">{createSuccess}</div>}

              <label>
                Department
                <select
                  name="departmentId"
                  value={form.departmentId}
                  onChange={onFormChange}
                  aria-invalid={Boolean(fieldError("departmentId"))}
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {fieldError("departmentId") && (
                  <span className="field-error">{fieldError("departmentId")}</span>
                )}
              </label>

              <label>
                Room code
                <input
                  name="roomCode"
                  value={form.roomCode}
                  onChange={onFormChange}
                  placeholder="e.g. IM-203"
                  aria-invalid={Boolean(fieldError("roomCode"))}
                  style={{ textTransform: "uppercase" }}
                />
                {fieldError("roomCode") && <span className="field-error">{fieldError("roomCode")}</span>}
                <span className="field-hint">2–12 characters, letters, numbers, hyphen, underscore</span>
              </label>

              <label>
                Room name
                <input
                  name="name"
                  value={form.name}
                  onChange={onFormChange}
                  placeholder="e.g. Consultation Room 203"
                  aria-invalid={Boolean(fieldError("name"))}
                />
                {fieldError("name") && <span className="field-error">{fieldError("name")}</span>}
              </label>

              <label>
                Floor
                <input
                  name="floor"
                  value={form.floor}
                  onChange={onFormChange}
                  placeholder="e.g. 2"
                  aria-invalid={Boolean(fieldError("floor"))}
                />
                {fieldError("floor") && <span className="field-error">{fieldError("floor")}</span>}
              </label>

              <label>
                Capacity
                <input
                  type="number"
                  name="capacity"
                  value={form.capacity}
                  onChange={onFormChange}
                  min={1}
                  max={50}
                  aria-invalid={Boolean(fieldError("capacity"))}
                />
                {fieldError("capacity") && <span className="field-error">{fieldError("capacity")}</span>}
              </label>

              <label>
                Equipment notes
                <textarea
                  name="equipmentNotes"
                  value={form.equipmentNotes}
                  onChange={onFormChange}
                  rows={3}
                  placeholder="Available equipment (optional)"
                  aria-invalid={Boolean(fieldError("equipmentNotes"))}
                />
                {fieldError("equipmentNotes") && (
                  <span className="field-error">{fieldError("equipmentNotes")}</span>
                )}
              </label>

              <label className="checkbox-row">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={onFormChange} />
                Active (available for scheduling)
              </label>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={closeCreateModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Creating…" : "Create Clinic Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
