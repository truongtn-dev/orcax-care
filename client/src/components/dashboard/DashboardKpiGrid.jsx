import DashboardKpiCard from "./DashboardKpiCard.jsx";

export default function DashboardKpiGrid({ items = [], loading = false, columns = 4 }) {
  const placeholders = Array.from({ length: columns }, (_, index) => ({ key: `loading-${index}` }));

  return (
    <div className={`dash-kpi-grid dash-kpi-grid--cols-${columns}`}>
      {(loading ? placeholders : items).map((item, index) => (
        <DashboardKpiCard
          key={item.key || index}
          label={item.label}
          value={item.value}
          hint={item.hint}
          tone={item.tone}
          icon={item.icon}
          loading={loading}
        />
      ))}
    </div>
  );
}
