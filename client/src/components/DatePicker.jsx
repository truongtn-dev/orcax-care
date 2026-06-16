import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./DatePicker.css";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function parseIsoDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplay(value) {
  const date = parseIsoDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarDays(viewYear, viewMonth) {
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(viewYear, viewMonth, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      iso: toIsoDate(date),
      inMonth: date.getMonth() === viewMonth,
    };
  });
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export default function DatePicker({
  id: idProp,
  label,
  name,
  value = "",
  onChange,
  placeholder = "Pick a date",
  className = "",
  disabled = false,
  required = false,
  min,
  max,
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);

  const selectedDate = parseIsoDate(value);
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    return now;
  }, []);

  const initialView = selectedDate || today;
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const days = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const updatePanelPosition = useCallback(() => {
    const trigger = rootRef.current?.querySelector(".date-picker-trigger");
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const panelWidth = 300;
    const panelHeight = 360;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const openUpward = spaceBelow < panelHeight && spaceAbove > spaceBelow;

    let left = rect.left;
    if (left + panelWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - panelWidth - 12);
    }

    setPanelStyle({
      position: "fixed",
      left,
      width: panelWidth,
      top: openUpward ? rect.top - gap - panelHeight : rect.bottom + gap,
      zIndex: 10000,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return undefined;
    }

    const base = selectedDate || today;
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    updatePanelPosition();

    const onScrollOrResize = () => updatePanelPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, selectedDate, today, updatePanelPosition]);

  useEffect(() => {
    if (!open) return undefined;

    const onDocMouseDown = (e) => {
      const inRoot = rootRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inRoot && !inPanel) setOpen(false);
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

  const emitChange = (nextValue) => {
    onChange?.({ target: { name, value: nextValue } });
  };

  const isDisabledDay = (iso) => {
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  const goMonth = (delta) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const pickDay = (iso) => {
    if (isDisabledDay(iso)) return;
    emitChange(iso);
    setOpen(false);
  };

  const panel = open && panelStyle && (
    <div
      ref={panelRef}
      className="date-picker-panel date-picker-panel-portal"
      role="dialog"
      aria-label={label || "Choose date"}
      style={panelStyle}
    >
      <div className="date-picker-panel-head">
        <button type="button" className="date-picker-nav" onClick={() => goMonth(-1)} aria-label="Previous month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <strong className="date-picker-month">{monthLabel}</strong>
        <button type="button" className="date-picker-nav" onClick={() => goMonth(1)} aria-label="Next month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="date-picker-weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="date-picker-grid">
        {days.map((day) => {
          const dayDate = day.date;
          const selected = isSameDay(dayDate, selectedDate);
          const isToday = isSameDay(dayDate, today);
          const outOfRange = isDisabledDay(day.iso);

          return (
            <button
              key={day.iso}
              type="button"
              className={[
                "date-picker-day",
                !day.inMonth ? "is-outside" : "",
                selected ? "is-selected" : "",
                isToday ? "is-today" : "",
                outOfRange ? "is-disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => pickDay(day.iso)}
              disabled={outOfRange}
              aria-label={formatDisplay(day.iso)}
              aria-pressed={selected}
            >
              {dayDate.getDate()}
            </button>
          );
        })}
      </div>

      <div className="date-picker-panel-foot">
        {!required && (
          <button
            type="button"
            className="date-picker-foot-btn"
            onClick={() => {
              emitChange("");
              setOpen(false);
            }}
          >
            Clear
          </button>
        )}
        <button
          type="button"
          className="date-picker-foot-btn is-primary"
          onClick={() => pickDay(toIsoDate(today))}
          disabled={isDisabledDay(toIsoDate(today))}
        >
          Today
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={["date-picker", open ? "date-picker-open" : "", className].filter(Boolean).join(" ")}
    >
      {label && (
        <span className="date-picker-label">
          {label}
          {required && (
            <span className="field-required-mark" aria-hidden="true">
              *
            </span>
          )}
        </span>
      )}

      <button
        id={id}
        type="button"
        className="date-picker-trigger"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`date-picker-value ${!value ? "is-placeholder" : ""}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <span className="date-picker-icon">
          <CalendarIcon />
        </span>
      </button>

      {panel && createPortal(panel, document.body)}
    </div>
  );
}
