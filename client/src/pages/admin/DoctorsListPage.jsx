import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./DoctorsListPage.css";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import FilterSearchField from "../../components/FilterSearchField.jsx";
import AppPagination from "../../components/AppPagination.jsx";
import AppModal from "../../components/AppModal.jsx";
import DoctorRecordForm from "../../components/admin/forms/DoctorRecordForm.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";
import { firstFormError, validateAdminCreateAccountForm } from "../../utils/validation.js";
import {
  ACTION_ICONS,
  PersonCell,
  PersonStatus,
  formatDateOnly,
} from "../../utils/peopleListUi.jsx";
import {
  getAdminAccountPath,
  getAdminDoctorEditPath,
  getAdminDoctorPath,
} from "../../utils/adminUrls.js";
import { DEFAULT_CONSULTATION_FEE_VND } from "../../utils/booking.js";

const PAGE_SIZE = 10;

function downloadBlobResponse(response, fallbackName) {
  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="([^"]+)"/i);
  const filename = match?.[1] || fallbackName;
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read the selected file"));
    reader.readAsDataURL(file);
  });
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const EMPTY_DOCTOR_FORM = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: "doctor",
  specialtyId: "",
  departmentId: "",
  licenseNo: "",
  consultationFee: String(DEFAULT_CONSULTATION_FEE_VND),
  bio: "",
};

const EMPTY_DOCTOR_EDIT_FORM = {
  email: "",
  fullName: "",
  phone: "",
  specialtyId: "",
  departmentId: "",
  licenseNo: "",
  consultationFee: String(DEFAULT_CONSULTATION_FEE_VND),
  bio: "",
  photoUrl: "",
  isActive: true,
  accountIsActive: true,
};

