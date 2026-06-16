import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import FilterSearchField from "../components/FilterSearchField.jsx";
import AppPagination from "../components/AppPagination.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import AppModal from "../components/AppModal.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { firstFormError, validateAdminCreateSpecialtyForm } from "../utils/validation.js";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
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

export default function AdminSpecialtyPage() {
  const [filters, setFilters] = useState({ q: "", isActive: "", page: 1, limit: 20 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const loadSpecialties = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listSpecialties(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], total: 0, totalPages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSpecialties(filters);
  }, [filters, loadSpecialties]);

  const applyFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  const clearFilters = () => {
    setFilters({ q: "", isActive: "", page: 1, limit: 20 });
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setCreateError("");
    setCreateSuccess("");
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

    const errors = validateAdminCreateSpecialtyForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setCreateError(firstFormError(errors));
      return;
    }

    setFieldErrors({});
    setCreating(true);

    try {
      const { data } = await AdminApiClient.createSpecialty({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
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
        const bodyMessage = message.toLowerCase();
        if (bodyMessage.includes("code")) {
          setFieldErrors({ code: message });
        } else {
          setFieldErrors({ name: message });
        }
      }
    } finally {
      setCreating(false);
    }
  };

  const fieldError = (name) => fieldErrors[name];

  const openDeleteConfirm = (specialty) => {
    if (specialty.doctorCount > 0) {
      setActionError(
        `Cannot delete "${specialty.name}". This specialty is assigned to ${specialty.doctorCount} doctor(s).`
      );
      setActionMessage("");
      return;
    }
    setActionError("");
    setActionMessage("");
    setDeleteTarget(specialty);
  };

  const closeDeleteConfirm = () => {
    if (deletingId) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget._id);
    setActionError("");
    setActionMessage("");

    try {
      const { data } = await AdminApiClient.deleteSpecialty(deleteTarget._id);
      setActionMessage(data.message);
      setDeleteTarget(null);
      loadSpecialties(filters);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageLayout dashboard>
      <AdminLayout title="Specialty management">
      <div className="card filters-card">
        <div className="filters-toolbar">
          <div className="filters-toolbar-fields">
            <FilterSearchField
              id="admin-specialty-search"
              placeholder="Search by code, name, or description…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              onSearch={() => applyFilters({ q: filters.q })}
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
              Create specialty
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {actionError && <div className="alert alert-error">{actionError}</div>}
      {actionMessage && <div className="alert alert-success">{actionMessage}</div>}

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading specialties…
        </div>
      )}

      {!loading && result.items.length === 0 && (
        <div className="empty-state card">
          <h3>No specialties found</h3>
          <p>Try adjusting your search criteria or create a new specialty.</p>
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
                  <th>Code</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="table-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((specialty) => (
                  <tr key={specialty._id} className={!specialty.isActive ? "row-inactive" : ""}>
                    <td>
                      <span className="code-badge">{specialty.code}</span>
                    </td>
                    <td className="specialty-name-cell">{specialty.name}</td>
                    <td className="description-cell">{specialty.description || "—"}</td>
                    <td>{specialty.doctorCount}</td>
                    <td>
                      <StatusBadge active={specialty.isActive} />
                    </td>
                    <td>{formatDate(specialty.createdAt)}</td>
                    <td className="table-actions-col">
                      <div className="table-row-actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-icon btn-icon-danger"
                        aria-label={`Delete ${specialty.name}`}
                        title={
                          specialty.doctorCount > 0
                            ? `Cannot delete — linked to ${specialty.doctorCount} doctor(s)`
                            : specialty.isActive
                              ? "Inactive specialties"
                              : "Already inactive"
                        }
                        disabled={
                          deletingId === specialty._id ||
                          specialty.doctorCount > 0 ||
                          !specialty.isActive
                        }
                        onClick={() => openDeleteConfirm(specialty)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                      </div>
                    </td>
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
          itemLabel="specialties"
          onPageChange={(page) => applyFilters({ page })}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Deactivate specialty?"
        description={
          deleteTarget
            ? `You are about to deactivate "${deleteTarget.name}" (${deleteTarget.code}).`
            : ""
        }
        confirmText="Yes, deactivate"
        cancelText="Cancel"
        variant="danger"
        loading={Boolean(deletingId)}
        onConfirm={confirmDelete}
        onCancel={closeDeleteConfirm}
      />

      {showCreateModal && (
        <AppModal
          title="Create specialty"
          description="Add a new medical specialty to the system."
          titleId="create-specialty-title"
          onClose={closeCreateModal}
        >
            <form onSubmit={onCreateSubmit} className="form form-compact">
              {createError && <div className="alert alert-error">{createError}</div>}
              {createSuccess && <div className="alert alert-success">{createSuccess}</div>}

              <label>
                Code
                <input
                  name="code"
                  value={form.code}
                  onChange={onFormChange}
                  placeholder="e.g. CARD"
                  aria-invalid={Boolean(fieldError("code"))}
                  style={{ textTransform: "uppercase" }}
                />
                {fieldError("code") && <span className="field-error">{fieldError("code")}</span>}
                <span className="field-hint">2–12 characters: letters, numbers, hyphens, underscores</span>
              </label>

              <label>
                Name
                <input
                  name="name"
                  value={form.name}
                  onChange={onFormChange}
                  placeholder="e.g. Cardiology"
                  aria-invalid={Boolean(fieldError("name"))}
                />
                {fieldError("name") && <span className="field-error">{fieldError("name")}</span>}
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onFormChange}
                  rows={3}
                  placeholder="Short specialty description (optional)"
                  aria-invalid={Boolean(fieldError("description"))}
                />
                {fieldError("description") && (
                  <span className="field-error">{fieldError("description")}</span>
                )}
              </label>

              <label className="checkbox-row">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={onFormChange} />
                Active (visible in system)
              </label>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={closeCreateModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Creating…" : "Create specialty"}
                </button>
              </div>
            </form>
        </AppModal>
      )}
      </AdminLayout>
    </PageLayout>
  );
}
