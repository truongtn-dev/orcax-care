import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import "./WorkShiftsListPage.css";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import FilterSearchField from "../../components/FilterSearchField.jsx";
import WorkShiftWeekBoard from "../../components/WorkShiftWeekBoard.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const emptyFilters = {
  q: "",
  specialtyId: "",
  departmentId: "",
  isActive: "",
};

export default function WorkShiftsListPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [result, setResult] = useState({ items: [], weeklyPattern: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadShifts = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listWorkShifts(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], weeklyPattern: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const [specialtyRes, departmentRes] = await Promise.all([
          AdminApiClient.getSpecialties({ activeOnly: false }),
          AdminApiClient.getDepartments({ activeOnly: false }),
        ]);
        setSpecialties(specialtyRes.data.items || []);
        setDepartments(departmentRes.data.items || []);
      } catch (err) {
        setError(getApiErrorMessage(err));
      }
      await loadShifts({});
    }
    init();
  }, [loadShifts]);

  const applyFilters = () => {
    const params = {};
    if (filters.q.trim()) params.q = filters.q.trim();
    if (filters.specialtyId) params.specialtyId = filters.specialtyId;
    if (filters.departmentId) params.departmentId = filters.departmentId;
    if (filters.isActive) params.isActive = filters.isActive;
    loadShifts(params);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    loadShifts({});
  };

  const hasActiveFilters = Boolean(
    filters.q.trim() || filters.specialtyId || filters.departmentId || filters.isActive,
  );

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Work shifts"
        description="Browse weekly shift templates by doctor, specialty, or department."
      >
        <div className="people-list-page work-shifts-page">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="card filters-card people-list-toolbar">
            <div className="filters-toolbar">
              <div className="filters-toolbar-fields">
                <FilterSearchField
                  id="work-shifts-search"
                  placeholder="Search by doctor name, email, or license…"
                  value={filters.q}
                  onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))}
                  onSearch={applyFilters}
                />
                <CustomSelect
                  className="filter-field"
                  label="Specialty"
                  value={filters.specialtyId}
                  onChange={(specialtyId) => setFilters((current) => ({ ...current, specialtyId }))}
                  options={[
                    { value: "", label: "All specialties" },
                    ...specialties.map((item) => ({ value: item._id, label: item.name })),
                  ]}
                />
                <CustomSelect
                  className="filter-field"
                  label="Department"
                  value={filters.departmentId}
                  onChange={(departmentId) => setFilters((current) => ({ ...current, departmentId }))}
                  options={[
                    { value: "", label: "All departments" },
                    ...departments.map((item) => ({ value: item._id, label: item.name })),
                  ]}
                />
                <CustomSelect
                  className="filter-field"
                  label="Status"
                  value={filters.isActive}
                  onChange={(isActive) => setFilters((current) => ({ ...current, isActive }))}
                  options={STATUS_OPTIONS}
                />
              </div>
              <div className="filters-toolbar-actions">
                <button type="button" className="btn btn-primary" onClick={applyFilters}>
                  Search
                </button>
                {hasActiveFilters && (
                  <button type="button" className="btn btn-outline" onClick={clearFilters}>
                    Clear
                  </button>
                )}
                <Link to="/admin/work-shifts/new" className="btn btn-primary">
                  Create shift
                </Link>
              </div>
            </div>
          </div>

          <WorkShiftWeekBoard
            weeklyPattern={result.weeklyPattern}
            total={result.total}
            loading={loading}
            showDoctor
            editHrefPrefix="/admin/work-shifts"
            emptyTitle="No work shifts found"
            emptyDescription={
              hasActiveFilters
                ? "Try different search terms or clear filters to see all shift templates."
                : "Create a weekly shift template to start generating appointment slots."
            }
            emptyAction={
              hasActiveFilters ? (
                <button type="button" className="btn btn-outline btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <Link to="/admin/work-shifts/new" className="btn btn-primary btn-sm">
                  Create shift
                </Link>
              )
            }
          />
        </div>
      </AdminLayout>
    </PageLayout>
  );
}