export default function DoctorsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    q: searchParams.get("q") || "",
    specialtyId: searchParams.get("specialtyId") || "",
    departmentId: searchParams.get("departmentId") || "",
    isActive: searchParams.get("isActive") || "",
    page: 1,
    limit: PAGE_SIZE,
  });
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [result, setResult] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_DOCTOR_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState(EMPTY_DOCTOR_EDIT_FORM);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fieldError = (name) => fieldErrors[name];

  const loadMasters = useCallback(async () => {
    const [specialtyRes, departmentRes] = await Promise.all([
      AdminApiClient.getSpecialties({ activeOnly: false }),
      AdminApiClient.getDepartments({ activeOnly: false }),
    ]);
    setSpecialties(specialtyRes.data.items || []);
    setDepartments(departmentRes.data.items || []);
  }, []);

  const loadDoctors = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.getDoctors(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], total: 0, page: 1, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  useEffect(() => {
    loadDoctors(filters);
  }, [filters, loadDoctors]);

  useEffect(() => {
    if (searchParams.get("create") === "doctor") {
      setCreateForm(EMPTY_DOCTOR_FORM);
      setFieldErrors({});
      setCreateError("");
      setCreateSuccess("");
      setShowCreateModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const closeEditModal = useCallback(() => {
    setEditId("");
    setEditForm(EMPTY_DOCTOR_EDIT_FORM);
    setEditError("");
    setEditSuccess("");
    setEditLoading(false);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("edit");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const loadDoctorForEdit = useCallback(async (doctorKey) => {
    setEditLoading(true);
    setEditError("");
    try {
      const { data } = await AdminApiClient.getDoctor(doctorKey);
      setEditId(data.slug || data._id);
      setEditForm({
        email: data.email || "",
        fullName: data.fullName || "",
        phone: data.phone || "",
        specialtyId: data.specialtyId || "",
        departmentId: data.departmentId || "",
        licenseNo: data.licenseNo || "",
        consultationFee: String(data.consultationFee ?? DEFAULT_CONSULTATION_FEE_VND),
        bio: data.bio || "",
        photoUrl: data.photoUrl || "",
        isActive: Boolean(data.isActive),
        accountIsActive: Boolean(data.accountIsActive),
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
    loadDoctorForEdit(editKey);
  }, [searchParams, loadDoctorForEdit]);

  const openCreateModal = () => {
    setCreateForm(EMPTY_DOCTOR_FORM);
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

  const onCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setCreateError("");
    setCreateSuccess("");
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
      await AdminApiClient.updateDoctor(editId, {
        ...editForm,
        consultationFee: Number(editForm.consultationFee),
      });
      setEditSuccess("Doctor updated successfully.");
      await loadDoctors(filters);
    } catch (err) {
      setEditError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    const errors = validateAdminCreateAccountForm(createForm);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setCreateError(firstFormError(errors));
      return;
    }

    setCreating(true);
    try {
      const { data } = await AdminApiClient.createAccount({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim(),
        password: createForm.password,
        role: "doctor",
        specialtyId: createForm.specialtyId,
        departmentId: createForm.departmentId,
        licenseNo: createForm.licenseNo.trim(),
        consultationFee: Number(createForm.consultationFee),
        bio: createForm.bio.trim(),
      });
      setCreateSuccess(data.message || "Doctor account created.");
      setCreateForm(EMPTY_DOCTOR_FORM);
      await loadDoctors(filters);
      setTimeout(() => closeCreateModal(), 900);
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
    setFilters({
      q: "",
      specialtyId: "",
      departmentId: "",
      isActive: "",
      page: 1,
      limit: PAGE_SIZE,
    });
  };

  const handleExport = async () => {
    setExportBusy(true);
    setError("");
    try {
      const { q, specialtyId, departmentId, isActive } = filters;
      const response = await AdminApiClient.exportDoctors({ q, specialtyId, departmentId, isActive });
      downloadBlobResponse(response, "doctors-export.xlsx");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setExportBusy(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setExportBusy(true);
    setError("");
    try {
      const response = await AdminApiClient.downloadDoctorImportTemplate();
      downloadBlobResponse(response, "doctor-import-template.xlsx");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setExportBusy(false);
    }
  };

  const openImportModal = () => {
    setImportResult(null);
    setImportFileName("");
    setShowImportModal(true);
  };

  const closeImportModal = () => {
    if (importBusy) return;
    setShowImportModal(false);
    setImportResult(null);
    setImportFileName("");
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Please upload an .xlsx file using the doctor import template.");
      return;
    }

    setImportBusy(true);
    setError("");
    setImportResult(null);
    setImportFileName(file.name);

    try {
      const fileBase64 = await readFileAsBase64(file);
      const { data } = await AdminApiClient.importDoctors({ fileBase64, fileName: file.name });
      setImportResult(data);
      if (data.imported > 0) {
        await loadDoctors(filters);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setImportBusy(false);
      event.target.value = "";
    }
  };

  const editKey = searchParams.get("edit");

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Doctor list"
        description="Manage doctor profiles, specialties, and linked accounts."
      >
        <div className="people-list-page">
          <div className="card filters-card people-list-toolbar">
            <div className="filters-toolbar">
              <div className="filters-toolbar-fields">
                <FilterSearchField
                  id="doctors-list-search"
                  placeholder="Search by name, email, or license…"
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                  onSearch={() => applyFilters({ q: filters.q })}
                />
                <CustomSelect
                  className="filter-field"
                  label="Specialty"
                  value={filters.specialtyId}
                  onChange={(specialtyId) => applyFilters({ specialtyId })}
                  options={[
                    { value: "", label: "All specialties" },
                    ...specialties.map((specialty) => ({ value: specialty._id, label: specialty.name })),
                  ]}
                />
                <CustomSelect
                  className="filter-field"
                  label="Department"
                  value={filters.departmentId}
                  onChange={(departmentId) => applyFilters({ departmentId })}
                  options={[
                    { value: "", label: "All departments" },
                    ...departments.map((department) => ({ value: department._id, label: department.name })),
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
                <button type="button" className="btn btn-outline" onClick={handleDownloadTemplate} disabled={exportBusy}>
                  Template
                </button>
                <button type="button" className="btn btn-outline" onClick={openImportModal} disabled={importBusy}>
                  Import Excel
                </button>
                <button type="button" className="btn btn-outline" onClick={handleExport} disabled={exportBusy}>
                  {exportBusy ? "Exporting…" : "Export Excel"}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => applyFilters({ q: filters.q })}>
                  Search
                </button>
                <button type="button" className="btn btn-outline" onClick={clearFilters}>
                  Clear
                </button>
                <button type="button" className="btn btn-primary" onClick={openCreateModal}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M11 2v2M5 2v2" />
                    <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
                    <path d="M8 15a6 6 0 0 0 12 0v-2" />
                    <line x1="19" y1="11" x2="19" y2="17" />
                    <line x1="16" y1="14" x2="22" y2="14" />
                  </svg>
                  Add doctor
                </button>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading && (
            <div className="loading-state">
              <div className="loading-spinner" />
              Loading doctors…
            </div>
          )}

          {!loading && result.items.length === 0 && (
            <div className="empty-state card">
              <h3>No doctors found</h3>
              <p>Try adjusting your search criteria or clear filters.</p>
              <button type="button" className="btn btn-outline" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          )}

          {!loading && result.items.length > 0 && (
            <div className="card people-list-table-card">
              <div className="people-list-table-head">
                <h2>All doctors</h2>
                <span className="people-list-table-count">{result.total} total</span>
              </div>
              <div className="people-list-table-wrap">
                <table className="people-list-table">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Specialty</th>
                      <th>Department</th>
                      <th>License</th>
                      <th>Status</th>
                      <th>Registered</th>
                      <th className="table-actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((doctor) => {
                      const isActive = doctor.isActive && doctor.accountIsActive;
                      const accountTo = doctor.userId ? getAdminAccountPath(doctor.userSlug || doctor.userId) : null;

                      return (
                        <tr key={doctor._id}>
                          <td>
                            <PersonCell
                              name={doctor.fullName}
                              email={doctor.email}
                              to={accountTo}
                            />
                          </td>
                          <td>
                            <span className={`people-list-cell-text${doctor.specialtyName ? "" : " is-muted"}`}>
                              {doctor.specialtyName || "—"}
                            </span>
                          </td>
                          <td>
                            <span className={`people-list-cell-text${doctor.departmentName ? "" : " is-muted"}`}>
                              {doctor.departmentName || "—"}
                            </span>
                          </td>
                          <td>
                            <span className="people-list-cell-text">{doctor.licenseNo || "—"}</span>
                          </td>
                          <td>
                            <PersonStatus active={isActive} />
                          </td>
                          <td>
                            <div className="people-list-activity">
                              <span className="people-list-activity-primary">
                                {formatDateOnly(doctor.createdAt)}
                              </span>
                            </div>
                          </td>
                          <td className="table-actions-col">
                            <div className="people-list-actions">
                              <Link
                                to={getAdminDoctorPath(doctor)}
                                className="people-list-action people-list-action--view"
                                title="View doctor details"
                              >
                                {ACTION_ICONS.view}
                                Profile
                              </Link>
                              {accountTo && (
                                <Link
                                  to={accountTo}
                                  className="people-list-action people-list-action--view"
                                  title="View account details"
                                >
                                  {ACTION_ICONS.view}
                                  Account
                                </Link>
                              )}
                              <Link
                                to={getAdminDoctorEditPath(doctor)}
                                className="people-list-action people-list-action--edit"
                                title="Edit professional profile"
                              >
                                {ACTION_ICONS.edit}
                                Edit
                              </Link>
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
              itemLabel="doctors"
              onPageChange={(page) => applyFilters({ page })}
            />
          )}
        </div>

        {showCreateModal && (
          <AppModal
            wide
            title="Add doctor account"
            description="Create a doctor login and professional profile."
            titleId="create-doctor-title"
            onClose={closeCreateModal}
          >
            <DoctorRecordForm
              mode="create"
              form={createForm}
              specialties={specialties}
              departments={departments}
              onChange={onCreateFormChange}
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
            wide
            title="Update doctor profile"
            description="Edit professional details and account access."
            titleId="edit-doctor-title"
            onClose={closeEditModal}
          >
            {editLoading || !editId ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                Loading doctor…
              </div>
            ) : (
              <DoctorRecordForm
                mode="edit"
                form={editForm}
                specialties={specialties}
                departments={departments}
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

        {showImportModal && (
          <div className="doctors-import-modal-backdrop" role="presentation" onClick={closeImportModal}>
            <div
              className="card doctors-import-modal"
              role="dialog"
              aria-labelledby="doctors-import-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="doctors-import-modal-head">
                <h2 id="doctors-import-title">Import doctors from Excel</h2>
                <button type="button" className="doctors-import-close" onClick={closeImportModal} aria-label="Close">
                  ×
                </button>
              </div>
              <p className="doctors-import-lead">
                Use the official template (.xlsx). Valid rows are created immediately; invalid rows are listed below.
              </p>
              <div className="doctors-import-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={handleDownloadTemplate} disabled={exportBusy}>
                  Download template
                </button>
                <label className="btn btn-primary btn-sm doctors-import-upload">
                  {importBusy ? "Importing…" : "Choose .xlsx file"}
                  <input
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleImportFile}
                    disabled={importBusy}
                  />
                </label>
              </div>
              {importFileName && <p className="doctors-import-file">Selected: {importFileName}</p>}
              {importResult && (
                <div className="doctors-import-result">
                  <p>
                    Imported <strong>{importResult.imported}</strong> doctor(s).
                    {importResult.failedCount > 0 ? ` ${importResult.failedCount} row(s) failed.` : ""}
                  </p>
                  {importResult.failed?.length > 0 && (
                    <ul className="doctors-import-errors">
                      {importResult.failed.map((row) => (
                        <li key={`${row.row}-${row.email}`}>
                          Row {row.row}: {row.message}
                          {row.email ? ` (${row.email})` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  {importResult.succeeded?.some((row) => row.generatedPassword) && (
                    <p className="doctors-import-note">
                      Temporary passwords were generated for imported accounts without a password column.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminLayout>
    </PageLayout>
  );
}
