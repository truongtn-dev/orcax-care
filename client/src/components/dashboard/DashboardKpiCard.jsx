export default function DashboardKpiCard({ label, value, hint, tone = "cyan", icon, loading = false }) {
  return (
    <article className={`dash-kpi-card dash-kpi-card--${tone}`}>
      {loading ? (
        <>
          <span className="dash-kpi-icon dash-kpi-icon--loading" aria-hidden="true" />
          <div className="dash-kpi-body">
            <span className="dash-kpi-label">Loading…</span>
            <span className="dash-kpi-value">—</span>
          </div>
        </>
      ) : (
        <>
          {icon ? (
            <span className="dash-kpi-icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <div className="dash-kpi-body">
            <span className="dash-kpi-label">{label}</span>
            <span className="dash-kpi-value">{value}</span>
            {hint ? <span className="dash-kpi-hint">{hint}</span> : null}
          </div>
        </>
      )}
    </article>
  );
}
