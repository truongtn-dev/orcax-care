import { useCallback, useEffect, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";

export default function SearchDoctorsPage() {
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    name: "",
    specialtyId: "",
    departmentId: "",
    page: 1,
    limit: 12,
  });
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMasters = useCallback(async () => {
    const [specRes, deptRes] = await Promise.all([
      PublicApiClient.getSpecialties(),
      PublicApiClient.getDepartments(),
    ]);
    setSpecialties(specRes.data.items || []);
    setDepartments(deptRes.data.items || []);
  }, []);

  const search = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await PublicApiClient.searchDoctors(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], total: 0, totalPages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMasters().then(() => search({ page: 1, limit: 12 }));
  }, [loadMasters, search]);

  const applySearch = (patch) => {
    const next = { ...filters, ...patch, page: patch.page ?? 1 };
    setFilters(next);
    search(next);
  };

  const clearFilters = () => {
    const next = { name: "", specialtyId: "", departmentId: "", page: 1, limit: 12 };
    setFilters(next);
    search(next);
  };

  return (
    <PageLayout>
      <div className="search-header">
        <h1>Search Doctors</h1>
        <p className="muted">Find doctors by name, specialty, or department</p>
      </div>

      <div className="card filters-card">
        <div className="filters-row">
          <input
            type="search"
            placeholder="Search by doctor name…"
            value={filters.name}
            onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && applySearch({ name: filters.name })}
          />
          <button type="button" className="btn btn-primary" onClick={() => applySearch({})}>
            Search
          </button>
          <button type="button" className="btn btn-outline" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
        <div className="filters-row">
          <select
            value={filters.specialtyId}
            onChange={(e) => applySearch({ specialtyId: e.target.value })}
          >
            <option value="">All specialties</option>
            {specialties.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={filters.departmentId}
            onChange={(e) => applySearch({ departmentId: e.target.value })}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="chip-row">
          {specialties.slice(0, 5).map((s) => (
            <button
              key={s._id}
              type="button"
              className={`chip ${filters.specialtyId === s._id ? "chip-active" : ""}`}
              onClick={() =>
                applySearch({
                  specialtyId: filters.specialtyId === s._id ? "" : s._id,
                })
              }
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted">Loading doctors…</p>}

      {!loading && result.items.length === 0 && (
        <div className="empty-state card">
          <h3>No doctors found</h3>
          <p>Try adjusting your search or filters.</p>
          <button type="button" className="btn btn-outline" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      )}

      <div className="doctor-grid">
        {result.items.map((doc) => (
          <article key={doc._id} className="card doctor-card">
            <div className="doctor-avatar">{doc.fullName?.charAt(0) || "D"}</div>
            <div>
              <h3>{doc.fullName}</h3>
              <p className="doctor-meta">{doc.specialty?.name}</p>
              <p className="doctor-meta">{doc.department?.name}</p>
              <p className="doctor-bio">{doc.bio || "No bio available."}</p>
            </div>
          </article>
        ))}
      </div>

      {result.totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="btn btn-outline"
            disabled={result.page <= 1}
            onClick={() => applySearch({ page: result.page - 1 })}
          >
            Previous
          </button>
          <span>
            Page {result.page} of {result.totalPages} ({result.total} doctors)
          </span>
          <button
            type="button"
            className="btn btn-outline"
            disabled={result.page >= result.totalPages}
            onClick={() => applySearch({ page: result.page + 1 })}
          >
            Next
          </button>
        </div>
      )}
    </PageLayout>
  );
}
