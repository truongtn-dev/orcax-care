import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import FilterSearchField from "../../components/FilterSearchField.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

export default function DoctorsListPage() {
  const [filters, setFilters] = useState({
    q: "",
    specialtyId: "",
    departmentId: "",
    activeOnly: false,
  });
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [result, setResult] = useState({
    items: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });
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
    const initializeData = async () => {
      await loadMasters();
      await loadDoctors(filters);
    };
    initializeData();
  }, [filters, loadDoctors, loadMasters]);

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFilters((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      q: "",
      specialtyId: "",
      departmentId: "",
      activeOnly: false,
      page: 1,
    });
  };

  return (
    <PageLayout>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Doctor list</h1>
            <p>
              Manage doctor profiles, specialties, departments, and patient-facing visibility status.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link to="/admin/work-shifts" className="btn btn-secondary">
              Work shifts
            </Link>
            <Link to="/admin/work-shifts/new" className="btn btn-primary">
              Create work shift
            </Link>
          </div>
        </div>
      </div>

      <div className="card admin-toolbar">
        <Link to="/admin" className="btn btn-outline">
          Back to admin
        </Link>
        <Link to="/search-doctors" className="btn btn-ghost">
          View patient side
        </Link>
      </div>

      <div className="card filters-card">
        <div className="filters-toolbar">
          <div className="filters-toolbar-fields">
            <FilterSearchField
              id="doctors-list-search"
              placeholder="Search name, email, license…"
              value={filters.q}
              onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value, page: 1 }))}
            />
            <CustomSelect
              className="filter-field"
              label="Specialty"
              value={filters.specialtyId}
              placeholder="All specialties"
              onChange={(specialtyId) => setFilters((current) => ({ ...current, specialtyId, page: 1 }))}
              options={[
                { value: "", label: "All specialties" },
                ...specialties.map((specialty) => ({ value: specialty._id, label: specialty.name })),
              ]}
            />
            <CustomSelect
              className="filter-field"
              label="Department"
              value={filters.departmentId}
              placeholder="All departments"
              onChange={(departmentId) => setFilters((current) => ({ ...current, departmentId, page: 1 }))}
              options={[
                { value: "", label: "All departments" },
                ...departments.map((department) => ({ value: department._id, label: department.name })),
              ]}
            />
          </div>
        </div>
        <div className="filters-row">
          <label className="checkbox-row">
            <input
              type="checkbox"
              name="activeOnly"
              checked={filters.activeOnly}
              onChange={onChange}
            />
            Show active doctors only
          </label>
          <button
            type="button"
            className="btn btn-outline"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading doctors...
        </div>
      )}

      {!loading && (
        <div className="card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialty</th>
                <th>Department</th>
                <th>License</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((doctor) => (
                <tr key={doctor._id}>
                  <td>
                    <strong>{doctor.fullName}</strong>
                    <p className="muted">{doctor.email}</p>
                  </td>
                  <td>{doctor.specialtyName || "-"}</td>
                  <td>{doctor.departmentName || "-"}</td>
                  <td>{doctor.licenseNo}</td>
                  <td>
                    <span
                      className={`status-pill ${doctor.isActive && doctor.accountIsActive ? "status-active" : ""}`}
                    >
                      {doctor.isActive && doctor.accountIsActive
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <Link
                      className="btn btn-sm btn-outline"
                      to={`/admin/doctors/${doctor._id}/edit`}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {result.items.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-cell">
                    No doctors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}
