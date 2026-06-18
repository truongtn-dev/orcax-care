import { useState, useEffect, useCallback } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import "./AdminDashboardPage.css";
import PageLayout from "../components/PageLayout.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { AdminApiClient } from "../services/adminApi.js";
import { PublicApiClient } from "../services/publicApi.js";
import { useAuth } from "../context/AuthContext.jsx";

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultDashboardPeriod() {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

const DEFAULT_DASHBOARD_PERIOD = defaultDashboardPeriod();

const OVERVIEW_STATS = [
  {
    key: "accounts",
    label: "Accounts",
    to: "/admin/account",
    theme: "cyan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "doctors",
    label: "Doctors",
    to: "/admin/doctors",
    theme: "violet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M11 2v2M5 2v2" />
        <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
        <path d="M8 15a6 6 0 0 0 12 0v-2" />
      </svg>
    ),
  },
  {
    key: "patients",
    label: "Patients",
    to: "/admin/patients",
    theme: "emerald",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
  },
  {
    key: "specialties",
    label: "Specialties",
    to: "/admin/specialty",
    theme: "sky",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 2v4" />
        <path d="m6 8 3-3 3 3" />
        <path d="M9 5v6a3 3 0 0 0 6 0V5" />
        <path d="M6 21h12" />
        <path d="M8 21v-4h8v4" />
      </svg>
    ),
  },
  {
    key: "rooms",
    label: "Clinic rooms",
    to: "/admin/clinic-room",
    theme: "amber",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <path d="M9 9h1" />
        <path d="M9 13h1" />
        <path d="M9 17h1" />
      </svg>
    ),
  },
  {
    key: "departments",
    label: "Departments",
    to: "/admin?tab=departments",
    theme: "indigo",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 2 2 7l10 5 10-5-10-5Z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
];

const ADMIN_SHORTCUTS = [
  {
    group: "People",
    theme: "cyan",
    sectionIcon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    items: [
      {
        to: "/admin/account",
        title: "Account list",
        description: "Logins, roles, lock status, and verification.",
        badge: "IAM",
        theme: "cyan",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ),
      },
      {
        to: "/admin/staff",
        title: "Staff",
        description: "Support and reception accounts for front desk.",
        badge: "Support",
        theme: "cyan",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 11v2a4 4 0 0 1-4 4h-1" />
            <path d="M16 11h6" />
          </svg>
        ),
      },
      {
        to: "/admin/patients",
        title: "Patients",
        description: "Demographics, emergency contacts, and records.",
        badge: "Records",
        theme: "emerald",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        ),
      },
      {
        to: "/admin/doctors",
        title: "Doctors",
        description: "Licenses, specialties, departments, CSV export.",
        badge: "Clinical",
        theme: "violet",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M11 2v2M5 2v2" />
            <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
            <path d="M8 15a6 6 0 0 0 12 0v-2" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "Master data",
    theme: "sky",
    sectionIcon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
        <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
      </svg>
    ),
    items: [
      {
        to: "/admin/specialty",
        title: "Specialties",
        description: "Clinical codes, names, and active catalog.",
        badge: "Catalog",
        theme: "sky",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 2v4" />
            <path d="m6 8 3-3 3 3" />
            <path d="M9 5v6a3 3 0 0 0 6 0V5" />
            <path d="M6 21h12" />
          </svg>
        ),
      },
      {
        to: "/admin/clinic-room",
        title: "Clinic rooms",
        description: "Room numbers, specialty assignment, maintenance.",
        badge: "Facilities",
        theme: "amber",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M3 21h18" />
            <path d="M5 21V7l8-4v18" />
            <path d="M19 21V11l-6-4" />
          </svg>
        ),
      },
      {
        to: "/admin?tab=departments",
        title: "Departments",
        description: "Org units, locations, and doctor headcount.",
        badge: "Org",
        theme: "indigo",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 2 2 7l10 5 10-5-10-5Z" />
            <path d="M2 17l10 5 10-5" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "Scheduling",
    theme: "rose",
    sectionIcon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M8 2v4M16 2v4" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01" />
      </svg>
    ),
    items: [
      {
        to: "/admin/work-shifts",
        title: "Work shifts",
        description: "Weekly board for every doctor's shifts.",
        badge: "Shifts",
        theme: "rose",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        ),
      },
      {
        to: "/admin/appointment-slots/generate",
        title: "Generate slots",
        description: "Bulk-create bookable slots from shifts.",
        badge: "Slots",
        theme: "teal",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 3v3" />
            <path d="m8 5 1.5 2.5" />
            <path d="m16 5-1.5 2.5" />
            <path d="M12 21v-3" />
            <path d="m8 19 1.5-2.5" />
            <path d="m16 19-1.5-2.5" />
            <rect x="5" y="9" width="14" height="8" rx="2" />
            <path d="M9 13h6" />
            <path d="M12 11v4" />
          </svg>
        ),
      },
    ],
  },
];

