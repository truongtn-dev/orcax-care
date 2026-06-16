import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DoctorLayout from "../components/DoctorLayout.jsx";
import { DoctorApiClient } from "../services/doctorApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./DoctorScheduleCalendarPage.css";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DEFAULT_START = 8 * 60;
const DEFAULT_END = 17 * 60;
const SLOT_STEP = 30;

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date) {
  const value = new Date(date);
  const day = value.getDay();
  value.setDate(value.getDate() - day);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfWeek(date) {
  const value = startOfWeek(date);
  value.setDate(value.getDate() + 6);
  return value;
}

function addDays(date, amount) {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatNavDate(date, view, rangeEnd) {
  if (view === "week") {
    const startLabel = `${DAY_LABELS[date.getDay()]}, ${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`;
    const endLabel = `${rangeEnd.getDate()} ${MONTH_LABELS[rangeEnd.getMonth()]} ${rangeEnd.getFullYear()}`;
    return `${startLabel} – ${endLabel}`;
  }
  return `${DAY_LABELS[date.getDay()]}, ${date.getDate()} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDayChipLabel(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return `${DAY_LABELS[date.getDay()]} ${day}/${month}`;
}

function parseDateOnly(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function buildTimeAxis(slots) {
  if (!slots.length) {
    const rows = [];
    for (let minute = DEFAULT_START; minute < DEFAULT_END; minute += SLOT_STEP) {
      rows.push(minute);
    }
    return rows;
  }

  const boundaries = slots.flatMap((slot) => [
    timeToMinutes(slot.startTime),
    timeToMinutes(slot.endTime),
  ]);
  const start = Math.max(0, Math.floor(Math.min(...boundaries, DEFAULT_START) / SLOT_STEP) * SLOT_STEP);
  const end = Math.ceil(Math.max(...boundaries, DEFAULT_END) / SLOT_STEP) * SLOT_STEP;
  const rows = [];
  for (let minute = start; minute < end; minute += SLOT_STEP) {
    rows.push(minute);
  }
  return rows;
}

function SlotButton({ slot, selected, onSelect }) {
  const label =
    slot.status === "booked"
      ? "Booked appointment"
      : slot.status === "blocked"
        ? "Blocked"
        : "Available";

  return (
    <button
      type="button"
      className={`cal-slot-btn cal-slot-${slot.status} ${selected ? "is-selected" : ""}`}
      onClick={() => onSelect(slot._id)}
    >
      <span className="cal-slot-time">
        {slot.startTime} – {slot.endTime}
      </span>
      <span className="cal-slot-meta">
        {label}
        {slot.roomName ? ` · ${slot.roomName}` : ""}
      </span>
    </button>
  );
}

function WeekContextStrip({ days, activeDate, onSelectDate }) {
  if (!days.length) return null;

  return (
    <div className="cal-week-strip" role="group" aria-label="Days this week">
      {days.map((day) => {
        const count = day.slots.length;
        const isActive = day.date === activeDate;
        const hasSlots = count > 0;

        return (
          <button
            key={day.date}
            type="button"
            className={`cal-week-strip-day${isActive ? " is-active" : ""}${hasSlots ? " has-slots" : ""}`}
            onClick={() => onSelectDate(day.date)}
            aria-current={isActive ? "date" : undefined}
          >
            <span className="cal-week-strip-label">{formatDayChipLabel(day.date)}</span>
            <span className="cal-week-strip-count">
              {hasSlots ? `${count} slot${count === 1 ? "" : "s"}` : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CalendarEmptyState({
  title,
  message,
  weekDays = [],
  activeDate = "",
  onSelectDate,
  onSwitchToWeek,
}) {
  const nearbyDays = weekDays.filter((day) => day.slots.length > 0);

  return (
    <div className="cal-empty">
      <div className="cal-empty-icon" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <rect x="6" y="10" width="36" height="32" rx="6" stroke="currentColor" strokeWidth="2" />
          <path d="M6 18h36" stroke="currentColor" strokeWidth="2" />
          <path d="M16 6v8M32 6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h3>{title}</h3>
      <p>{message}</p>

      {nearbyDays.length > 0 && onSelectDate && (
        <div className="cal-empty-nearby">
          <span className="cal-empty-nearby-label">Slots this week</span>
          <div className="cal-empty-nearby-list">
            {nearbyDays.map((day) => (
              <button
                key={day.date}
                type="button"
                className="cal-empty-nearby-btn"
                onClick={() => onSelectDate(day.date)}
              >
                {formatDayChipLabel(day.date)}
                <span>{day.slots.length} slots</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="cal-empty-actions">
        {onSwitchToWeek && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onSwitchToWeek}>
            View week
          </button>
        )}
        <Link to="/doctor/work-shifts" className="btn btn-secondary btn-sm">
          View work shifts
        </Link>
      </div>
    </div>
  );
}

function DayTimeline({ day, weekDays, activeDate, selectedSlotId, onSelectSlot, onSelectDate, onSwitchToWeek }) {
  const slots = day?.slots || [];
  const timeAxis = useMemo(() => buildTimeAxis(slots), [slots]);
  const slotsByStart = useMemo(
    () => Object.fromEntries(slots.map((slot) => [slot.startTime, slot])),
    [slots],
  );

  if (!slots.length) {
    const dayLabel = activeDate ? formatDayChipLabel(activeDate) : "This day";
    return (
      <div className="cal-day-empty-wrap">
        <WeekContextStrip days={weekDays} activeDate={activeDate} onSelectDate={onSelectDate} />
        <CalendarEmptyState
          title="No slots on this day"
          message={`${dayLabel} has no appointment slots. Slots only appear on days that match your weekly work shifts after admin generates them.`}
          weekDays={weekDays}
          activeDate={activeDate}
          onSelectDate={onSelectDate}
          onSwitchToWeek={onSwitchToWeek}
        />
      </div>
    );
  }

  return (
    <div className="cal-day-view">
      <WeekContextStrip days={weekDays} activeDate={activeDate} onSelectDate={onSelectDate} />
      <div className="cal-day-timeline">
      {timeAxis.map((minute) => {
        const timeLabel = minutesToTime(minute);
        const slot = slotsByStart[timeLabel];

        return (
          <div key={timeLabel} className="cal-day-row">
            <div className="cal-time-label">{timeLabel}</div>
            <div className="cal-time-track">
              {slot ? (
                <SlotButton
                  slot={slot}
                  selected={selectedSlotId === slot._id}
                  onSelect={onSelectSlot}
                />
              ) : (
                <div className="cal-slot-empty" aria-hidden="true" />
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

function WeekBoard({ days, selectedSlotId, onSelectSlot, todayKey, onSelectDate }) {
  const hasAnySlot = days.some((day) => day.slots.length > 0);

  if (!hasAnySlot) {
    return (
      <CalendarEmptyState
        title="No slots this week"
        message="Appointment slots appear on days that match your weekly work shifts. Ask admin to generate slots from Work shifts, or check another week."
        onSwitchToWeek={null}
      />
    );
  }

  return (
    <div className="cal-week-board">
      {days.map((day) => {
        const hasSlots = day.slots.length > 0;

        return (
        <section
          key={day.date}
          className={`cal-week-col ${day.date === todayKey ? "is-today" : ""}${hasSlots ? " has-slots" : " is-empty"}`}
        >
          <header className="cal-week-head">
            <strong>{DAY_LABELS[day.dayOfWeek]}</strong>
            <span>{day.date.slice(5).replace("-", "/")}</span>
            {hasSlots && <em className="cal-week-head-count">{day.slots.length}</em>}
          </header>
          <div className="cal-week-slots">
            {!hasSlots ? (
              <button
                type="button"
                className="cal-week-col-empty"
                onClick={() => onSelectDate?.(day.date)}
                title="Open day view"
              >
                No slots
              </button>
            ) : (
              day.slots.map((slot) => (
                <button
                  key={slot._id}
                  type="button"
                  className={`cal-week-chip cal-slot-${slot.status} ${
                    selectedSlotId === slot._id ? "is-selected" : ""
                  }`}
                  onClick={() => onSelectSlot(slot._id)}
                >
                  <strong>
                    {slot.startTime}–{slot.endTime}
                  </strong>
                  <span>{slot.statusLabel}</span>
                </button>
              ))
            )}
          </div>
        </section>
        );
      })}
    </div>
  );
}

function SlotInspector({ slotDetail, detailLoading, statusUpdating, onClose, onBlock, onUnblock }) {
  const isPast = slotDetail?.isPast;

  return (
    <aside className="cal-inspector">
      <div className="cal-inspector-header">
        <h4>Slot detail</h4>
        <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
          Close
        </button>
      </div>

      {detailLoading || !slotDetail ? (
        <p className="cal-inspector-hint">Loading slot detail…</p>
      ) : (
        <>
          <dl className="cal-inspector-meta">
            <div>
              <dt>Date</dt>
              <dd>{slotDetail.date}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>
                {slotDetail.startTime} – {slotDetail.endTime}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`cal-status-pill cal-slot-${slotDetail.status}`}>
                  {slotDetail.statusLabel}
                </span>
              </dd>
            </div>
            {slotDetail.roomName && (
              <div>
                <dt>Room</dt>
                <dd>{slotDetail.roomName}</dd>
              </div>
            )}
          </dl>

          <div className="cal-inspector-actions">
            {isPast && (
              <p className="cal-inspector-hint">Past slots are read-only and cannot be blocked or unlocked.</p>
            )}
            {!isPast && slotDetail.status === "available" && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onBlock}
                disabled={statusUpdating}
              >
                {statusUpdating ? "Updating…" : "Block slot"}
              </button>
            )}
            {!isPast && slotDetail.status === "blocked" && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onUnblock}
                disabled={statusUpdating}
              >
                {statusUpdating ? "Updating…" : "Unblock slot"}
              </button>
            )}
            {slotDetail.status === "booked" && (
              <p className="cal-inspector-hint">Booked slots cannot be blocked or unlocked.</p>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

export default function DoctorScheduleCalendarPage() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [view, setView] = useState("week");
  const [calendar, setCalendar] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [slotDetail, setSlotDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState("");

  const range = useMemo(() => {
    return { start: startOfWeek(anchorDate), end: endOfWeek(anchorDate) };
  }, [anchorDate]);

  const activeDateKey = formatDateOnly(anchorDate);

  const todayKey = formatDateOnly(new Date());

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await DoctorApiClient.getSchedule({
        startDate: formatDateOnly(range.start),
        endDate: formatDateOnly(range.end),
        view,
      });
      setCalendar(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setCalendar(null);
    } finally {
      setLoading(false);
    }
  }, [range.end, range.start, view]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    if (!selectedSlotId) {
      setSlotDetail(null);
      return undefined;
    }

    let cancelled = false;
    async function loadDetail() {
      setDetailLoading(true);
      try {
        const { data } = await DoctorApiClient.getAppointmentSlot(selectedSlotId);
        if (!cancelled) setSlotDetail(data);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }
    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedSlotId]);

  const shiftRange = (amount) => {
    setAnchorDate((current) => addDays(current, view === "day" ? amount : amount * 7));
    setSelectedSlotId("");
  };

  const goToToday = () => {
    setAnchorDate(new Date());
    setSelectedSlotId("");
  };

  const jumpToDate = (dateKey) => {
    setAnchorDate(parseDateOnly(dateKey));
    setView("day");
    setSelectedSlotId("");
  };

  const refreshAfterStatusChange = async (data) => {
    setSlotDetail(data);
    await loadCalendar();
  };

  const onBlockSlot = async () => {
    if (!selectedSlotId) return;
    setStatusUpdating(true);
    setError("");
    try {
      const { data } = await DoctorApiClient.blockAppointmentSlot(selectedSlotId);
      await refreshAfterStatusChange(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setStatusUpdating(false);
    }
  };

  const onUnblockSlot = async () => {
    if (!selectedSlotId) return;
    setStatusUpdating(true);
    setError("");
    try {
      const { data } = await DoctorApiClient.unblockAppointmentSlot(selectedSlotId);
      await refreshAfterStatusChange(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setStatusUpdating(false);
    }
  };

  const daysToRender = calendar?.days || [];
  const activeDay = daysToRender.find((day) => day.date === activeDateKey) || null;
  const navLabel =
    view === "day"
      ? formatNavDate(anchorDate, "day", range.end)
      : formatNavDate(range.start, "week", range.end);

  return (
    <PageLayout dashboard>
      <DoctorLayout title="My calendar">
        <div className="card cal-shell">
          <div className="cal-toolbar">
            <div className="cal-segment" role="group" aria-label="Calendar view">
              <button
                type="button"
                className={`cal-segment-btn ${view === "day" ? "cal-segment-btn-active" : ""}`}
                onClick={() => setView("day")}
              >
                Day
              </button>
              <button
                type="button"
                className={`cal-segment-btn ${view === "week" ? "cal-segment-btn-active" : ""}`}
                onClick={() => setView("week")}
              >
                Week
              </button>
            </div>

            <div className="cal-date-nav">
              <button type="button" className="cal-nav-btn" onClick={() => shiftRange(-1)} aria-label="Previous">
                ‹
              </button>
              <button type="button" className="cal-date-label" onClick={goToToday} title="Go to today">
                {navLabel}
              </button>
              <button type="button" className="cal-nav-btn" onClick={() => shiftRange(1)} aria-label="Next">
                ›
              </button>
            </div>

            {calendar?.summary && (
              <div className="cal-legend" aria-label="Slot status legend">
                <span className="cal-legend-item">
                  <span className="cal-legend-dot cal-legend-dot-available" />
                  Available {calendar.summary.available}
                </span>
                <span className="cal-legend-item">
                  <span className="cal-legend-dot cal-legend-dot-booked" />
                  Booked {calendar.summary.booked}
                </span>
                <span className="cal-legend-item">
                  <span className="cal-legend-dot cal-legend-dot-blocked" />
                  Blocked {calendar.summary.blocked}
                </span>
              </div>
            )}
          </div>

          {error && <div className="alert alert-error" style={{ margin: "1rem" }}>{error}</div>}

          <div className={`cal-layout ${selectedSlotId ? "has-inspector" : ""}`}>
            <div className="cal-body">
              {loading ? (
                <div className="cal-loading">
                  <div className="loading-spinner" />
                  <p>Loading calendar…</p>
                </div>
              ) : view === "day" ? (
                <DayTimeline
                  day={activeDay}
                  weekDays={daysToRender}
                  activeDate={activeDateKey}
                  selectedSlotId={selectedSlotId}
                  onSelectSlot={setSelectedSlotId}
                  onSelectDate={jumpToDate}
                  onSwitchToWeek={() => setView("week")}
                />
              ) : (
                <WeekBoard
                  days={daysToRender}
                  selectedSlotId={selectedSlotId}
                  onSelectSlot={setSelectedSlotId}
                  todayKey={todayKey}
                  onSelectDate={jumpToDate}
                />
              )}
            </div>

            {selectedSlotId && (
              <SlotInspector
                slotDetail={slotDetail}
                detailLoading={detailLoading}
                statusUpdating={statusUpdating}
                onClose={() => setSelectedSlotId("")}
                onBlock={onBlockSlot}
                onUnblock={onUnblockSlot}
              />
            )}
          </div>
        </div>
      </DoctorLayout>
    </PageLayout>
  );
}
