import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { DoctorApiClient } from "../services/doctorApi.js";
import { getApiErrorMessage } from "../services/api.js";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

export default function DoctorScheduleCalendarPage() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [view, setView] = useState("week");
  const [calendar, setCalendar] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [slotDetail, setSlotDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const range = useMemo(() => {
    if (view === "day") {
      const day = new Date(anchorDate);
      day.setHours(0, 0, 0, 0);
      return { start: day, end: day };
    }
    return { start: startOfWeek(anchorDate), end: endOfWeek(anchorDate) };
  }, [anchorDate, view]);

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

  const daysToRender =
    view === "day"
      ? calendar?.days?.filter((day) => day.date === formatDateOnly(range.start)) || []
      : calendar?.days || [];

  return (
    <PageLayout>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Schedule calendar</h1>
            <p>Review appointment slots by week or day. Colors show available, booked, and blocked slots.</p>
          </div>
          <Link to="/doctor" className="btn btn-secondary">
            Back to dashboard
          </Link>
        </div>
      </div>

      <div className="card schedule-toolbar">
        <div className="schedule-toolbar-row">
          <div className="schedule-view-toggle">
            <button
              type="button"
              className={`btn btn-sm ${view === "week" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setView("week")}
            >
              Week
            </button>
            <button
              type="button"
              className={`btn btn-sm ${view === "day" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setView("day")}
            >
              Day
            </button>
          </div>
          <div className="schedule-nav">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => shiftRange(-1)}>
              Previous
            </button>
            <strong>
              {formatDateOnly(range.start)}
              {view === "week" ? ` – ${formatDateOnly(range.end)}` : ""}
            </strong>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => shiftRange(1)}>
              Next
            </button>
          </div>
        </div>

        {calendar?.summary && (
          <div className="schedule-legend">
            <span className="schedule-legend-item schedule-legend-available">
              Available {calendar.summary.available}
            </span>
            <span className="schedule-legend-item schedule-legend-booked">
              Booked {calendar.summary.booked}
            </span>
            <span className="schedule-legend-item schedule-legend-blocked">
              Blocked {calendar.summary.blocked}
            </span>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p>Loading calendar…</p>
      ) : (
        <div className={`schedule-calendar-grid ${view === "day" ? "schedule-calendar-day" : ""}`}>
          {daysToRender.map((day) => (
            <section key={day.date} className="schedule-day-column card">
              <header className="schedule-day-header">
                <h3>{DAY_LABELS[day.dayOfWeek]}</h3>
                <span>{day.date}</span>
              </header>
              {!day.slots.length ? (
                <p className="schedule-day-empty">No slots</p>
              ) : (
                <ul className="schedule-slot-list">
                  {day.slots.map((slot) => (
                    <li key={slot._id}>
                      <button
                        type="button"
                        className={`schedule-slot schedule-slot-${slot.status} ${
                          selectedSlotId === slot._id ? "is-selected" : ""
                        }`}
                        onClick={() => setSelectedSlotId(slot._id)}
                      >
                        <strong>
                          {slot.startTime} – {slot.endTime}
                        </strong>
                        <span>{slot.statusLabel}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {selectedSlotId && (
        <div className="card schedule-slot-detail">
          <div className="schedule-slot-detail-header">
            <h3>Slot detail</h3>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setSelectedSlotId("")}
            >
              Close
            </button>
          </div>
          {detailLoading || !slotDetail ? (
            <p>Loading slot detail…</p>
          ) : (
            <dl className="detail-list">
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
                  <span className={`schedule-status-pill schedule-slot-${slotDetail.status}`}>
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
              <div>
                <dt>Shift template</dt>
                <dd>{slotDetail.workShiftId}</dd>
              </div>
            </dl>
          )}
        </div>
      )}
    </PageLayout>
  );
}