export default function AdminDashboardPage() {
  const { fullName } = useAuth();
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab = rawTab || "overview";

  const [departments, setDepartments] = useState([]);
  const [deptSort, setDeptSort] = useState({ key: "name", direction: "asc" });
  const [overviewStats, setOverviewStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardFrom, setDashboardFrom] = useState(DEFAULT_DASHBOARD_PERIOD.from);
  const [dashboardTo, setDashboardTo] = useState(DEFAULT_DASHBOARD_PERIOD.to);
  const [dashboardDoctorId, setDashboardDoctorId] = useState("");
  const [doctorFilterOptions, setDoctorFilterOptions] = useState([]);
  const [allDoctorsForCount, setAllDoctorsForCount] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "success", message: "" });
  const setError = (msg) => {
    if (!msg) return;
    setToast({ show: true, type: "error", message: msg });
    setTimeout(() => {
      setToast(prev => prev.message === msg ? { show: false, type: "error", message: "" } : prev);
    }, 4500);
  };
  const setSuccess = (msg) => {
    if (!msg) return;
    setToast({ show: true, type: "success", message: msg });
    setTimeout(() => {
      setToast(prev => prev.message === msg ? { show: false, type: "success", message: "" } : prev);
    }, 4500);
  };

  
  
  
  const loadDepartments = useCallback(async () => {
    try {
      const { data } = await PublicApiClient.getDepartments();
      setDepartments(data.items || []);
    } catch (err) {
      console.error("Failed to load departments:", err);
    }
  }, []);

  const handleDeptSort = (key) => {
    setDeptSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const params = { from: dashboardFrom, to: dashboardTo };
      if (dashboardDoctorId) params.doctorId = dashboardDoctorId;
      const { data } = await AdminApiClient.getDashboard(params);
      setDashboardData(data);
    } catch (err) {
      console.error("Failed to load dashboard KPIs:", err);
      setDashboardData(null);
    } finally {
      setDashboardLoading(false);
    }
  }, [dashboardFrom, dashboardTo, dashboardDoctorId]);

  const loadDoctorFilterOptions = useCallback(async () => {
    try {
      const { data } = await AdminApiClient.listDoctors({ limit: 200, isActive: true });
      setDoctorFilterOptions(data.items || []);
    } catch (err) {
      console.error("Failed to load doctors for dashboard filter:", err);
      setDoctorFilterOptions([]);
    }
  }, []);

  const loadOverviewStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [accountsRes, doctorsRes, patientsRes, specialtiesRes, roomsRes, deptRes] = await Promise.all([
        AdminApiClient.listAccounts({ limit: 1 }),
        AdminApiClient.listDoctors({ limit: 1 }),
        AdminApiClient.getPatients({ limit: 1 }),
        AdminApiClient.listSpecialties({ limit: 1 }),
        AdminApiClient.listClinicRooms({ limit: 1 }),
        PublicApiClient.getDepartments(),
      ]);
      setOverviewStats({
        accounts: accountsRes.data.total,
        doctors: doctorsRes.data.total,
        patients: patientsRes.data.total,
        specialties: specialtiesRes.data.total,
        rooms: roomsRes.data.total,
        departments: (deptRes.data.items || []).length,
      });
    } catch (err) {
      console.error("Failed to load overview stats:", err);
      setOverviewStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadAllDoctorsForCount = async () => {
    try {
      const { data } = await AdminApiClient.listDoctors({ limit: 1000 });
      setAllDoctorsForCount(data.items || []);
    } catch (err) {
      console.error("Failed to load doctors for count:", err);
    }
  };

  useEffect(() => {
    setError("");
    setSuccess("");
    if (activeTab === "overview") {
      loadOverviewStats();
      loadDashboard();
      loadDoctorFilterOptions();
    } else if (activeTab === "departments") {
      setLoading(true);
      Promise.all([loadDepartments(), loadAllDoctorsForCount()]).finally(() => setLoading(false));
    }
  }, [activeTab, loadOverviewStats, loadDepartments, loadDashboard, loadDoctorFilterOptions]);

  if (rawTab === "doctors") {
    return <Navigate to="/admin/doctors" replace />;
  }
  if (rawTab === "accounts") {
    return <Navigate to="/admin/account" replace />;
  }
  if (rawTab === "specialties") {
    return <Navigate to="/admin/specialty" replace />;
  }
  if (rawTab === "rooms") {
    return <Navigate to="/admin/clinic-room" replace />;
  }

  return (
    <PageLayout dashboard>
      <AdminLayout>
      {toast.show && (
        <div className={`toast-notification toast-${toast.type} animate-slide-in`}>
          <div className="toast-icon">
            {toast.type === "success" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>
          <div className="toast-content">
            <span className="toast-title">{toast.type === "success" ? "Success" : "Error"}</span>
            <p className="toast-message">{toast.message}</p>
          </div>
          <button type="button" className="toast-close" onClick={() => setToast({ show: false, type: "success", message: "" })}>
            &times;
          </button>
        </div>
      )}

      {loading && activeTab !== "overview" && (
        <div className="loading-state" style={{ padding: "4rem" }}>
          <div className="loading-spinner" />
          Loading data…
        </div>
      )}

      {activeTab === "overview" && (
        <div className="admin-overview">
          <ScrollReveal variant="up" delay={20}>
            <div className="admin-overview-hero">
              <div className="admin-overview-hero-orb admin-overview-hero-orb--1" aria-hidden="true" />
              <div className="admin-overview-hero-orb admin-overview-hero-orb--2" aria-hidden="true" />
              <div className="admin-overview-hero-inner">
                <div className="admin-overview-hero-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <div className="admin-overview-hero-copy">
                  <p className="admin-overview-hero-eyebrow">OrcaXCare control center</p>
                  <p className="admin-overview-hero-lead">
                    {fullName ? `Welcome back, ${fullName.split(" ")[0]}.` : "Welcome back."} Monitor clinic operations and jump into any module below.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="up" delay={30}>
            <section className="admin-dashboard-kpis card" aria-labelledby="admin-dashboard-kpis-title">
              <div className="admin-dashboard-kpis-head">
                <div>
                  <h2 id="admin-dashboard-kpis-title">Clinic KPIs</h2>
                  <p className="admin-dashboard-kpis-sub">
                    Revenue and activity for the selected period
                    {dashboardData?.period?.from && dashboardData?.period?.to
                      ? ` (${dashboardData.period.from} → ${dashboardData.period.to})`
                      : ""}
                  </p>
                </div>
                <form
                  className="admin-dashboard-filters"
                  onSubmit={(event) => {
                    event.preventDefault();
                    loadDashboard();
                  }}
                >
                  <label>
                    <span>From</span>
                    <input
                      type="date"
                      value={dashboardFrom}
                      onChange={(event) => setDashboardFrom(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>To</span>
                    <input
                      type="date"
                      value={dashboardTo}
                      onChange={(event) => setDashboardTo(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Doctor</span>
                    <select
                      value={dashboardDoctorId}
                      onChange={(event) => setDashboardDoctorId(event.target.value)}
                    >
                      <option value="">All doctors</option>
                      {doctorFilterOptions.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.fullName || item.licenseNo || item._id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={dashboardLoading}>
                    {dashboardLoading ? "Loading…" : "Apply"}
                  </button>
                </form>
              </div>

              <div className="admin-kpi-grid">
                <article className="admin-kpi-card admin-kpi-card--rose">
                  <p className="admin-kpi-label">Appointments today</p>
                  <p className="admin-kpi-value">
                    {dashboardLoading ? "—" : (dashboardData?.appointmentsToday?.total ?? 0)}
                  </p>
                  {!dashboardLoading && dashboardData?.appointmentsToday && (
                    <p className="admin-kpi-meta">
                      {dashboardData.appointmentsToday.confirmed} confirmed ·{" "}
                      {dashboardData.appointmentsToday.completed} completed
                    </p>
                  )}
                </article>
                <article className="admin-kpi-card admin-kpi-card--emerald">
                  <p className="admin-kpi-label">Revenue</p>
                  <p className="admin-kpi-value">
                    {dashboardLoading ? "—" : formatCurrency(dashboardData?.kpis?.totalRevenue)}
                  </p>
                </article>
                <article className="admin-kpi-card admin-kpi-card--cyan">
                  <p className="admin-kpi-label">Appointments</p>
                  <p className="admin-kpi-value">
                    {dashboardLoading ? "—" : (dashboardData?.kpis?.appointmentCount ?? 0)}
                  </p>
                </article>
                <article className="admin-kpi-card admin-kpi-card--violet">
                  <p className="admin-kpi-label">New patients</p>
                  <p className="admin-kpi-value">
                    {dashboardLoading ? "—" : (dashboardData?.kpis?.newPatients ?? 0)}
                  </p>
                </article>
                <article className="admin-kpi-card admin-kpi-card--amber">
                  <p className="admin-kpi-label">Active doctors</p>
                  <p className="admin-kpi-value">
                    {dashboardLoading ? "—" : (dashboardData?.kpis?.activeDoctors ?? 0)}
                  </p>
                </article>
              </div>

              <div className="admin-revenue-chart" aria-label="Revenue by day">
                <div className="admin-revenue-chart-head">
                  <h3>Revenue by day</h3>
                  {!dashboardLoading && dashboardData?.revenueChart?.length === 0 && (
                    <p>No bookings in this period.</p>
                  )}
                </div>
                {!dashboardLoading && dashboardData?.revenueChart?.length > 0 && (
                  <div className="admin-revenue-chart-bars">
                    {(() => {
                      const maxRevenue = Math.max(
                        ...dashboardData.revenueChart.map((point) => point.revenue || 0),
                        1
                      );
                      return dashboardData.revenueChart.map((point) => (
                        <div key={point.date} className="admin-revenue-bar-wrap">
                          <div
                            className="admin-revenue-bar"
                            style={{ height: `${Math.max(6, (point.revenue / maxRevenue) * 100)}%` }}
                            title={`${point.date}: ${formatCurrency(point.revenue)} (${point.appointments} appts)`}
                          />
                          <span className="admin-revenue-bar-label">{point.date.slice(5)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </section>
          </ScrollReveal>

          <ScrollReveal variant="up" delay={40}>
            <div className="admin-overview-stats">
              {OVERVIEW_STATS.map((stat) => (
                <Link
                  key={stat.key}
                  to={stat.to}
                  className={`admin-stat-card admin-stat-card--${stat.theme} card-hover`}
                >
                  <span className={`admin-stat-icon admin-stat-icon--${stat.theme}`}>{stat.icon}</span>
                  <div className="admin-stat-body">
                    <span className="admin-stat-value">
                      {statsLoading ? (
                        <span className="admin-stat-skeleton" aria-hidden="true" />
                      ) : (
                        (overviewStats?.[stat.key] ?? "—")
                      )}
                    </span>
                    <span className="admin-stat-label">{stat.label}</span>
                  </div>
                  <span className="admin-stat-arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </ScrollReveal>

          {ADMIN_SHORTCUTS.map((section, sectionIndex) => (
            <ScrollReveal key={section.group} variant="up" delay={60 + sectionIndex * 50}>
              <div className="admin-overview-section">
                <div className={`admin-section-pill admin-section-pill--${section.theme}`}>
                  <span className="admin-section-pill-icon">{section.sectionIcon}</span>
                  {section.group}
                </div>
                <div className={`admin-shortcut-grid admin-shortcut-grid--${section.items.length}`}>
                  {section.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`card admin-shortcut admin-shortcut--${item.theme} card-hover`}
                    >
                      <div className={`admin-shortcut-icon admin-shortcut-icon--${item.theme}`}>
                        {item.icon}
                      </div>
                      <span className={`admin-shortcut-badge admin-shortcut-badge--${item.theme}`}>
                        {item.badge}
                      </span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <span className="admin-shortcut-arrow">
                        Open
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}

      {!loading && activeTab === "departments" && (
        <ScrollReveal variant="up" delay={80}>
          <div className="card admin-card">
            <div className="admin-section-bar">
              <span className="admin-section-count">{departments.length} departments</span>
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th 
                      onClick={() => handleDeptSort("name")} 
                      className="sortable-header"
                      title="Sort by department name"
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      Name departments 
                      {deptSort.key === "name" && (
                        <span className="sort-indicator">{deptSort.direction === "asc" ? " ▲" : " ▼"}</span>
                      )}
                    </th>
                    <th 
                      onClick={() => handleDeptSort("doctorsCount")} 
                      className="sortable-header"
                      title="Sort by doctor count"
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      Doctor count 
                      {deptSort.key === "doctorsCount" && (
                        <span className="sort-indicator">{deptSort.direction === "asc" ? " ▲" : " ▼"}</span>
                      )}
                    </th>
                    <th 
                      onClick={() => handleDeptSort("location")} 
                      className="sortable-header"
                      title="Sort by location"
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      Location / Building 
                      {deptSort.key === "location" && (
                        <span className="sort-indicator">{deptSort.direction === "asc" ? " ▲" : " ▼"}</span>
                      )}
                    </th>
                    <th>Support phone</th>
                    <th 
                      onClick={() => handleDeptSort("status")} 
                      className="sortable-header"
                      title="Sort by status"
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      Status 
                      {deptSort.key === "status" && (
                        <span className="sort-indicator">{deptSort.direction === "asc" ? " ▲" : " ▼"}</span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...departments].sort((a, b) => {
                    let compare = 0;
                    if (deptSort.key === "name") {
                      compare = a.name.localeCompare(b.name);
                    } else if (deptSort.key === "doctorsCount") {
                      const countA = allDoctorsForCount.filter(doc => doc.departmentId === a._id || doc.department?._id === a._id).length;
                      const countB = allDoctorsForCount.filter(doc => doc.departmentId === b._id || doc.department?._id === b._id).length;
                      compare = countA - countB;
                    } else if (deptSort.key === "location") {
                      compare = (a.location || "").localeCompare(b.location || "");
                    } else if (deptSort.key === "status") {
                      const statusA = a.isActive ? "Active" : "Inactive";
                      const statusB = b.isActive ? "Active" : "Inactive";
                      compare = statusA.localeCompare(statusB);
                    }
                    return deptSort.direction === "asc" ? compare : -compare;
                  }).map((dept) => {
                    const docCount = allDoctorsForCount.filter(doc => doc.departmentId === dept._id || doc.department?._id === dept._id).length;
                    return (
                      <tr key={dept._id}>
                        <td><strong>{dept.name}</strong></td>
                        <td>
                          <span className="badge badge-role-doctor admin-dept-count">
                            {docCount} doctors
                          </span>
                        </td>
                        <td>{dept.location || "Central building"}</td>
                        <td>{dept.phone || "—"}</td>
                        <td>
                          <span className={`badge badge-status-${dept.isActive ? "active" : "inactive"}`}>
                            {dept.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>
      )}

      </AdminLayout>
    </PageLayout>
  );
}
