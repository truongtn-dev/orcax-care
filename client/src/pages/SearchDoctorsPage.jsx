import { useCallback, useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import DoctorSearchCard from "../components/DoctorSearchCard.jsx";
import DoctorCardSkeleton from "../components/DoctorCardSkeleton.jsx";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";

const SKELETON_COUNT = 6;
/** Doctors per page — API supports `page` & `limit` (max 50). */
const DOCTORS_PAGE_SIZE = 4;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function SearchDoctorsPage() {
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    q: "",
    specialtyId: "",
    departmentId: "",
    page: 1,
    limit: DOCTORS_PAGE_SIZE,
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
    loadMasters().then(() => search({ page: 1, limit: DOCTORS_PAGE_SIZE }));
  }, [loadMasters, search]);

  const applySearch = (patch) => {
    const next = { ...filters, ...patch, page: patch.page ?? 1 };
    setFilters(next);
    search(next);
  };

  const clearFilters = () => {
    const next = { q: "", specialtyId: "", departmentId: "", page: 1, limit: DOCTORS_PAGE_SIZE };
    setFilters(next);
    search(next);
  };

  const activeFilters = useMemo(() => {
    const pills = [];
    if (filters.q.trim()) pills.push({ key: "q", label: `"${filters.q.trim()}"` });
    if (filters.specialtyId) {
      const s = specialties.find((x) => x._id === filters.specialtyId);
      if (s) pills.push({ key: "specialtyId", label: s.name });
    }
    if (filters.departmentId) {
      const d = departments.find((x) => x._id === filters.departmentId);
      if (d) pills.push({ key: "departmentId", label: d.name });
    }
    return pills;
  }, [filters, specialties, departments]);

  const hasActiveFilters = activeFilters.length > 0;

  const removeFilter = (key) => {
    if (key === "q") applySearch({ q: "" });
    else if (key === "specialtyId") applySearch({ specialtyId: "" });
    else if (key === "departmentId") applySearch({ departmentId: "" });
  };

  const pageNumbers = useMemo(() => {
    const { page, totalPages } = result;
    if (totalPages <= 1) return [1];
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, totalPages, page, page - 1, page + 1].filter((p) => p >= 1 && p <= totalPages));
    return [...pages].sort((a, b) => a - b);
  }, [result]);

  const resultRange = useMemo(() => {
    if (!result.total) return null;
    const start = (result.page - 1) * filters.limit + 1;
    const end = Math.min(result.page * filters.limit, result.total);
    return { start, end };
  }, [result, filters.limit]);

  return (
    <PageLayout>
      <div className="search-doctors-page">
        <section className="search-hero" aria-labelledby="search-doctors-title">
          <div className="search-hero-bg" aria-hidden="true" />
          <div className="search-hero-inner">
            <p className="search-hero-eyebrow">Find care</p>
            <h1 id="search-doctors-title">Find your specialist</h1>
            <p className="search-hero-lead">
              Search verified doctors by name, specialty, or department — book with confidence.
            </p>

            <form
              className="search-hero-form"
              onSubmit={(e) => {
                e.preventDefault();
                applySearch({ q: filters.q });
              }}
            >
              <label className="search-input-wrap" htmlFor="doctor-search-q">
                <span className="search-input-icon">
                  <SearchIcon />
                </span>
                <input
                  id="doctor-search-q"
                  type="search"
                  placeholder="Doctor name, specialty, or department…"
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                  autoComplete="off"
                />
              </label>
              <button type="submit" className="btn btn-white search-hero-submit">
                Search
              </button>
            </form>

            {!loading && (
              <p className="search-hero-stat" aria-live="polite">
                <strong>{result.total}</strong>{" "}
                {result.total === 1 ? "specialist" : "specialists"} available
              </p>
            )}
          </div>
        </section>

        <div className="search-layout">
          <aside className="search-sidebar card">
            <h2 className="search-sidebar-title">Refine results</h2>

            <CustomSelect
              id="filter-specialty"
              label="Specialty"
              value={filters.specialtyId}
              placeholder="All specialties"
              onChange={(specialtyId) => applySearch({ specialtyId })}
              options={[
                { value: "", label: "All specialties" },
                ...specialties.map((s) => ({ value: s._id, label: s.name })),
              ]}
            />

            <CustomSelect
              id="filter-department"
              label="Department"
              value={filters.departmentId}
              placeholder="All departments"
              onChange={(departmentId) => applySearch({ departmentId })}
              options={[
                { value: "", label: "All departments" },
                ...departments.map((d) => ({ value: d._id, label: d.name })),
              ]}
            />

            {specialties.length > 0 && (
              <div className="search-sidebar-chips">
                <span className="search-sidebar-chips-label">Popular</span>
                <div className="chip-row">
                  {specialties.slice(0, 8).map((s) => (
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
            )}

            {hasActiveFilters && (
              <button type="button" className="btn btn-outline btn-block search-sidebar-clear" onClick={clearFilters}>
                Clear all filters
              </button>
            )}
          </aside>

          <div className="search-main">
            {hasActiveFilters && (
              <div className="search-active-filters" aria-label="Active filters">
                {activeFilters.map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    className="search-filter-pill"
                    onClick={() => removeFilter(pill.key)}
                  >
                    {pill.label}
                    <span className="search-filter-pill-x" aria-hidden="true">
                      ×
                    </span>
                  </button>
                ))}
                <button type="button" className="search-filter-clear-link" onClick={clearFilters}>
                  Clear all
                </button>
              </div>
            )}

            {error && (
              <div className="alert alert-error search-alert" role="alert">
                {error}
              </div>
            )}

            <div className="search-results-bar">
              <h2 className="search-results-title">
                {loading ? "Searching…" : result.total > 0 ? "Recommended specialists" : "Results"}
              </h2>
              {!loading && result.total > 0 && (
                <span className="search-results-range">
                  {result.total} {result.total === 1 ? "specialist" : "specialists"}
                </span>
              )}
            </div>

            {loading && (
              <div className="doctor-grid-premium" aria-busy="true" aria-label="Loading doctors">
                {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <DoctorCardSkeleton key={i} />
                ))}
              </div>
            )}

            {!loading && result.items.length === 0 && (
              <ScrollReveal variant="scale">
                <div className="empty-state card search-empty">
                  <div className="empty-state-icon search-empty-icon">
                    <SearchIcon />
                  </div>
                  <h3>No specialists match your search</h3>
                  <p>Try a different keyword, specialty, or department — or browse all doctors.</p>
                  <button type="button" className="btn btn-primary" onClick={clearFilters}>
                    Show all doctors
                  </button>
                </div>
              </ScrollReveal>
            )}

            {!loading && result.items.length > 0 && (
              <div className="doctor-grid-premium scroll-stagger-grid">
                {result.items.map((doc, i) => (
                  <ScrollReveal key={doc._id} variant="float" delay={(i % 6) * 60}>
                    <DoctorSearchCard doctor={doc} />
                  </ScrollReveal>
                ))}
              </div>
            )}

            {!loading && result.total > 0 && resultRange && (
              <div
                className={`search-pagination-shell ${result.totalPages <= 1 ? "search-pagination-single" : ""}`}
              >
                <p className="search-pagination-summary">
                  Showing <strong>{resultRange.start}–{resultRange.end}</strong> of{" "}
                  <strong>{result.total}</strong> specialists
                  {result.totalPages > 1 && (
                    <>
                      {" "}
                      · Page <strong>{result.page}</strong> of <strong>{result.totalPages}</strong>
                    </>
                  )}
                </p>
                <nav className="search-pagination" aria-label="Search results pages">
                  <button
                    type="button"
                    className="search-page-btn search-page-btn-nav"
                    disabled={result.page <= 1}
                    onClick={() => applySearch({ page: result.page - 1 })}
                    aria-label="Previous page"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <div className="search-page-numbers">
                    {pageNumbers.map((num, idx) => {
                      const prev = pageNumbers[idx - 1];
                      const showEllipsis = prev != null && num - prev > 1;
                      return (
                        <span key={num} className="search-page-num-wrap">
                          {showEllipsis && <span className="search-page-ellipsis">…</span>}
                          <button
                            type="button"
                            className={`search-page-btn ${result.page === num ? "search-page-btn-active" : ""}`}
                            onClick={() => applySearch({ page: num })}
                            aria-current={result.page === num ? "page" : undefined}
                          >
                            {num}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="search-page-btn search-page-btn-nav"
                    disabled={result.page >= result.totalPages}
                    onClick={() => applySearch({ page: result.page + 1 })}
                    aria-label="Next page"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
