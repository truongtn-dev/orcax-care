import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import FilterSearchField from "../components/FilterSearchField.jsx";
import AppPagination from "../components/AppPagination.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { firstFormError, validateAdminCreateAccountForm } from "../utils/validation.js";

const FILTER_ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "patient", label: "Patient" },
  { value: "doctor", label: "Doctor" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Administrator" },
];

const CREATE_ROLE_OPTIONS = [
  { value: "patient", label: "Patient" },
  { value: "doctor", label: "Doctor" },
  { value: "admin", label: "Administrator" },
];

function formatRoleLabel(role) {
  const labels = { admin: "Administrator", doctor: "Doctor", staff: "Staff", patient: "Patient" };
  return labels[role] || role;
}

const EMPTY_FORM = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: "patient",
  specialtyId: "",
  departmentId: "",
  licenseNo: "",
  bio: "",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function StatusBadge({ active, label }) {
  return (
    <span className={`status-badge ${active ? "status-badge-active" : "status-badge-inactive"}`}>
      {label}
    </span>
  );
}

export default function AdminAccountPage() {
  const [filters, setFilters] = useState({ q: "", role: "", page: 1, limit: 20 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);

  const loadAccounts = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listAccounts(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], total: 0, totalPages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts(filters);
  }, [filters, loadAccounts]);

  useEffect(() => {
    if (!showCreateModal) return;

    Promise.all([PublicApiClient.getSpecialties(), PublicApiClient.getDepartments()])
      .then(([specRes, deptRes]) => {
        setSpecialties(specRes.data.items || []);
        setDepartments(deptRes.data.items || []);
      })
      .catch(() => {
        setSpecialties([]);
        setDepartments([]);
      });
  }, [showCreateModal]);

  const applyFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  const clearFilters = () => {
    setFilters({ q: "", role: "", page: 1, limit: 20 });
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
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setCreateError("");
    setCreateSuccess("");
  };

  const onCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    const errors = validateAdminCreateAccountForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setCreateError(firstFormError(errors));
      return;
    }

    setFieldErrors({});
    setCreating(true);

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
      role: form.role,
    };

    if (form.role === "doctor") {
      Object.assign(payload, {
        specialtyId: form.specialtyId,
        departmentId: form.departmentId,
        licenseNo: form.licenseNo.trim(),
        bio: form.bio.trim(),
      });
    }

    try {
      const { data } = await AdminApiClient.createAccount(payload);
      setCreateSuccess(data.message);
      setForm(EMPTY_FORM);
      applyFilters({ page: 1 });
      setTimeout(() => closeCreateModal(), 900);
    } catch (err) {
      const message = getApiErrorMessage(err);
      setCreateError(message);
      if (err?.response?.status === 409) {
        const bodyMessage = message.toLowerCase();
        if (bodyMessage.includes("license")) {
          setFieldErrors({ licenseNo: message });
        } else {
          setFieldErrors({ email: message });
        }
      }
    } finally {
      setCreating(false);
    }
  };

  const fieldError = (name) => fieldErrors[name];

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Account list"
        description="View and manage user accounts, roles, and active status."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            Add account
          </button>
        }
      >
      <div className="card filters-card">
        <div className="filters-toolbar">
          <div className="filters-toolbar-fields">
            <FilterSearchField
              id="admin-account-list-search"
              placeholder="Search by name, email, or phone number…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              onSearch={() => applyFilters({ q: filters.q })}
            />
            <CustomSelect
              className="filter-field"
              label="Role"
              value={filters.role}
              onChange={(role) => applyFilters({ role })}
              options={FILTER_ROLE_OPTIONS}
            />
          </div>
          <div className="filters-toolbar-actions">
            <button type="button" className="btn btn-primary" onClick={() => applyFilters({ q: filters.q })}>
              Search
            </button>
            <button type="button" className="btn btn-outline" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading accounts…
        </div>
      )}

      {!loading && result.items.length === 0 && (
        <div className="empty-state card">
          <h3>No accounts found</h3>
          <p>Try adjusting your search criteria or clear filters.</p>
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
                  <th>Full name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone number</th>
                  <th>Status</th>
                  <th>Email verified</th>
                  <th>Last login</th>
                  <th>Created</th>
                  <th className="table-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((account) => (
                  <tr key={account._id}>
                    <td>
                      <Link to={`/admin/account/${account._id}`} className="table-link">
                        {account.fullName}
                      </Link>
                    </td>
                    <td>{account.email}</td>
                    <td>
                      <span className="role-badge">{formatRoleLabel(account.role)}</span>
                    </td>
                    <td>{account.phone || "—"}</td>
                    <td>
                      <div className="status-badge-group">
                        <StatusBadge active={account.isActive} label={account.isActive ? "Active" : "Inactive"} />
                        {account.isLocked && (
                          <span className="status-badge status-badge-locked">Locked</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <StatusBadge
                        active={account.isEmailVerified}
                        label={account.isEmailVerified ? "Verified" : "Not verified"}
                      />
                    </td>
                    <td>{formatDate(account.lastLoginAt)}</td>
                    <td>{formatDate(account.createdAt)}</td>
                    <td className="table-actions-col">
                      <div className="table-row-actions">
                      <Link
                        to={`/admin/account/${account._id}`}
                        className="btn btn-outline btn-icon"
                        aria-label={`Xem ${account.fullName}`}
                        title="View details"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </Link>
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
          itemLabel="accounts"
          onPageChange={(page) => applyFilters({ page })}
        />
      )}

      {showCreateModal && (
        <div className="modal-backdrop" onClick={closeCreateModal}>
          <div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-account-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="create-account-title">Add new account</h2>
                <p>Create a patient, doctor, or administrator account.</p>
              </div>
              <button type="button" className="modal-close" onClick={closeCreateModal} aria-label="Close">
                ×
              </button>
            </div>

            <form onSubmit={onCreateSubmit} className="form form-compact">
              {createError && <div className="alert alert-error">{createError}</div>}
              {createSuccess && <div className="alert alert-success">{createSuccess}</div>}

              <label>
                Full name
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={onFormChange}
                  placeholder="John Smith"
                  aria-invalid={Boolean(fieldError("fullName"))}
                />
                {fieldError("fullName") && <span className="field-error">{fieldError("fullName")}</span>}
              </label>

              <label>
                Email address
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onFormChange}
                  placeholder="user@example.com"
                  aria-invalid={Boolean(fieldError("email"))}
                />
                {fieldError("email") && <span className="field-error">{fieldError("email")}</span>}
              </label>

              <label>
                Phone number
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onFormChange}
                  placeholder="0901234567"
                  aria-invalid={Boolean(fieldError("phone"))}
                />
                {fieldError("phone") && <span className="field-error">{fieldError("phone")}</span>}
              </label>

              <div>
                <CustomSelect
                  label="Role"
                  value={form.role}
                  onChange={(role) => onFormChange({ target: { name: "role", value: role } })}
                  options={CREATE_ROLE_OPTIONS}
                  invalid={Boolean(fieldError("role"))}
                />
                {fieldError("role") && <span className="field-error">{fieldError("role")}</span>}
              </div>

              {form.role === "doctor" && (
                <>
                  <div>
                    <CustomSelect
                      label="Specialty"
                      value={form.specialtyId}
                      placeholder="Select specialty"
                      onChange={(specialtyId) => onFormChange({ target: { name: "specialtyId", value: specialtyId } })}
                      options={[
                        { value: "", label: "Select specialty" },
                        ...specialties.map((item) => ({ value: item._id, label: item.name })),
                      ]}
                      invalid={Boolean(fieldError("specialtyId"))}
                    />
                    {fieldError("specialtyId") && (
                      <span className="field-error">{fieldError("specialtyId")}</span>
                    )}
                  </div>

                  <div>
                    <CustomSelect
                      label="Department"
                      value={form.departmentId}
                      placeholder="Select department"
                      onChange={(departmentId) => onFormChange({ target: { name: "departmentId", value: departmentId } })}
                      options={[
                        { value: "", label: "Select department" },
                        ...departments.map((item) => ({ value: item._id, label: item.name })),
                      ]}
                      invalid={Boolean(fieldError("departmentId"))}
                    />
                    {fieldError("departmentId") && (
                      <span className="field-error">{fieldError("departmentId")}</span>
                    )}
                  </div>

                  <label>
                    License number
                    <input
                      name="licenseNo"
                      value={form.licenseNo}
                      onChange={onFormChange}
                      placeholder="DOC-001"
                      aria-invalid={Boolean(fieldError("licenseNo"))}
                    />
                    {fieldError("licenseNo") && (
                      <span className="field-error">{fieldError("licenseNo")}</span>
                    )}
                  </label>

                  <label>
                    Bio
                    <textarea
                      name="bio"
                      value={form.bio}
                      onChange={onFormChange}
                      rows={3}
                      placeholder="Short professional bio (optional)"
                    />
                  </label>
                </>
              )}

              <label>
                Password
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={onFormChange}
                  placeholder="At least 8 characters, letters and numbers"
                  aria-invalid={Boolean(fieldError("password"))}
                />
                {fieldError("password") && <span className="field-error">{fieldError("password")}</span>}
              </label>

              <label>
                Confirm password
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={onFormChange}
                  placeholder="Re-enter password"
                  aria-invalid={Boolean(fieldError("confirmPassword"))}
                />
                {fieldError("confirmPassword") && (
                  <span className="field-error">{fieldError("confirmPassword")}</span>
                )}
              </label>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={closeCreateModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Creating…" : "Create account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </AdminLayout>
    </PageLayout>
  );
}
