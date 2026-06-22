import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./StaffListPage.css";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import FilterSearchField from "../../components/FilterSearchField.jsx";
import AppPagination from "../../components/AppPagination.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import AppModal from "../../components/AppModal.jsx";
import StaffAccountForm from "../../components/admin/forms/StaffAccountForm.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";
import { firstFormError, validateAdminCreateAccountForm } from "../../utils/validation.js";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  ACTION_ICONS,
  PersonCell,
  PersonStatus,
  formatDateOnly,
  formatDateShort,
} from "../../utils/peopleListUi.jsx";
import { getStaffDetailPath, getStaffEditPath } from "../../utils/adminUrls.js";
import { isMongoObjectId } from "../../utils/doctorUrls.js";

const EMPTY_EDIT_FORM = {
  fullName: "",
  email: "",
  phone: "",
  isActive: true,
};

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const EMPTY_FORM = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: "staff",
};

export default function StaffListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({ q: "", isActive: "", page: 1, limit: PAGE_SIZE });
  const [result, setResult] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const { email: currentAdminEmail } = useAuth();
  const [statusConfirm, setStatusConfirm] = useState({ open: false, account: null, action: null });
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadStaff = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listAccounts({
        q: params.q,
        isActive: params.isActive,
        role: "staff",
        page: params.page,
        limit: params.limit,
      });
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], total: 0, page: 1, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff(filters);
  }, [filters, loadStaff]);

  const applyFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  const clearFilters = () => {
    setFilters({ q: "", isActive: "", page: 1, limit: PAGE_SIZE });
  };

  const closeEditModal = useCallback(() => {
    setEditId("");
    setEditForm(EMPTY_EDIT_FORM);
    setEditError("");
    setEditSuccess("");
    setEditLoading(false);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const loadStaffForEdit = useCallback(async (accountKey) => {
    setEditLoading(true);
    setEditError("");
    try {
      const { data } = await AdminApiClient.getAccount(accountKey);
      const slug = data.slug || data._id;
      setEditId(slug);
      setEditForm({
        fullName: data.fullName || "",
        email: data.email || "",
        phone: data.phone || "",
        isActive: Boolean(data.isActive),
      });
      if (data.slug && isMongoObjectId(accountKey) && data.slug !== accountKey) {
        setSearchParams({ edit: data.slug }, { replace: true });
      }
    } catch (err) {
      setEditError(getApiErrorMessage(err));
      setEditId("");
    } finally {
      setEditLoading(false);
    }
  }, [setSearchParams]);

  useEffect(() => {
    const editKey = searchParams.get("edit");
    if (!editKey) return;
    setEditSuccess("");
    loadStaffForEdit(editKey);
  }, [searchParams, loadStaffForEdit]);

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

    setCreating(true);
    try {
      const { data } = await AdminApiClient.createAccount({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: "staff",
      });
      setCreateSuccess(data.message || "Staff account created.");
      setForm(EMPTY_FORM);
      applyFilters({ page: 1 });
      setTimeout(() => closeCreateModal(), 900);
    } catch (err) {
      const message = getApiErrorMessage(err);
      setCreateError(message);
      if (err?.response?.status === 409) {
        setFieldErrors({ email: message });
      }
    } finally {
      setCreating(false);
    }
  };

  const fieldError = (name) => fieldErrors[name];

  const onEditFormChange = (e) => {
    const { name, type, checked, value } = e.target;
    setEditForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setEditError("");
    setEditSuccess("");
  };

  const onEditSubmit = async (e) => {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    setEditError("");
    setEditSuccess("");
    try {
      await AdminApiClient.updateAccount(editId, editForm);
      setEditSuccess("Staff account updated successfully.");
      await loadStaff(filters);
    } catch (err) {
      setEditError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const requestStatusChange = (account) => {
    setStatusMessage({ type: "", text: "" });
    const action = account.isActive ? "deactivate" : "reactivate";
    if (action === "deactivate" && account.email === currentAdminEmail) {
      setStatusMessage({ type: "error", text: "You cannot deactivate your own account." });
      return;
    }
    setStatusConfirm({ open: true, account, action });
  };

  const confirmStatusChange = async () => {
    const { account, action } = statusConfirm;
    if (!account) return;
    setStatusLoading(true);
    setStatusMessage({ type: "", text: "" });
    try {
      if (action === "deactivate") {
        await AdminApiClient.deactivateUser(account.slug || account._id);
        setStatusMessage({ type: "success", text: "Staff account deactivated." });
      } else {
        await AdminApiClient.reactivateUser(account.slug || account._id);
        setStatusMessage({ type: "success", text: "Staff account reactivated." });
      }
      await loadStaff(filters);
      setStatusConfirm({ open: false, account: null, action: null });
    } catch (err) {
      setStatusMessage({ type: "error", text: getApiErrorMessage(err) });
    } finally {
      setStatusLoading(false);
    }
  };

  const editKey = searchParams.get("edit");

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Staff list"
        description="Manage support and reception staff accounts."
      >
        <div className="people-list-page">
          <div className="card filters-card people-list-toolbar">
            <div className="filters-toolbar">
              <div className="filters-toolbar-fields">
                <FilterSearchField
                  id="admin-staff-search"
                  placeholder="Search by name, email, or phone…"
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
                  Clear
                </button>
                <button type="button" className="btn btn-primary" onClick={openCreateModal}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                  Add staff
                </button>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {statusMessage.text && (
            <div className={`alert alert-${statusMessage.type === "success" ? "success" : "error"}`}>
              {statusMessage.text}
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="loading-spinner" />
              Loading staff…
            </div>
          )}

          {!loading && result.items.length === 0 && (
            <div className="empty-state card">
              <h3>No staff found</h3>
              <p>Try adjusting your search criteria or add a new staff account.</p>
              <button type="button" className="btn btn-outline" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          )}

          {!loading && result.items.length > 0 && (
            <div className="card people-list-table-card">
              <div className="people-list-table-head">
                <h2>All staff</h2>
                <span className="people-list-table-count">{result.total} total</span>
              </div>
              <div className="people-list-table-wrap">
                <table className="people-list-table">
                  <thead>
                    <tr>
                      <th>Staff</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Last activity</th>
                      <th className="table-actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((staff) => (
                      <tr key={staff._id}>
                        <td>
                          <PersonCell
                            name={staff.fullName}
                            email={staff.email}
                            to={getStaffDetailPath(staff)}
                          />
                        </td>
                        <td>
                          {staff.phone ? (
                            <span className="people-list-phone">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                              {staff.phone}
                            </span>
                          ) : (
                            <span className="people-list-phone is-empty">—</span>
                          )}
                        </td>
                        <td>
                          <PersonStatus
                            active={staff.isActive}
                            verified={staff.isEmailVerified}
                            locked={staff.isLocked}
                          />
                        </td>
                        <td>
                          <div className="people-list-activity">
                            <span className="people-list-activity-primary">
                              {formatDateShort(staff.lastLoginAt)}
                            </span>
                            <span className="people-list-activity-sub">
                              Joined {formatDateOnly(staff.createdAt)}
                            </span>
                          </div>
                        </td>
                        <td className="table-actions-col">
                          <div className="people-list-actions">
                            <Link
                              to={getStaffDetailPath(staff)}
                              className="people-list-action people-list-action--view"
                              title="View account details"
                            >
                              {ACTION_ICONS.view}
                              Details
                            </Link>
                            <Link
                              to={getStaffEditPath(staff)}
                              className="people-list-action people-list-action--edit"
                              title="Edit account"
                            >
                              {ACTION_ICONS.edit}
                              Edit
                            </Link>
                            <button
                              type="button"
                              className={`people-list-action ${staff.isActive ? "people-list-action--deactivate" : "people-list-action--activate"}`}
                              title={staff.isActive ? "Deactivate account" : "Reactivate account"}
                              disabled={staff.isActive && staff.email === currentAdminEmail}
                              onClick={() => requestStatusChange(staff)}
                            >
                              {staff.isActive ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                              {staff.isActive ? "Deactivate" : "Activate"}
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
              itemLabel="staff"
              onPageChange={(page) => applyFilters({ page })}
            />
          )}
        </div>

        <ConfirmDialog
          open={statusConfirm.open}
          title={statusConfirm.action === "deactivate" ? "Deactivate staff account" : "Reactivate staff account"}
          description={
            statusConfirm.account
              ? statusConfirm.action === "deactivate"
                ? `Deactivate ${statusConfirm.account.fullName}? The user will be signed out and all active sessions will end.`
                : `Reactivate ${statusConfirm.account.fullName}? The user will be able to sign in again.`
              : ""
          }
          confirmText={statusConfirm.action === "deactivate" ? "Deactivate" : "Reactivate"}
          variant={statusConfirm.action === "deactivate" ? "danger" : "default"}
          loading={statusLoading}
          onConfirm={confirmStatusChange}
          onCancel={() => setStatusConfirm({ open: false, account: null, action: null })}
        />

        {showCreateModal && (
          <AppModal
            title="Add staff account"
            description="Create a support or reception staff login."
            titleId="create-staff-title"
            onClose={closeCreateModal}
          >
            <StaffAccountForm
              mode="create"
              form={form}
              onChange={onFormChange}
              onSubmit={onCreateSubmit}
              onCancel={closeCreateModal}
              error={createError}
              success={createSuccess}
              submitting={creating}
              fieldError={fieldError}
            />
          </AppModal>
        )}

        {editKey && (
          <AppModal
            title="Update staff account"
            description="Edit staff contact details and access status."
            titleId="edit-staff-title"
            onClose={closeEditModal}
          >
            {editLoading || !editId ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                Loading staff account…
              </div>
            ) : (
              <StaffAccountForm
                mode="edit"
                form={editForm}
                onChange={onEditFormChange}
                onSubmit={onEditSubmit}
                onCancel={closeEditModal}
                error={editError}
                success={editSuccess}
                submitting={saving}
              />
            )}
          </AppModal>
        )}
      </AdminLayout>
    </PageLayout>
  );
}
