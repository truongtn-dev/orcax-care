import { useEffect, useId, useRef, useState } from "react";

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

export default function CustomSelect({
  id: idProp,
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  className = "",
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const listboxId = `${id}-listbox`;
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder;

  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
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

  const pick = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`custom-select ${open ? "custom-select-open" : ""} ${className}`.trim()}
    >
      {label && (
        <label className="custom-select-label" htmlFor={`${id}-trigger`}>
          {label}
        </label>
      )}

      <button
        id={`${id}-trigger`}
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`custom-select-value ${!selected ? "custom-select-value-placeholder" : ""}`}>
          {displayLabel}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <ul id={listboxId} className="custom-select-menu" role="listbox" aria-label={label || placeholder}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value || "__empty"} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`custom-select-option ${isSelected ? "custom-select-option-selected" : ""}`}
                  onClick={() => pick(opt.value)}
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
          })}
        </ul>
      )}
    </div>
  );
}
