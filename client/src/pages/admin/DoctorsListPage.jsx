import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

export default function DoctorsListPage() {
  const [filters, setFilters] = useState({
    q: "",
    specialtyId: "",
    departmentId: "",
    isActive: "",
    page: 1,
    limit: PAGE_SIZE,
  });
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [result, setResult] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
                              {accountTo && (
                                <Link
                                  to={accountTo}
                                  className="people-list-action people-list-action--view"
                                  title="View account details"
                                >
                                  {ACTION_ICONS.view}
                                  Details
                                </Link>
                              )}
                              <Link
                                to={`/admin/doctors/${doctor._id}/edit`}
                                className="people-list-action people-list-action--profile"
                                title="Edit professional profile"
                              >
                                {ACTION_ICONS.profile}
                                Profile
                              </Link>
                              {accountTo && (
                                <Link
                                  to={`/admin/account/${doctor.userId}/edit`}
                                  className="people-list-action people-list-action--edit"
                                  title="Edit account"
                                >
                                  {ACTION_ICONS.edit}
                                  Edit
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
              itemLabel="doctors"
              onPageChange={(page) => applyFilters({ page })}
            />
          )}
        </div>
      </AdminLayout>
    </PageLayout>
  );
}
