import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./DoctorsListPage.css";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import FilterSearchField from "../../components/FilterSearchField.jsx";
import AppPagination from "../../components/AppPagination.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";
import {
  ACTION_ICONS,
  PersonCell,
  PersonStatus,
  formatDateOnly,
} from "../../utils/peopleListUi.jsx";

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

export default function DoctorsListPage() {
  const [searchParams] = useSearchParams();
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

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Doctor list"
        description="Manage doctor profiles, specialties, and linked accounts."
        actions={
          <Link to="/admin/account?create=doctor" className="btn btn-primary btn-sm">
            Create doctor
          </Link>
        }
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
                      const accountTo = doctor.userId ? `/admin/account/${doctor.userId}` : null;

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
                                to={`/admin/doctors/${doctor._id}`}
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
                                to={`/admin/doctors/${doctor._id}/edit`}
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
