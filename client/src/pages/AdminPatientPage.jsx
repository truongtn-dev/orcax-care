import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import FilterSearchField from "../components/FilterSearchField.jsx";
import AppPagination from "../components/AppPagination.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { getApiErrorMessage } from "../services/api.js";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const GENDER_LABELS = {
  male: "Male",
  female: "Female",
  other: "Other",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatDateOnly(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function StatusBadge({ active, label }) {
  return (
    <span className={`status-badge ${active ? "status-badge-active" : "status-badge-inactive"}`}>
      {label}
    </span>
  );
}

export default function AdminPatientPage() {
  const [filters, setFilters] = useState({ q: "", isActive: "", page: 1, limit: 20 });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPatients = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listPatients(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], total: 0, totalPages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients(filters);
  }, [filters, loadPatients]);

  const applyFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  const clearFilters = () => {
    setFilters({ q: "", isActive: "", page: 1, limit: 20 });
  };

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Patient management"
        description="Look up patient profiles, demographics, and linked accounts."
      >
      <div className="card filters-card">
        <div className="filters-toolbar">
          <div className="filters-toolbar-fields">
            <FilterSearchField
              id="admin-patient-search"
              placeholder="Search by name, email, or phone number…"
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
        <div className="card data-table-card">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Gender</th>
                  <th>Date of birth</th>
                  <th>Phone number</th>
                  <th>Registered</th>
                  <th>Linked account</th>
                  <th>Status</th>
                  <th className="table-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((patient) => (
                  <tr key={patient._id}>
                    <td>
                      <Link to={`/admin/patient/${patient._id}`} className="table-link">
                        {patient.fullName}
                      </Link>
                      <div className="table-subtext">{patient.email}</div>
                    </td>
                    <td>{GENDER_LABELS[patient.demographics?.gender] || patient.demographics?.gender || "—"}</td>
                    <td>{formatDateOnly(patient.demographics?.dateOfBirth)}</td>
                    <td>{patient.phone || "—"}</td>
                    <td>{formatDate(patient.createdAt)}</td>
                    <td>
                      <Link to={`/admin/account/${patient._id}`} className="table-link">
                        Open account
                      </Link>
                    </td>
                    <td>
                      <div className="status-badge-group">
                        <StatusBadge active={patient.isActive} label={patient.isActive ? "Active" : "Inactive"} />
                        {patient.isLocked && <span className="status-badge status-badge-locked">Locked</span>}
                      </div>
                    </td>
                    <td className="table-actions-col">
                      <div className="table-row-actions">
                        <Link to={`/admin/patient/${patient._id}`} className="btn btn-outline btn-sm">
                          Details
                        </Link>
                        <Link to={`/admin/patient/${patient._id}/edit`} className="btn btn-primary btn-sm">
                          Edit
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
          itemLabel="patients"
          onPageChange={(page) => applyFilters({ page })}
        />
      )}
      </AdminLayout>
    </PageLayout>
  );
}
