import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
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
    <PageLayout>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <Link to="/admin" className="back-link">
              ← Admin Console
            </Link>
            <h1>Patients</h1>
            <p>View patient list with demographics, registration date, and linked account.</p>
          </div>
        </div>
      </div>

      <div className="card filters-card">
        <div className="filters-row">
          <input
            type="search"
            placeholder="Search by name, email, or phone…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && applyFilters({ q: filters.q })}
          />
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
          Loading patients…
        </div>
      )}

      {!loading && result.items.length === 0 && (
        <div className="empty-state card">
          <h3>No patients found</h3>
          <p>Try adjusting your search criteria or clearing filters.</p>
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
                  <th>Patient</th>
                  <th>Gender</th>
                  <th>Date of birth</th>
                  <th>Phone</th>
                  <th>Registration date</th>
                  <th>Linked account</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                        Open Account
                      </Link>
                    </td>
                    <td>
                      <div className="status-badge-group">
                        <StatusBadge active={patient.isActive} label={patient.isActive ? "Active" : "Inactive"} />
                        {patient.isLocked && <span className="status-badge status-badge-locked">Locked</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <Link to={`/admin/patient/${patient._id}`} className="btn btn-outline btn-sm">
                          Detail
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
            Page {result.page} of {result.totalPages} · {result.total} patients
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
    </PageLayout>
  );
}
