import { useCallback, useEffect, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";

export default function SearchDoctorsPage() {
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    q: "",
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
    const next = { q: "", specialtyId: "", departmentId: "", page: 1, limit: 12 };
    setFilters(next);
    search(next);
  };

  return (
    <PageLayout>
      <ScrollReveal className="page-header" variant="up">
        <h1>Find Doctors</h1>
        <p>Search by doctor name, specialty, or department to find the right specialist.</p>
      </ScrollReveal>

      <ScrollReveal variant="up" delay={80}>
        <div className="card filters-card">
        <div className="filters-row">
          <input
            type="search"
            placeholder="Search doctors, specialty, department…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && applySearch({ q: filters.q })}
          />
          <button type="button" className="btn btn-primary" onClick={() => applySearch({ q: filters.q })}>
            Search
          </button>
          <button type="button" className="btn btn-outline" onClick={clearFilters}>
            Clear
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
        {specialties.length > 0 && (
          <div className="chip-row">
            {specialties.slice(0, 6).map((s) => (
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
        )}
        </div>
      </ScrollReveal>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading doctors…
        </div>
      )}

      {!loading && result.items.length === 0 && (
        <ScrollReveal variant="scale">
          <div className="empty-state card">
          <div className="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <h3>No doctors found</h3>
          <p>Try adjusting your search criteria or clearing filters.</p>
          <button type="button" className="btn btn-outline" onClick={clearFilters}>
            Clear Filters
          </button>
          </div>
        </ScrollReveal>
      )}

      <div className="doctor-grid scroll-stagger-grid">
        {!loading &&
          result.items.map((doc, i) => (
            <ScrollReveal key={doc._id} as="article" className="card doctor-card card-hover" variant="float" delay={(i % 6) * 80}>
              <div className="doctor-avatar">{doc.fullName?.charAt(0)?.toUpperCase() || "D"}</div>
              <div>
                <h3>{doc.fullName}</h3>
                {doc.specialty?.name && <p className="doctor-meta">{doc.specialty.name}</p>}
                {doc.department?.name && <p className="doctor-meta">{doc.department.name}</p>}
                <p className="doctor-bio">{doc.bio || "No bio available."}</p>
              </div>
            </ScrollReveal>
          ))}
      </div>

      {result.totalPages > 1 && (
        <ScrollReveal variant="up" delay={100}>
        <div className="pagination">
          <button
            type="button"
            className="btn btn-outline"
            disabled={result.page <= 1}
            onClick={() => applySearch({ page: result.page - 1 })}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {result.page} of {result.totalPages} · {result.total} doctors
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
        </ScrollReveal>
      )}
    </PageLayout>
  );
}
