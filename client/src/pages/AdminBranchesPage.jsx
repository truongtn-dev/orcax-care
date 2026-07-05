import { useCallback, useEffect, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import FilterSearchField from "../components/FilterSearchField.jsx";
import AppPagination from "../components/AppPagination.jsx";
import AppModal from "../components/AppModal.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { getBranchPath } from "../utils/branchUrls.js";
import "./AdminBranchesPage.css";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const EMPTY_FORM = {
  name: "",
  address: "",
  phone: "",
  workingHours: "Mon–Fri 8:00–17:00",
  lat: "10.7769",
  lng: "106.7009",
  managerUserId: "",
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

export default function AdminBranchesPage() {
  const [filters, setFilters] = useState({ q: "", isActive: "", page: 1, limit: 20 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1, page: 1 });
  const [staffOptions, setStaffOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadStaffOptions = useCallback(() => {
    return AdminApiClient.listBranchStaffOptions()
      .then(({ data }) => setStaffOptions(data.items || []))
      .catch(() => setStaffOptions([]));
  }, []);

  const loadBranches = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listBranches(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], total: 0, totalPages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaffOptions();
  }, [loadStaffOptions]);

  useEffect(() => {
    loadBranches(filters);
  }, [filters, loadBranches]);

  const applyFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  const clearFilters = () => {
    setFilters({ q: "", isActive: "", page: 1, limit: 20 });
  };

  const validateBranchForm = (formState) => {
    const errors = {};
    if (!formState.name.trim()) errors.name = "Branch name is required.";
    if (!Number.isFinite(Number(formState.lat))) errors.lat = "Valid latitude is required.";
    if (!Number.isFinite(Number(formState.lng))) errors.lng = "Valid longitude is required.";
    return errors;
  };

  const buildPayload = (formState) => ({
    name: formState.name.trim(),
    address: formState.address.trim(),
    phone: formState.phone.trim(),
    workingHours: formState.workingHours.trim(),
    lat: Number(formState.lat),
    lng: Number(formState.lng),
    managerUserId: formState.managerUserId || null,
    isActive: formState.isActive,
  });

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setCreateError("");
    setCreateSuccess("");
    loadStaffOptions();
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFieldErrors({});
    setCreateError("");
    setCreateSuccess("");
  };

  const onFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setCreateError("");
    setCreateSuccess("");
  };

  const onCreateSubmit = async (event) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    const errors = validateBranchForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setCreating(true);

    try {
      await AdminApiClient.createBranch(buildPayload(form));
      setCreateSuccess("Branch created successfully.");
      setForm(EMPTY_FORM);
      applyFilters({ page: 1 });
      await loadStaffOptions();
      setTimeout(closeCreateModal, 900);
    } catch (err) {
      setCreateError(getApiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (branch) => {
    setEditTarget(branch);
    setEditForm({
      name: branch.name || "",
      address: branch.address || "",
      phone: branch.phone || "",
      workingHours: branch.workingHours || "",
      lat: String(branch.lat ?? ""),
      lng: String(branch.lng ?? ""),
      managerUserId: branch.managerUserId || "",
      isActive: branch.isActive !== false,
    });
    setEditFieldErrors({});
    setEditError("");
    setEditSuccess("");
    loadStaffOptions();
  };

  const closeEditModal = () => {
    if (updating) return;
    setEditTarget(null);
    setEditFieldErrors({});
    setEditError("");
    setEditSuccess("");
  };

  const onEditFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setEditForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setEditFieldErrors((current) => ({ ...current, [name]: undefined }));
    setEditError("");
    setEditSuccess("");
  };

  const onEditSubmit = async (event) => {
    event.preventDefault();
    if (!editTarget) return;

    setEditError("");
    setEditSuccess("");

    const errors = validateBranchForm(editForm);
    if (Object.keys(errors).length > 0) {
      setEditFieldErrors(errors);
      return;
    }

    setEditFieldErrors({});
    setUpdating(true);

    try {
      await AdminApiClient.updateBranch(editTarget._id, buildPayload(editForm));
      setEditSuccess("Branch updated successfully.");
      loadBranches(filters);
      await loadStaffOptions();
      setTimeout(closeEditModal, 900);
    } catch (err) {
      setEditError(getApiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const fieldError = (name) => fieldErrors[name];
  const editFieldError = (name) => editFieldErrors[name];

  const managerOptions = [
    { value: "", label: "Unassigned" },
    ...staffOptions.map((staff) => ({
      value: staff._id,
      label: `${staff.fullName}${staff.isBranchManager && staff.branchId ? " (current manager)" : ""}`,
    })),
  ];

  const renderBranchFormFields = ({ formState, onChange, errorsFor, disabled }) => (
    <>
      <label>
        Branch name
        <input
          name="name"
          value={formState.name}
          onChange={onChange}
          placeholder="e.g. OrcaX Care District 1"
          aria-invalid={Boolean(errorsFor("name"))}
          disabled={disabled}
        />
        {errorsFor("name") && <span className="field-error">{errorsFor("name")}</span>}
      </label>

      <label>
        Address
        <textarea
          name="address"
          value={formState.address}
          onChange={onChange}
          rows={3}
          placeholder="Street address, district, city"
          disabled={disabled}
        />
      </label>

      <div className="admin-branch-form-grid">
        <label>
          Phone
          <input
            name="phone"
            value={formState.phone}
            onChange={onChange}
            placeholder="028-1234-2001"
            disabled={disabled}
          />
        </label>

        <label>
          Working hours
          <input
            name="workingHours"
            value={formState.workingHours}
            onChange={onChange}
            placeholder="Mon–Fri 8:00–17:00"
            disabled={disabled}
          />
        </label>

        <label>
          Latitude
          <input
            name="lat"
            value={formState.lat}
            onChange={onChange}
            placeholder="10.7769"
            aria-invalid={Boolean(errorsFor("lat"))}
            disabled={disabled}
          />
          {errorsFor("lat") && <span className="field-error">{errorsFor("lat")}</span>}
        </label>

        <label>
          Longitude
          <input
            name="lng"
            value={formState.lng}
            onChange={onChange}
            placeholder="106.7009"
            aria-invalid={Boolean(errorsFor("lng"))}
            disabled={disabled}
          />
          {errorsFor("lng") && <span className="field-error">{errorsFor("lng")}</span>}
        </label>
      </div>

      <div>
        <CustomSelect
          label="Branch manager (staff)"
          value={formState.managerUserId}
          placeholder="Unassigned"
          onChange={(managerUserId) => onChange({ target: { name: "managerUserId", value: managerUserId } })}
          options={managerOptions}
          disabled={disabled}
        />
      </div>

      <label className="checkbox-row">
        <input type="checkbox" name="isActive" checked={formState.isActive} onChange={onChange} disabled={disabled} />
        Active (visible on public branch locator)
      </label>
    </>
  );

  return (
    <PageLayout dashboard>
      <AdminLayout title="Branch management">
        <div className="card filters-card">
          <div className="filters-toolbar">
            <div className="filters-toolbar-fields">
              <FilterSearchField
                id="admin-branch-search"
                placeholder="Search by name, address, phone, or slug…"
                value={filters.q}
                onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
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
                Create branch
              </button>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            Loading branches…
          </div>
        )}

        {!loading && result.items.length === 0 && (
          <div className="empty-state card">
            <h3>No branches found</h3>
            <p>Try adjusting your search criteria or create a new clinic branch.</p>
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
                    <th>Slug</th>
                    <th>Branch</th>
                    <th>Manager</th>
                    <th>Phone</th>
                    <th>Working hours</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th className="table-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((branch) => (
                    <tr key={branch._id} className={!branch.isActive ? "row-inactive" : ""}>
                      <td>
                        <span className="code-badge">{branch.slug || "—"}</span>
                      </td>
                      <td className="specialty-name-cell">
                        <div>{branch.name}</div>
                        <div className="table-subtext">{branch.address || "—"}</div>
                        <a
                          href={getBranchPath(branch)}
                          target="_blank"
                          rel="noreferrer"
                          className="admin-branch-public-link"
                        >
                          View public page
                        </a>
                      </td>
                      <td>
                        <div>{branch.manager?.fullName || "Unassigned"}</div>
                        {branch.manager?.email && <div className="table-subtext">{branch.manager.email}</div>}
                      </td>
                      <td>{branch.phone || "—"}</td>
                      <td>{branch.workingHours || "—"}</td>
                      <td>
                        <StatusBadge active={branch.isActive} />
                      </td>
                      <td>{formatDate(branch.updatedAt)}</td>
                      <td className="table-actions-col">
                        <button
                          type="button"
                          className="btn btn-outline btn-icon"
                          aria-label={`Edit ${branch.name}`}
                          title="Edit branch"
                          onClick={() => openEditModal(branch)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
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
            itemLabel="branches"
            onPageChange={(page) => applyFilters({ page })}
          />
        )}

        {showCreateModal && (
          <AppModal
            title="Create branch"
            description="Add a new clinic location and optionally assign a branch manager."
            titleId="create-branch-title"
            onClose={closeCreateModal}
          >
            <form onSubmit={onCreateSubmit} className="form form-compact">
              {createError && <div className="alert alert-error">{createError}</div>}
              {createSuccess && <div className="alert alert-success">{createSuccess}</div>}

              {renderBranchFormFields({
                formState: form,
                onChange: onFormChange,
                errorsFor: fieldError,
                disabled: creating,
              })}

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={closeCreateModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Creating…" : "Create branch"}
                </button>
              </div>
            </form>
          </AppModal>
        )}

        {editTarget && (
          <AppModal
            title="Update branch"
            description={`Edit ${editTarget.name}. Cancel discards unsaved changes.`}
            titleId="edit-branch-title"
            onClose={closeEditModal}
          >
            <form onSubmit={onEditSubmit} className="form form-compact">
              {editError && <div className="alert alert-error">{editError}</div>}
              {editSuccess && <div className="alert alert-success">{editSuccess}</div>}

              {renderBranchFormFields({
                formState: editForm,
                onChange: onEditFormChange,
                errorsFor: editFieldError,
                disabled: updating,
              })}

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={closeEditModal} disabled={updating}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </AppModal>
        )}
      </AdminLayout>
    </PageLayout>
  );
}
