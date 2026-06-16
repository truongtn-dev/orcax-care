import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./TimePicker.css";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseTime(value) {
  if (!value || !TIME_PATTERN.test(value)) return { hour: 8, minute: 0 };
  const [hour, minute] = value.split(":").map(Number);
  return { hour, minute };
}

function toTimeValue(hour, minute) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timeToMinutes(value) {
  const { hour, minute } = parseTime(value);
  return hour * 60 + minute;
}

function buildHours() {
  return Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
}

function buildMinutes(step, activeMinute) {
  const values = new Set();
  for (let minute = 0; minute < 60; minute += step) {
    values.add(minute);
  }
  if (activeMinute >= 0 && activeMinute < 60 && !values.has(activeMinute)) {
    values.add(activeMinute);
  }
  return [...values]
    .sort((left, right) => left - right)
    .map((minute) => String(minute).padStart(2, "0"));
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default function TimePicker({
  id: idProp,
  label,
  name,
  value = "",
  onChange,
  placeholder = "Pick time",
  className = "",
  disabled = false,
  required = false,
  min,
  max,
  minuteStep = 5,
  presets = ["08:00", "12:00", "13:00", "17:00"],
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);

  const parsed = parseTime(value);
  const [draftHour, setDraftHour] = useState(parsed.hour);
  const [draftMinute, setDraftMinute] = useState(parsed.minute);
  const draftRef = useRef({ hour: parsed.hour, minute: parsed.minute });

  useEffect(() => {
    draftRef.current = { hour: draftHour, minute: draftMinute };
  }, [draftHour, draftMinute]);

  const hours = useMemo(() => buildHours(), []);
  const minutes = useMemo(
    () => buildMinutes(minuteStep, draftMinute),
    [minuteStep, draftMinute],
  );

  const updatePanelPosition = useCallback(() => {
    const trigger = rootRef.current?.querySelector(".time-picker-trigger");
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const panelWidth = 280;
    const panelHeight = 320;
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

    const next = parseTime(value);
    setDraftHour(next.hour);
    setDraftMinute(next.minute);
    updatePanelPosition();

    const timer = setTimeout(() => {
      hourListRef.current
        ?.querySelector(".is-selected")
        ?.scrollIntoView({ block: "center" });
      minuteListRef.current
        ?.querySelector(".is-selected")
        ?.scrollIntoView({ block: "center" });
    }, 0);

    const onScrollOrResize = () => updatePanelPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, value, updatePanelPosition]);

  useEffect(() => {
    if (!open) return undefined;

    const onDocMouseDown = (event) => {
      const inRoot = rootRef.current?.contains(event.target);
      const inPanel = panelRef.current?.contains(event.target);
      if (!inRoot && !inPanel) setOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
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

  const isDisabledTime = (candidate) => {
    const minutes = timeToMinutes(candidate);
    if (min && minutes < timeToMinutes(min)) return true;
    if (max && minutes > timeToMinutes(max)) return true;
    return false;
  };

  const applyTime = (hour, minute) => {
    const nextValue = toTimeValue(hour, minute);
    if (isDisabledTime(nextValue)) return;
    emitChange(nextValue);
    setOpen(false);
  };

  const pickHour = (hour) => {
    setDraftHour(hour);
  };

  const pickMinute = (minute) => {
    setDraftMinute(minute);
    applyTime(draftRef.current.hour, minute);
  };

  const confirmDraft = () => {
    applyTime(draftRef.current.hour, draftRef.current.minute);
  };

  const draftValue = toTimeValue(draftHour, draftMinute);

  const panel = open && panelStyle && (
    <div
      ref={panelRef}
      className="time-picker-panel time-picker-panel-portal"
      role="dialog"
      aria-label={label || "Choose time"}
      style={panelStyle}
    >
      <div className="time-picker-preview">{draftValue}</div>

      <div className="time-picker-columns">
        <div className="time-picker-column">
          <span className="time-picker-column-label">Hour</span>
          <ul ref={hourListRef} className="time-picker-list" role="listbox" aria-label="Hour">
            {hours.map((hour) => {
              const hourNum = Number(hour);
              const selected = hourNum === draftHour;
              const disabledOption = isDisabledTime(toTimeValue(hourNum, draftMinute));
              return (
                <li key={hour} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={[
                      "time-picker-option",
                      selected ? "is-selected" : "",
                      disabledOption ? "is-disabled" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={disabledOption}
                    onClick={() => pickHour(hourNum)}
                  >
                    {hour}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="time-picker-column">
          <span className="time-picker-column-label">Min</span>
          <ul ref={minuteListRef} className="time-picker-list" role="listbox" aria-label="Minute">
            {minutes.map((minute) => {
              const minuteNum = Number(minute);
              const selected = minuteNum === draftMinute;
              const disabledOption = isDisabledTime(toTimeValue(draftHour, minuteNum));
              return (
                <li key={minute} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={[
                      "time-picker-option",
                      selected ? "is-selected" : "",
                      disabledOption ? "is-disabled" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={disabledOption}
                    onClick={() => pickMinute(minuteNum)}
                  >
                    {minute}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {presets?.length > 0 && (
        <div className="time-picker-presets" role="group" aria-label="Quick times">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`time-picker-preset ${value === preset ? "is-active" : ""}`}
              disabled={isDisabledTime(preset)}
              onClick={() => {
                const { hour, minute } = parseTime(preset);
                applyTime(hour, minute);
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className="time-picker-confirm"
        disabled={isDisabledTime(draftValue)}
        onClick={confirmDraft}
      >
        Confirm
      </button>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={["time-picker", open ? "time-picker-open" : "", className].filter(Boolean).join(" ")}
    >
      {label && (
        <span className="time-picker-label">
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
        className="time-picker-trigger"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`time-picker-value ${!value ? "is-placeholder" : ""}`}>
          {value || placeholder}
        </span>
        <span className="time-picker-icon">
          <ClockIcon />
        </span>
      </button>

      {panel && createPortal(panel, document.body)}
    </div>
  );
}
