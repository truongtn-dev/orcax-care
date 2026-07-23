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

const REFRESH_MS = 60_000;

export default function StaffDashboardPage() {
  const { fullName } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const { data } = await StaffApiClient.getDashboard();
      setDashboard(data);
      setLastRefreshedAt(data?.operations?.refreshedAt || new Date().toISOString());
    } catch (err) {
      if (!silent) {
        setError(getApiErrorMessage(err));
        setDashboard(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(() => {
      loadDashboard({ silent: true });
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadDashboard]);

  const ops = dashboard?.operations;

  const kpis = useMemo(() => {
    if (!dashboard) return [];
    return [
      {
        key: "checkins",
        tone: "cyan",
        label: "Today check-ins",
        value: ops?.todayCheckIns ?? 0,
        hint: "Patients checked in today",
        icon: <AppIcon name="list" />,
      },
      {
        key: "waiting",
        tone: (ops?.waitingQueueCount ?? 0) > 0 ? "amber" : "emerald",
        label: "Waiting queue",
        value: ops?.waitingQueueCount ?? 0,
        hint: "Tickets waiting in open sessions",
        icon: <AppIcon name="users" />,
      },
      {
        key: "complaints",
        tone: (ops?.openComplaints ?? 0) > 0 ? "amber" : "teal",
        label: "Open complaints",
        value: ops?.openComplaints ?? 0,
        hint: "Open or in progress",
        icon: <AppIcon name="alert-triangle" />,
      },
      {
        key: "low-stock",
        tone: (ops?.lowStockCount ?? dashboard.lowStockCount ?? 0) > 0 ? "amber" : "emerald",
        label: "Low stock",
        value: ops?.lowStockCount ?? dashboard.lowStockCount ?? 0,
        hint: "Below reorder level",
        icon: <AppIcon name="pill" />,
      },
    ];
  }, [dashboard, ops]);

  const pageDescription = loading
    ? "Loading front-desk and pharmacy operations…"
    : `Ops widgets refresh every 60s${lastRefreshedAt ? ` · updated ${new Date(lastRefreshedAt).toLocaleTimeString()}` : ""}`;

  return (
    <PageLayout dashboard>
      <StaffLayout
        title={`Hello${fullName ? `, ${fullName.split(" ")[0]}` : ""}`}
        description={pageDescription}
        actions={
          <>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => loadDashboard()} disabled={loading}>
              Refresh
            </button>
            <Link to="/staff/checkin" className="btn btn-primary btn-sm">
              Check-in
            </Link>
            <Link to="/staff/pharmacy" className="btn btn-outline btn-sm">
              Pharmacy
            </Link>
          </>
        }
      >
        <div className="staff-dashboard dash-page-stack">
          {error && <div className="alert alert-error">{error}</div>}

          <DashboardKpiGrid items={kpis} loading={loading} columns={4} />

          <div className="dash-charts-row">
            <DashboardBarChart
              title="Stock levels"
              description="On-hand quantity by medicine code"
              data={dashboard?.stockChart || []}
              loading={loading}
              emptyMessage="No medicines in inventory."
            />
            <DashboardBarChart
              title="Inbound (7 days)"
              description="Units received per day"
              data={(dashboard?.inboundTrend || []).map((point) => ({
                key: point.date,
                label: point.label,
                value: point.value,
                title: `${point.date}: ${point.value} units · ${point.movements} movements`,
              }))}
              loading={loading}
              emptyMessage="No inbound movements yet."
            />
          </div>

          <div className="staff-dashboard-main">
            <section className="card staff-dashboard-panel">
              <header className="staff-dashboard-panel-head">
                <div>
                  <h2>Urgency alerts</h2>
                  <p>Low stock and near-expiry ranked by urgency.</p>
                </div>
                <Link to="/staff/pharmacy?lowStockOnly=1" className="btn btn-outline btn-sm">
                  Open pharmacy
                </Link>
              </header>
              {loading ? (
                <p className="staff-dashboard-empty">Loading inventory alerts…</p>
              ) : dashboard?.urgencyAlerts?.length ? (
                <ul className="staff-dashboard-alert-list">
                  {dashboard.urgencyAlerts.slice(0, 12).map((alert, index) => (
                    <li key={`${alert.type}-${alert.medicine?._id || index}-${alert.batchNo || ""}`}>
                      <div>
                        {alert.medicine?._id ? (
                          <Link
                            to={`/staff/pharmacy/medicines/${alert.medicine._id}`}
                            className="table-link"
                          >
                            <strong>{alert.medicine?.name || "Medicine"}</strong>
                          </Link>
                        ) : (
                          <strong>{alert.medicine?.name || "Medicine"}</strong>
                        )}
                        <span>
                          {alert.type === "near_expiry" ? "Near expiry" : "Low stock"}
                          {alert.batchNo ? ` · batch ${alert.batchNo}` : ""}
                        </span>
                      </div>
                      <span className="staff-dashboard-alert-qty">
                        {alert.type === "near_expiry"
                          ? `Expires ${alert.expiryDate}`
                          : `${alert.medicine?.stockQty} / min ${alert.medicine?.minStockLevel}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : dashboard?.lowStockItems?.length ? (
                <ul className="staff-dashboard-alert-list">
                  {dashboard.lowStockItems.map((medicine) => (
                    <li key={medicine._id}>
                      <div>
                        <Link to={`/staff/pharmacy/medicines/${medicine._id}`} className="table-link">
                          <strong>{medicine.name}</strong>
                        </Link>
                        <span>{medicine.code}</span>
                      </div>
                      <span className="staff-dashboard-alert-qty">
                        {medicine.stockQty} / min {medicine.minStockLevel} {medicine.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="staff-dashboard-empty">No urgent stock or expiry alerts.</p>
              )}
            </section>

            <section className="card staff-dashboard-panel staff-dashboard-quick">
              <h2>Quick links</h2>
              <nav className="staff-dashboard-quick-nav" aria-label="Staff quick links">
                <Link to="/staff/checkin" className="staff-dashboard-quick-link">
                  <span>Queue check-in</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link to="/staff/pharmacy" className="staff-dashboard-quick-link">
                  <span>Pharmacy inventory</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link to="/staff/pharmacy?lowStockOnly=1" className="staff-dashboard-quick-link">
                  <span>Low-stock alerts</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link to="/search-doctors" className="staff-dashboard-quick-link">
                  <span>Find doctors</span>
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
