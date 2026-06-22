import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import StaffLayout from "../components/StaffLayout.jsx";
import DashboardKpiGrid from "../components/dashboard/DashboardKpiGrid.jsx";
import DashboardBarChart from "../components/dashboard/DashboardBarChart.jsx";
import AppIcon from "../components/icons/AppIcon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { StaffApiClient } from "../services/staffApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./StaffDashboardPage.css";

export default function StaffDashboardPage() {
  const { fullName } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await StaffApiClient.getDashboard();
      setDashboard(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const kpis = useMemo(() => {
    if (!dashboard) return [];
    return [
      {
        key: "medicines",
        tone: "cyan",
        label: "Medicines",
        value: dashboard.medicineCount ?? 0,
        hint: "Active SKUs in inventory",
        icon: <AppIcon name="pill" />,
      },
      {
        key: "low-stock",
        tone: dashboard.lowStockCount > 0 ? "amber" : "emerald",
        label: "Low stock",
        value: dashboard.lowStockCount ?? 0,
        hint: dashboard.lowStockCount > 0 ? "Needs replenishment" : "All above minimum",
        icon: <AppIcon name="alert-triangle" />,
      },
      {
        key: "inbound",
        tone: "teal",
        label: "Inbound today",
        value: dashboard.inboundToday ?? 0,
        hint: "Deliveries recorded today",
        icon: <AppIcon name="package-plus" />,
      },
      {
        key: "doctors",
        tone: "violet",
        label: "Doctor lookup",
        value: "Search",
        hint: "Assist patients at reception",
        icon: <AppIcon name="stethoscope" />,
      },
    ];
  }, [dashboard]);

  const pageDescription = loading
    ? "Loading pharmacy and front-desk metrics…"
    : `${dashboard?.medicineCount ?? 0} medicines tracked · ${dashboard?.lowStockCount ?? 0} low-stock alerts`;

  return (
    <PageLayout dashboard>
      <StaffLayout
        title={`Hello${fullName ? `, ${fullName.split(" ")[0]}` : ""}`}
        description={pageDescription}
        actions={
          <>
            <Link to="/staff/pharmacy" className="btn btn-primary btn-sm">
              Pharmacy
            </Link>
            <Link to="/search-doctors" className="btn btn-outline btn-sm">
              Find doctors
            </Link>
          </>
        }
      >
        <div className="staff-dashboard dash-page-stack">
          {error && <div className="alert alert-error">{error}</div>}

          <DashboardKpiGrid items={kpis} loading={loading} columns={4} />

          <div className="dash-charts-row">
            <DashboardBarChart
              title="Stock on hand"
              description="Current quantity by medicine code"
              data={dashboard?.stockChart || []}
              loading={loading}
              emptyMessage="No medicines in inventory."
              valueFormatter={(value, point) => point.title || `${point.label}: ${value}`}
            />
            <DashboardBarChart
              title="Inbound trend (7 days)"
              description="Total units received per day"
              data={(dashboard?.inboundTrend || []).map((point) => ({
                ...point,
                title: `${point.date}: ${point.value} units · ${point.movements} movement${point.movements === 1 ? "" : "s"}`,
              }))}
              loading={loading}
              emptyMessage="No inbound deliveries in the last 7 days."
              barClassName="dash-chart-bar--cyan"
            />
          </div>

          <div className="staff-dashboard-main">
            <section className="card staff-dashboard-panel">
              <header className="staff-dashboard-panel-head">
                <div>
                  <h2>Low-stock watchlist</h2>
                  <p>Medicines at or below minimum level.</p>
                </div>
                <Link to="/staff/pharmacy" className="btn btn-outline btn-sm">
                  Record inbound
                </Link>
              </header>
              {loading ? (
                <p className="staff-dashboard-empty">Loading inventory alerts…</p>
              ) : dashboard?.lowStockItems?.length ? (
                <ul className="staff-dashboard-alert-list">
                  {dashboard.lowStockItems.map((medicine) => (
                    <li key={medicine._id}>
                      <div>
                        <strong>{medicine.name}</strong>
                        <span>{medicine.code}</span>
                      </div>
                      <span className="staff-dashboard-alert-qty">
                        {medicine.stockQty} / min {medicine.minStockLevel} {medicine.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="staff-dashboard-empty">All medicines are above minimum stock levels.</p>
              )}
            </section>

            <section className="card staff-dashboard-panel staff-dashboard-quick">
              <h2>Quick links</h2>
              <nav className="staff-dashboard-quick-nav" aria-label="Staff quick links">
                <Link to="/staff/pharmacy" className="staff-dashboard-quick-link">
                  <span>Pharmacy inventory</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link to="/search-doctors" className="staff-dashboard-quick-link">
                  <span>Find doctors</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link to="/profile" className="staff-dashboard-quick-link">
                  <span>Edit profile</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link to="/change-password" className="staff-dashboard-quick-link">
                  <span>Change password</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </nav>
            </section>
          </div>
        </div>
      </StaffLayout>
    </PageLayout>
  );
}
