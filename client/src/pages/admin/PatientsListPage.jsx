import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./PatientsListPage.css";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import FilterSearchField from "../../components/FilterSearchField.jsx";
import AppPagination from "../../components/AppPagination.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import {
  ACTION_ICONS,
  PersonCell,
  PersonStatus,
  formatDateOnly,
} from "../../utils/peopleListUi.jsx";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "true", label: "Active only" },
];

const GENDER_LABELS = {
  male: "Male",
  female: "Female",
  other: "Other",
};

export default function PatientsListPage() {
  const [filters, setFilters] = useState({ q: "", activeOnly: "", page: 1, limit: PAGE_SIZE });
  const debouncedQ = useDebouncedValue(filters.q, 400);
  const [result, setResult] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const applyFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  const clearFilters = () => {
    setFilters({ q: "", activeOnly: "", page: 1, limit: PAGE_SIZE });
  };

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Patient list"
        description="Look up patient profiles, demographics, and linked accounts."
        actions={
          <Link to="/admin/patients/new" className="btn btn-primary btn-sm">
            Create patient
          </Link>
        }
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
                      const detailTo = `/admin/patients/${patient._id}`;

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
                                to={`/admin/patients/${patient._id}/edit`}
                                className="people-list-action people-list-action--edit"
                                title="Edit patient profile"
                              >
                                {ACTION_ICONS.edit}
                                Edit
                              </Link>
                              {patient.userId && (
                                <Link
                                  to={`/admin/account/${patient.userId}`}
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
      </AdminLayout>
    </PageLayout>
  );
}
