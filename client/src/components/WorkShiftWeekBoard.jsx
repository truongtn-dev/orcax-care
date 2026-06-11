import { Link } from "react-router-dom";
import "./WorkShiftWeekBoard.css";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shiftDurationMinutes(shift) {
  const [sh, sm] = shift.startTime.split(":").map(Number);
  const [eh, em] = shift.endTime.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

function ShiftCard({ shift, showDoctor, editHref }) {
  const duration = formatDuration(shiftDurationMinutes(shift));

  return (
    <article className={`ws-shift-card ${shift.isActive === false ? "is-inactive" : ""}`}>
      <div className="ws-shift-time">
        {shift.startTime} – {shift.endTime}
      </div>
      {showDoctor && shift.doctorName && (
        <div className="ws-shift-line">
          <strong>{shift.doctorName}</strong>
        </div>
      )}
      {shift.roomName && <div className="ws-shift-line">{shift.roomName}</div>}
      <div className="ws-shift-line">
        Max {shift.maxPatients} · {shift.slotDurationMin} min/slot · {duration}
      </div>
      <div className="ws-shift-footer">
        <span className="ws-shift-badge">
          {shift.isActive === false ? "Inactive" : "Active"}
        </span>
        {editHref && (
          <Link to={editHref} className="ws-shift-edit">
            Edit
          </Link>
        )}
      </div>
    </article>
  );
}

export default function WorkShiftWeekBoard({
  weeklyPattern = [],
  total = 0,
  loading = false,
  showDoctor = false,
  editHrefPrefix = "",
  toolbar = null,
  emptyTitle = "No work shifts",
  emptyDescription = "Weekly shift templates will appear here once created.",
  emptyAction = null,
}) {
  const todayDow = new Date().getDay();
  const patternByDay = Object.fromEntries(weeklyPattern.map((day) => [day.dayOfWeek, day]));
  const activeCount = weeklyPattern.reduce(
    (sum, day) => sum + (day.shifts?.filter((s) => s.isActive !== false).length || 0),
    0,
  );
  const totalMinutes = weeklyPattern
    .flatMap((day) => day.shifts || [])
    .reduce((sum, shift) => sum + shiftDurationMinutes(shift), 0);

  const hasShifts = total > 0 || weeklyPattern.some((day) => day.shifts?.length > 0);

  return (
    <div className="card ws-shell">
      {(toolbar || hasShifts) && (
        <div className="ws-toolbar">
          {toolbar || <span />}
          {hasShifts && !loading && (
            <div className="ws-stats" aria-label="Shift summary">
              <span className="ws-stat">
                <strong>{total || activeCount}</strong> templates
              </span>
              <span className="ws-stat">
                <strong>{formatDuration(totalMinutes)}</strong> / week
              </span>
            </div>
          )}
        </div>
      )}

      <div className="ws-body">
        {loading ? (
          <div className="ws-loading">
            <div className="loading-spinner" />
            <p>Loading work shifts…</p>
          </div>
        ) : !hasShifts ? (
          <div className="ws-empty">
            <h3>{emptyTitle}</h3>
            <p>{emptyDescription}</p>
            {emptyAction}
          </div>
        ) : (
          <div className="ws-week-board">
            {DAY_ORDER.map((dayOfWeek) => {
              const day = patternByDay[dayOfWeek];
              return (
                <section
                  key={dayOfWeek}
                  className={`ws-week-col ${dayOfWeek === todayDow ? "is-today" : ""}`}
                >
                  <header className="ws-week-head">
                    <strong>{day?.dayLabel || DAY_SHORT[dayOfWeek]}</strong>
                    <span>{day?.shifts?.length ? `${day.shifts.length} shift${day.shifts.length === 1 ? "" : "s"}` : "Off"}</span>
                  </header>
                  <div className="ws-week-slots">
                    {!day?.shifts?.length ? (
                      <p className="ws-week-off">—</p>
                    ) : (
                      day.shifts.map((shift) => (
                        <ShiftCard
                          key={shift._id}
                          shift={shift}
                          showDoctor={showDoctor}
                          editHref={editHrefPrefix ? `${editHrefPrefix}/${shift._id}/edit` : ""}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
