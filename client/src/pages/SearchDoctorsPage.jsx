import { useCallback, useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import DoctorSearchCard from "../components/DoctorSearchCard.jsx";
import DoctorCardSkeleton from "../components/DoctorCardSkeleton.jsx";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";

const DOCTORS_PAGE_SIZE = 6;

const INITIAL_FILTERS = {
  q: "",
  specialtyId: "",
  departmentId: "",
  page: 1,
  limit: DOCTORS_PAGE_SIZE,
};

const EMPTY_RESULT = { items: [], total: 0, totalPages: 1, page: 1 };

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ChevronIcon({ direction }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d={direction === "prev" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

function buildActiveFilters(filters, specialties, departments) {
  const pills = [];

  if (filters.q.trim()) {
    pills.push({ key: "q", label: `"${filters.q.trim()}"` });
  }

  if (filters.specialtyId) {
    const specialty = specialties.find((item) => item._id === filters.specialtyId);
    if (specialty) pills.push({ key: "specialtyId", label: specialty.name });
  }

  if (filters.departmentId) {
    const department = departments.find((item) => item._id === filters.departmentId);
    if (department) pills.push({ key: "departmentId", label: department.name });
  }

  return pills;
}

function getPageNumbers(page, totalPages) {
  if (totalPages <= 1) return [1];
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set(
    [1, totalPages, page, page - 1, page + 1].filter((value) => value >= 1 && value <= totalPages),
  );

  return [...pages].sort((a, b) => a - b);
}

function getResultRange(result, limit) {
  if (!result.total) return null;

  return {
    start: (result.page - 1) * limit + 1,
    end: Math.min(result.page * limit, result.total),
  };
}

function SearchPagination({ result, resultRange, onPageChange }) {
  const pageNumbers = useMemo(
    () => getPageNumbers(result.page, result.totalPages),
    [result.page, result.totalPages],
  );

  return (
    <div className={`search-pagination-shell ${result.totalPages <= 1 ? "search-pagination-single" : ""}`}>
      <p className="search-pagination-summary">
        Showing <strong>{resultRange.start}–{resultRange.end}</strong> of <strong>{result.total}</strong> specialists
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
          onClick={() => onPageChange(result.page - 1)}
          aria-label="Previous page"
        >
          <ChevronIcon direction="prev" />
        </button>
        <div className="search-page-numbers">
          {pageNumbers.map((num, index) => {
            const previous = pageNumbers[index - 1];
            const showEllipsis = previous != null && num - previous > 1;

            return (
              <span key={num} className="search-page-num-wrap">
                {showEllipsis && <span className="search-page-ellipsis">…</span>}
                <button
                  type="button"
                  className={`search-page-btn ${result.page === num ? "search-page-btn-active" : ""}`}
                  onClick={() => onPageChange(num)}
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
          onClick={() => onPageChange(result.page + 1)}
          aria-label="Next page"
        >
          <ChevronIcon direction="next" />
        </button>
      </nav>
    </div>
  );
}

export default function SearchDoctorsPage() {
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [result, setResult] = useState(EMPTY_RESULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const search = useCallback(async (params) => {
    setLoading(true);
    setError("");

    try {
      const { data } = await PublicApiClient.searchDoctors(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult(EMPTY_RESULT);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const [specRes, deptRes] = await Promise.all([
        PublicApiClient.getSpecialties(),
        PublicApiClient.getDepartments(),
      ]);

      setSpecialties(specRes.data.items || []);
      setDepartments(deptRes.data.items || []);
      await search(INITIAL_FILTERS);
    }

    init();
  }, [search]);

  const applySearch = useCallback(
    (patch) => {
      const next = { ...filters, ...patch, page: patch.page ?? 1 };
      setFilters(next);
      search(next);
    },
    [filters, search],
  );

  const clearFilters = useCallback(() => {
    const next = { ...INITIAL_FILTERS };
    setFilters(next);
    search(next);
  }, [search]);

  const activeFilters = useMemo(
    () => buildActiveFilters(filters, specialties, departments),
    [filters, specialties, departments],
  );

  const resultRange = useMemo(() => getResultRange(result, filters.limit), [result, filters.limit]);

  const specialtyOptions = useMemo(
    () => [
      { value: "", label: "All specialties" },
      ...specialties.map((item) => ({ value: item._id, label: item.name })),
    ],
    [specialties],
  );

  const departmentOptions = useMemo(
    () => [
      { value: "", label: "All departments" },
      ...departments.map((item) => ({ value: item._id, label: item.name })),
    ],
    [departments],
  );

  const popularSpecialties = specialties.slice(0, 8);
  const specialistLabel = result.total === 1 ? "specialist" : "specialists";

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
              onSubmit={(event) => {
                event.preventDefault();
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
                  onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                  autoComplete="off"
                />
              </label>
              <button type="submit" className="btn btn-white search-hero-submit">
                Search
              </button>
            </form>

            {!loading && (
              <p className="search-hero-stat" aria-live="polite">
                <strong>{result.total}</strong> {specialistLabel} available
              </p>
            )}
          </div>
        </section>

        <div className="search-body">
          <div className="search-toolbar card">
            <div className="search-toolbar-head">
              <h2 className="search-toolbar-title">Refine results</h2>
              {activeFilters.length > 0 && (
                <button type="button" className="search-toolbar-clear" onClick={clearFilters}>
                  Clear all
                </button>
              )}
            </div>

            <div className="search-toolbar-fields">
              <CustomSelect
                id="filter-specialty"
                label="Specialty"
                value={filters.specialtyId}
                placeholder="All specialties"
                onChange={(specialtyId) => applySearch({ specialtyId })}
                options={specialtyOptions}
              />
              <CustomSelect
                id="filter-department"
                label="Department"
                value={filters.departmentId}
                placeholder="All departments"
                onChange={(departmentId) => applySearch({ departmentId })}
                options={departmentOptions}
              />
            </div>

            {popularSpecialties.length > 0 && (
              <div className="search-toolbar-chips">
                <span className="search-toolbar-chips-label">Popular specialties</span>
                <div className="chip-row">
                  {popularSpecialties.map((specialty) => (
                    <button
                      key={specialty._id}
                      type="button"
                      className={`chip ${filters.specialtyId === specialty._id ? "chip-active" : ""}`}
                      onClick={() =>
                        applySearch({
                          specialtyId: filters.specialtyId === specialty._id ? "" : specialty._id,
                        })
                      }
                    >
                      {specialty.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="search-main">
            {activeFilters.length > 0 && (
              <div className="search-active-filters" aria-label="Active filters">
                {activeFilters.map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    className="search-filter-pill"
                    onClick={() => applySearch({ [pill.key]: "" })}
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
                  {result.total} {specialistLabel}
                </span>
              )}
            </div>

            {loading && (
              <div className="doctor-grid-premium" aria-busy="true" aria-label="Loading doctors">
                {Array.from({ length: DOCTORS_PAGE_SIZE }).map((_, index) => (
                  <DoctorCardSkeleton key={index} />
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
                {result.items.map((doctor, index) => (
                  <ScrollReveal key={doctor._id} variant="float" delay={(index % DOCTORS_PAGE_SIZE) * 60}>
                    <DoctorSearchCard doctor={doctor} />
                  </ScrollReveal>
                ))}
              </div>
            )}

            {!loading && result.total > 0 && resultRange && (
              <SearchPagination
                result={result}
                resultRange={resultRange}
                onPageChange={(page) => applySearch({ page })}
              />
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
