import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import FilterSearchField from "../components/FilterSearchField.jsx";
import AppPagination from "../components/AppPagination.jsx";
import AppModal from "../components/AppModal.jsx";
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
    <PageLayout dashboard>
      <AdminLayout title="Clinic room management">
      <div className="card filters-card">
        <div className="filters-toolbar">
          <div className="filters-toolbar-fields">
            <FilterSearchField
              id="admin-clinic-room-search"
              placeholder="Search by code, name, floor, or equipment…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              onSearch={() => applyFilters({ q: filters.q })}
            />
            <CustomSelect
              className="filter-field"
              label="Department"
              value={filters.departmentId}
              placeholder="All departments"
              onChange={(departmentId) => applyFilters({ departmentId })}
              options={[
                { value: "", label: "All departments" },
                ...departments.map((dept) => ({ value: dept._id, label: dept.name })),
              ]}
            />
            <CustomSelect
              className="filter-field"
              label="Status"
              value={filters.isActive}
              onChange={(isActive) => applyFilters({ isActive })}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="filters-toolbar-actions">
            <button type="button" className="btn btn-primary" onClick={() => applyFilters({ q: filters.q })}>
              Search
            </button>
            <button type="button" className="btn btn-outline" onClick={clearFilters}>
              Clear filters
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
              Create clinic room
            </button>
          </div>
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
            Clear filters
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

      {!loading && result.total > 0 && (
        <AppPagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          limit={filters.limit}
          itemLabel="clinic rooms"
          onPageChange={(page) => applyFilters({ page })}
        />
      )}

      {showCreateModal && (
        <AppModal
          title="Create clinic room"
          description="Add a new clinic or treatment room."
          titleId="create-clinic-room-title"
          onClose={closeCreateModal}
        >
            <form onSubmit={onCreateSubmit} className="form form-compact">
              {createError && <div className="alert alert-error">{createError}</div>}
              {createSuccess && <div className="alert alert-success">{createSuccess}</div>}

              <div>
                <CustomSelect
                  label="Department"
                  value={form.departmentId}
                  placeholder="Select department"
                  onChange={(departmentId) => onFormChange({ target: { name: "departmentId", value: departmentId } })}
                  options={[
                    { value: "", label: "Select department" },
                    ...departments.map((dept) => ({ value: dept._id, label: dept.name })),
                  ]}
                  invalid={Boolean(fieldError("departmentId"))}
                />
                {fieldError("departmentId") && (
                  <span className="field-error">{fieldError("departmentId")}</span>
                )}
              </div>

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
                <span className="field-hint">2–12 characters: letters, numbers, hyphens, underscores</span>
              </label>

              <label>
                Room name
                <input
                  name="name"
                  value={form.name}
                  onChange={onFormChange}
                  placeholder="e.g. Clinic room 203"
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
                Active (available for booking)
              </label>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={closeCreateModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Creating…" : "Create clinic room"}
                </button>
              </div>
            </form>
        </AppModal>
      )}
      </AdminLayout>
    </PageLayout>
  );
}
