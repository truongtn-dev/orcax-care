import { useMemo } from "react";

function ChevronIcon({ direction }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d={direction === "prev" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

export function getPageNumbers(page, totalPages) {
  if (totalPages <= 1) return [1];
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set(
    [1, totalPages, page, page - 1, page + 1].filter((value) => value >= 1 && value <= totalPages),
  );

  return [...pages].sort((a, b) => a - b);
}

export function getResultRange(page, total, limit) {
  if (!total) return null;

  return {
    start: (page - 1) * limit + 1,
    end: Math.min(page * limit, total),
  };
}

export default function AppPagination({
  page,
  totalPages,
  total,
  onPageChange,
  ariaLabel = "Pagination",
}) {
  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages]);

  if (!total) return null;

  return (
    <div className={`search-pagination-shell ${totalPages <= 1 ? "search-pagination-single" : ""}`}>
      <nav className="search-pagination" aria-label={ariaLabel}>
        <button
          type="button"
          className="search-page-btn search-page-btn-nav"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
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
                  className={`search-page-btn ${page === num ? "search-page-btn-active" : ""}`}
                  onClick={() => onPageChange(num)}
                  aria-current={page === num ? "page" : undefined}
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
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronIcon direction="next" />
        </button>
      </nav>
    </div>
  );
}
