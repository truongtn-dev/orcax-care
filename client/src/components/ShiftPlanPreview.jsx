import "./ShiftPlanPreview.css";

function formatSlotLabel(slot) {
  return `${slot.startTime} – ${slot.endTime}`;
}

export default function ShiftPlanPreview({
  preview,
  loading = false,
  title = "Shift plan preview",
  emptyMessage = "Set shift times to preview appointment slots.",
}) {
  if (loading) {
    return (
      <div className="shift-plan-preview shift-plan-preview--loading" aria-live="polite">
        <h3>{title}</h3>
        <p className="shift-plan-preview-loading">Calculating slot plan…</p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="shift-plan-preview shift-plan-preview--empty" aria-live="polite">
        <h3>{title}</h3>
        <p className="shift-plan-preview-empty">{emptyMessage}</p>
      </div>
    );
  }

  const { valid, issues = [], plan, dayLabel } = preview;
  const slotTimes = plan?.slotTimes || [];

  return (
    <div className="shift-plan-preview" aria-live="polite">
      <h3>{title}</h3>
      {!valid && issues.length > 0 && (
        <ul className="shift-plan-preview-issues">
          {issues.map((issue) => (
            <li key={issue.code}>{issue.message}</li>
          ))}
        </ul>
      )}
      {plan && (
        <dl className="shift-plan-preview-grid">
          <div>
            <dt>Day</dt>
            <dd>{dayLabel || "—"}</dd>
          </div>
          <div>
            <dt>Slot duration</dt>
            <dd>{plan.slotDurationMin} min</dd>
          </div>
          <div>
            <dt>Slots per shift</dt>
            <dd>{plan.slotCount}</dd>
          </div>
          <div>
            <dt>Shift utilization</dt>
            <dd>{plan.utilizationPercent}%</dd>
          </div>
        </dl>
      )}
      {slotTimes.length > 0 && (
        <div className="shift-plan-preview-slots">
          <div className="shift-plan-preview-slots-head">
            <span className="shift-plan-preview-slots-label">Appointment slots</span>
            <span className="shift-plan-preview-slots-count">{slotTimes.length}</span>
          </div>
          <ul className="shift-plan-preview-slot-list">
            {slotTimes.map((slot, index) => (
              <li key={`${slot.startTime}-${slot.endTime}-${index}`}>
                <span className="shift-plan-preview-slot-chip">{formatSlotLabel(slot)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {valid && (
        <p className="shift-plan-preview-ok">No doctor overlap or room conflict detected.</p>
      )}
    </div>
  );
}
