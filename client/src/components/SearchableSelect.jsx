import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./SearchableSelect.css";

function ChevronIcon({ open }) {
  return (
    <svg
      className={`custom-select-chevron ${open ? "custom-select-chevron-open" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function SearchableSelect({
  id: idProp,
  label,
  value,
  onChange,
  onOptionSelect,
  options: staticOptions = [],
  loadOptions,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  className = "",
  invalid = false,
  disabled = false,
  required = false,
  emptyMessage = "No matches found.",
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const listboxId = `${id}-listbox`;
  const searchId = `${id}-search`;
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState(staticOptions);
  const [loading, setLoading] = useState(false);
  const [pinnedLabel, setPinnedLabel] = useState("");

  const selected = options.find((o) => o.value === value) || staticOptions.find((o) => o.value === value);
  const displayLabel = selected?.label ?? (value ? pinnedLabel : "") || placeholder;

  useEffect(() => {
    if (!value) {
      setPinnedLabel("");
      return;
    }
    if (selected?.label) {
      setPinnedLabel(selected.label);
    }
  }, [value, selected?.label]);

  const filterStaticOptions = useCallback(
    (text) => {
      const normalized = text.trim().toLowerCase();
      if (!normalized) return staticOptions;
      return staticOptions.filter((opt) => opt.label.toLowerCase().includes(normalized));
    },
    [staticOptions],
  );

  useEffect(() => {
    if (loadOptions) return;
    setOptions(filterStaticOptions(query));
  }, [loadOptions, query, filterStaticOptions]);

  useEffect(() => {
    if (!loadOptions || !open) return undefined;

    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const next = await loadOptions(query.trim());
        if (active) setOptions(next);
      } catch {
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadOptions, open, query]);

  const updateMenuPosition = useCallback(() => {
    const trigger = rootRef.current?.querySelector(".custom-select-trigger");
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const maxHeight = 300;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const openUpward = spaceBelow < 160 && spaceAbove > spaceBelow;
    const availableHeight = Math.min(maxHeight, openUpward ? spaceAbove : spaceBelow);

    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      top: openUpward ? rect.top - gap - availableHeight : rect.bottom + gap,
      maxHeight: availableHeight,
      zIndex: 10000,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
      setQuery("");
      return undefined;
    }

    updateMenuPosition();
    const timer = setTimeout(() => searchRef.current?.focus(), 0);

    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;

    const onDocMouseDown = (e) => {
      const inRoot = rootRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inRoot && !inMenu) {
        setOpen(false);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const pick = (nextValue, label) => {
    if (nextValue && label) setPinnedLabel(label);
    if (!nextValue) setPinnedLabel("");
    onChange(nextValue);
    onOptionSelect?.(nextValue, label || "");
    setOpen(false);
  };

  const menu = open && menuStyle && (
    <div
      ref={menuRef}
      id={listboxId}
      className="custom-select-menu custom-select-menu-portal searchable-select-menu"
      role="listbox"
      aria-label={label || placeholder}
      style={menuStyle}
    >
      <div className="searchable-select-search-wrap">
        <input
          ref={searchRef}
          id={searchId}
          type="search"
          className="searchable-select-search"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>
      <ul className="searchable-select-options">
        {loading ? (
          <li className="searchable-select-empty">Searching…</li>
        ) : options.length === 0 ? (
          <li className="searchable-select-empty">{emptyMessage}</li>
        ) : (
          options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value || "__empty"} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`custom-select-option ${isSelected ? "custom-select-option-selected" : ""}`}
                  onClick={() => pick(opt.value, opt.label)}
                >
                  <span className="custom-select-check" aria-hidden="true">
                    {isSelected && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  <span>{opt.label}</span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={[
        "custom-select",
        "searchable-select",
        open ? "custom-select-open" : "",
        invalid ? "custom-select-invalid" : "",
        disabled ? "custom-select-disabled" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label && (
        <label className="custom-select-label" htmlFor={`${id}-trigger`}>
          {label}
          {required && <span className="searchable-select-required"> *</span>}
        </label>
      )}

      <button
        id={`${id}-trigger`}
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`custom-select-value ${!selected ? "custom-select-value-placeholder" : ""}`}>
          {displayLabel}
        </span>
        <ChevronIcon open={open} />
      </button>

      {menu && createPortal(menu, document.body)}
    </div>
  );
}
