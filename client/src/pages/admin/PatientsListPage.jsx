import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./PatientsListPage.css";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import DatePicker from "../../components/DatePicker.jsx";
import FilterSearchField from "../../components/FilterSearchField.jsx";
import AppPagination from "../../components/AppPagination.jsx";
import AppModal from "../../components/AppModal.jsx";
import PatientRecordForm from "../../components/admin/forms/PatientRecordForm.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import {
  ACTION_ICONS,
  PersonCell,
  PersonStatus,
  formatDateOnly,
} from "../../utils/peopleListUi.jsx";
import {
  getAdminAccountPath,
  getAdminPatientEditPath,
  getAdminPatientPath,
} from "../../utils/adminUrls.js";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "true", label: "Active only" },
];

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const EMPTY_PATIENT_FORM = {
  email: "",
  password: "",
  fullName: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

const EMPTY_PATIENT_EDIT_FORM = {
  fullName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  avatarUrl: "",
  isActive: true,
  accountIsActive: true,
};

const GENDER_LABELS = {
  male: "Male",
  female: "Female",
  other: "Other",
};

export default function PatientsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({ q: "", activeOnly: "", page: 1, limit: PAGE_SIZE });
  const debouncedQ = useDebouncedValue(filters.q, 400);
  const [result, setResult] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_PATIENT_FORM);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState(EMPTY_PATIENT_EDIT_FORM);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPatients = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.getPatients({
        q: params.q,
        page: params.page,
        limit: params.limit,
        activeOnly: params.activeOnly === "true",
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
    loadPatients({ ...filters, q: debouncedQ });
  }, [debouncedQ, filters.activeOnly, filters.page, filters.limit, loadPatients]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateForm(EMPTY_PATIENT_FORM);
      setCreateError("");
      setShowCreateModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const closeEditModal = useCallback(() => {
    setEditId("");
    setEditForm(EMPTY_PATIENT_EDIT_FORM);
    setEditError("");
    setEditSuccess("");
    setEditLoading(false);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("edit");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const loadPatientForEdit = useCallback(async (patientKey) => {
    setEditLoading(true);
    setEditError("");
    try {
      const { data } = await AdminApiClient.getPatient(patientKey);
      setEditId(data.slug || data._id);
      setEditForm({
        fullName: data.fullName || "",
        phone: data.phone || "",
        email: data.email || "",
        dateOfBirth: data.profile?.dateOfBirth || "",
        gender: data.profile?.gender || "",
        address: data.profile?.address || "",
        emergencyContactName: data.profile?.emergencyContactName || "",
        emergencyContactPhone: data.profile?.emergencyContactPhone || "",
        avatarUrl: data.profile?.avatarUrl || "",
        isActive: Boolean(data.isActive),
        accountIsActive: Boolean(data.accountIsActive ?? data.isActive),
      });
    } catch (err) {
      setEditError(getApiErrorMessage(err));
      setEditId("");
    } finally {
      setEditLoading(false);
    }
  }, []);

  useEffect(() => {
    const editKey = searchParams.get("edit");
    if (!editKey) return;
    setEditSuccess("");
    loadPatientForEdit(editKey);
  }, [searchParams, loadPatientForEdit]);

  const openCreateModal = () => {
    setCreateForm(EMPTY_PATIENT_FORM);
    setCreateError("");
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateError("");
  };

  const onCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((current) => ({ ...current, [name]: value }));
    setCreateError("");
  };

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
      await AdminApiClient.updatePatient(editId, editForm);
      setEditSuccess("Patient profile updated successfully.");
      await loadPatients({ ...filters, q: debouncedQ });
    } catch (err) {
      setEditError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onCreateSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const { data } = await AdminApiClient.createPatient(createForm);
      closeCreateModal();
      await loadPatients({ ...filters, q: debouncedQ });
      navigate(getAdminPatientPath(data), {
        state: { message: data.message || "Patient created successfully." },
      });
    } catch (err) {
      setCreateError(getApiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const applyFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  const clearFilters = () => {
    setFilters({ q: "", activeOnly: "", page: 1, limit: PAGE_SIZE });
  };

  const editKey = searchParams.get("edit");

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Patient list"
        description="Look up patient profiles, demographics, and linked accounts."
      >
        <div className="people-list-page">
          <div className="card filters-card people-list-toolbar">
            <div className="filters-toolbar">
              <div className="filters-toolbar-fields">
                <FilterSearchField
                  id="admin-patients-search"
                  placeholder="Search by name, email, phone, or address…"
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                  onSearch={() => applyFilters({ q: filters.q })}
                />
                <CustomSelect
                  className="filter-field"
                  label="Status"
                  value={filters.activeOnly}
                  onChange={(activeOnly) => applyFilters({ activeOnly })}
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
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    <line x1="19" y1="11" x2="19" y2="17" />
                    <line x1="16" y1="14" x2="22" y2="14" />
                  </svg>
                  Add patient
                </button>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading && (
            <div className="loading-state">
              <div className="loading-spinner" />
              Loading patients…
            </div>
          )}

          {!loading && result.items.length === 0 && (
            <div className="empty-state card">
              <h3>No patients found</h3>
              <p>Try adjusting your search criteria or clear filters.</p>
              <button type="button" className="btn btn-outline" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          )}

          {!loading && result.items.length > 0 && (
            <div className="card people-list-table-card">
              <div className="people-list-table-head">
                <h2>All patients</h2>
                <span className="people-list-table-count">{result.total} total</span>
              </div>
              <div className="people-list-table-wrap">
                <table className="people-list-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Phone</th>
                      <th>Gender</th>
                      <th>Date of birth</th>
                      <th>Status</th>
                      <th>Registered</th>
                      <th className="table-actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((patient) => {
                      const isActive = patient.isActive && patient.accountIsActive;
                      const detailTo = getAdminPatientPath(patient);

                      return (
                        <tr key={patient._id}>
                          <td>
                            <PersonCell
                              name={patient.fullName}
                              email={patient.email}
                              to={detailTo}
                            />
                          </td>
                          <td>
                            {patient.phone ? (
                              <span className="people-list-phone">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                {patient.phone}
                              </span>
                            ) : (
                              <span className="people-list-phone is-empty">—</span>
                            )}
                          </td>
                          <td>
                            <span className="people-list-cell-text">
                              {GENDER_LABELS[patient.profile?.gender] || patient.profile?.gender || "—"}
                            </span>
                          </td>
                          <td>
                            <span className="people-list-cell-text">
                              {formatDateOnly(patient.profile?.dateOfBirth)}
                            </span>
                          </td>
                          <td>
                            <PersonStatus active={isActive} verified={patient.isEmailVerified} />
                          </td>
                          <td>
                            <div className="people-list-activity">
                              <span className="people-list-activity-primary">
                                {formatDateOnly(patient.createdAt)}
                              </span>
                            </div>
                          </td>
                          <td className="table-actions-col">
                            <div className="people-list-actions">
                              {detailTo && (
                                <Link
                                  to={detailTo}
                                  className="people-list-action people-list-action--view"
                                  title="View patient details"
                                >
                                  {ACTION_ICONS.view}
                                  Details
                                </Link>
                              )}
                              <Link
                                to={getAdminPatientEditPath(patient)}
                                className="people-list-action people-list-action--edit"
                                title="Edit patient profile"
                              >
                                {ACTION_ICONS.edit}
                                Edit
                              </Link>
                              {patient.userId && (
                                <Link
                                  to={getAdminAccountPath(patient)}
                                  className="people-list-action people-list-action--account"
                                  title="Open linked account"
                                >
                                  {ACTION_ICONS.account}
                                  Account
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
              itemLabel="patients"
              onPageChange={(page) => applyFilters({ page })}
            />
          )}
        </div>

        {showCreateModal && (
          <AppModal
            wide
            title="Add patient account"
            description="Register a new patient login with demographic details."
            titleId="create-patient-title"
            onClose={closeCreateModal}
          >
            <PatientRecordForm
              mode="create"
              form={createForm}
              onChange={onCreateFormChange}
              onSubmit={onCreateSubmit}
              onCancel={closeCreateModal}
              error={createError}
              submitting={creating}
            />
          </AppModal>
        )}

        {editKey && (
          <AppModal
            wide
            title="Update patient profile"
            description="Edit patient demographics and account access."
            titleId="edit-patient-title"
            onClose={closeEditModal}
          >
            {editLoading || !editId ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                Loading patient…
              </div>
            ) : (
              <PatientRecordForm
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
