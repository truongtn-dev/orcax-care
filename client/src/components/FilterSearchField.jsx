export default function FilterSearchField({
  id,
  label = "Tìm kiếm",
  placeholder,
  value,
  onChange,
  onSearch,
  className = "",
}) {
  return (
    <div className={`filter-field filter-field-grow ${className}`.trim()}>
      <label className="filter-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        className="filter-field-control"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
      />
    </div>
  );
}
