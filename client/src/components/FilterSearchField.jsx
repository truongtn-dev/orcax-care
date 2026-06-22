function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function FilterSearchField({
  id,
  label = "Search",
  placeholder,
  value,
  onChange,
  onSearch,
  className = "",
}) {
  return (
    <div className={`filter-field filter-field-grow filter-search-field ${className}`.trim()}>
      <label className="filter-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="filter-search-control-wrap">
        <span className="filter-search-icon">
          <SearchIcon />
        </span>
        <input
          id={id}
          type="search"
          className="filter-field-control filter-search-control"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
        />
      </div>
    </div>
  );
}
