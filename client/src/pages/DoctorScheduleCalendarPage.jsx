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

function DayTimeline({ day, selectedSlotId, onSelectSlot }) {
  const slots = day?.slots || [];
  const timeAxis = useMemo(() => buildTimeAxis(slots), [slots]);
  const slotsByStart = useMemo(
    () => Object.fromEntries(slots.map((slot) => [slot.startTime, slot])),
    [slots],
  );

  if (!slots.length) {
    return (
      <div className="cal-empty">
        <h3>No slots on this day</h3>
        <p>Appointment slots will appear here once admin generates them from your work shifts.</p>
        <Link to="/doctor/work-shifts" className="btn btn-secondary btn-sm">
          View work shifts
        </Link>
      </div>
    );
  }

  return (
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
  );
}

function WeekBoard({ days, selectedSlotId, onSelectSlot, todayKey }) {
  const hasAnySlot = days.some((day) => day.slots.length > 0);

  if (!hasAnySlot) {
    return (
      <div className="cal-empty">
        <h3>No slots this week</h3>
        <p>When slots are generated, they will show up as compact chips in each day column.</p>
        <Link to="/doctor/work-shifts" className="btn btn-secondary btn-sm">
          View work shifts
        </Link>
      </div>
    );
  }

  return (
    <div className="cal-week-board">
      {days.map((day) => (
        <section
          key={day.date}
          className={`cal-week-col ${day.date === todayKey ? "is-today" : ""}`}
        >
          <header className="cal-week-head">
            <strong>{DAY_LABELS[day.dayOfWeek]}</strong>
            <span>{day.date.slice(5).replace("-", "/")}</span>
          </header>
          <div className="cal-week-slots">
            {!day.slots.length ? (
              <p className="cal-week-col-empty">—</p>
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
      ))}
    </div>
  );
}

function SlotInspector({ slotDetail, detailLoading, statusUpdating, onClose, onBlock, onUnblock }) {
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
            {slotDetail.status === "available" && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onBlock}
                disabled={statusUpdating}
              >
                {statusUpdating ? "Updating…" : "Block slot"}
              </button>
            )}
            {slotDetail.status === "blocked" && (
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
  const [view, setView] = useState("day");
  const [calendar, setCalendar] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [slotDetail, setSlotDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState("");

  const range = useMemo(() => {
    if (view === "day") {
      const day = new Date(anchorDate);
      day.setHours(0, 0, 0, 0);
      return { start: day, end: day };
    }
    return { start: startOfWeek(anchorDate), end: endOfWeek(anchorDate) };
  }, [anchorDate, view]);

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

  const daysToRender =
    view === "day"
      ? calendar?.days?.filter((day) => day.date === formatDateOnly(range.start)) || []
      : calendar?.days || [];

  const activeDay = daysToRender[0] || null;
  const navLabel = formatNavDate(range.start, view, range.end);

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
                  selectedSlotId={selectedSlotId}
                  onSelectSlot={setSelectedSlotId}
                />
              ) : (
                <WeekBoard
                  days={daysToRender}
                  selectedSlotId={selectedSlotId}
                  onSelectSlot={setSelectedSlotId}
                  todayKey={todayKey}
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
