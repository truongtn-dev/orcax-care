import "./ShiftPlanPreview.css";

export default function ShiftPlanPreview({ preview, title = "Shift plan preview" }) {
  if (!preview) return null;

  const { valid, issues = [], plan, dayLabel } = preview;

  return (
    <aside className="shift-plan-preview" aria-live="polite">
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
      {plan?.slotTimes?.length > 0 && (
        <p className="shift-plan-preview-times">
          Sample times:{" "}
          {plan.slotTimes
            .slice(0, 4)
            .map((slot) => `${slot.startTime}–${slot.endTime}`)
            .join(", ")}
          {plan.slotTimes.length > 4 ? "…" : ""}
        </p>
      )}
      {valid && (
        <p className="shift-plan-preview-ok">No doctor overlap or room conflict detected.</p>
      )}
    </aside>
  );
}
