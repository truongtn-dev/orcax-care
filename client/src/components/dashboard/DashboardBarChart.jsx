export default function DashboardBarChart({
  title,
  description,
  emptyMessage = "No data in this period.",
  data = [],
  loading = false,
  valueFormatter,
  barClassName = "",
  embedded = false,
}) {
  const maxValue = Math.max(...data.map((point) => point.value || 0), 1);

  return (
    <section className={`dash-chart-panel ${embedded ? "dash-chart-panel--embedded" : "card"}`}>
      <header className="dash-chart-head">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {!loading && data.length === 0 ? <p className="dash-chart-empty-inline">{emptyMessage}</p> : null}
      </header>

      {loading ? (
        <div className="dash-chart-loading">Loading chart…</div>
      ) : data.length > 0 ? (
        <div className="dash-chart-bars" role="img" aria-label={title}>
          {data.map((point) => {
            const heightPct = Math.max(6, ((point.value || 0) / maxValue) * 100);
            const titleText =
              point.title ||
              (valueFormatter ? valueFormatter(point.value, point) : `${point.label}: ${point.value ?? 0}`);

            return (
              <div key={point.key || point.label} className="dash-chart-bar-wrap">
                <div
                  className={`dash-chart-bar ${barClassName} ${point.tone ? `dash-chart-bar--${point.tone}` : ""}`.trim()}
                  style={{ height: `${heightPct}%` }}
                  title={titleText}
                />
                <span className="dash-chart-bar-label">{point.label}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dash-chart-empty">{emptyMessage}</div>
      )}
    </section>
  );
}
