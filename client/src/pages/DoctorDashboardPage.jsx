import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DoctorLayout from "../components/DoctorLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { DoctorApiClient } from "../services/doctorApi.js";
import { getApiErrorMessage } from "../services/api.js";
import DashboardKpiGrid from "../components/dashboard/DashboardKpiGrid.jsx";
import DashboardBarChart from "../components/dashboard/DashboardBarChart.jsx";
import AppIcon from "../components/icons/AppIcon.jsx";
import "./DoctorDashboardPage.css";

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDashboardDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

function sortSlots(slots) {
  return [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function getDoctorLabel(fullName) {
  if (!fullName) return "Doctor";
  const parts = fullName.trim().split(/\s+/);
  return parts.length ? parts[parts.length - 1] : fullName;
}

function statusLabelFromSlot(slot) {
  if (slot.status === "booked") return "Booked";
  if (slot.status === "blocked") return "Blocked";
  return "Available";
}

export default function DoctorDashboardPage() {
  const { fullName } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const doctorLabel = useMemo(() => getDoctorLabel(fullName), [fullName]);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      const today = new Date();
      const todayKey = formatDateOnly(today);

      try {
        const [scheduleResponse, workShiftsResponse] = await Promise.all([
          DoctorApiClient.getSchedule({ startDate: todayKey, endDate: todayKey, view: "day" }),
          DoctorApiClient.listWorkShifts({ limit: 50, isActive: "true" }),
        ]);

        if (!active) return;

        const schedule = scheduleResponse.data || {};
        const todayDay = schedule.days?.find((day) => day.date === todayKey) || schedule.days?.[0] || null;
        const todaySlots = sortSlots(todayDay?.slots || []);
        const bookedSlots = todaySlots.filter((slot) => slot.status === "booked");
        const nextSlot = bookedSlots[0] || null;
        const workShifts = workShiftsResponse.data || {};

        setDashboard({
          todayLabel: formatDashboardDate(today),
          summary: schedule.summary || { total: 0, available: 0, booked: 0, blocked: 0 },
          todaySlots,
          bookedSlots,
          nextSlot,
          workShifts: {
            total: workShifts.total || 0,
            activeCount: (workShifts.items || []).filter((shift) => shift.isActive !== false).length,
            weeklyPattern: workShifts.weeklyPattern || [],
          },
        });
      } catch (err) {
        if (!active) return;
        setError(getApiErrorMessage(err));
        setDashboard(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [fullName]);

  const displaySlots = useMemo(() => {
    if (!dashboard?.todaySlots?.length) return [];
    const booked = dashboard.todaySlots.filter((slot) => slot.status === "booked");
    const rest = dashboard.todaySlots.filter((slot) => slot.status !== "booked");
    return [...booked, ...rest].slice(0, 8);
  }, [dashboard]);

  const pageDescription = loading
    ? "Loading today's schedule and roster…"
    : dashboard
      ? `${dashboard.todayLabel} · ${dashboard.summary.booked} booked · ${dashboard.summary.available} open slots`
      : "Your clinical overview for today.";

  const kpis = dashboard
    ? [
        {
          key: "appointments",
          icon: <AppIcon name="calendar-check" />,
          tone: "cyan",
          label: "Booked today",
          value: dashboard.summary.booked,
          hint: `${dashboard.bookedSlots.length} patient${dashboard.bookedSlots.length === 1 ? "" : "s"} in queue`,
        },
        {
          key: "open",
          icon: <AppIcon name="clock" />,
          tone: "emerald",
          label: "Open slots",
          value: dashboard.summary.available,
          hint: `${dashboard.summary.blocked} blocked · ${dashboard.summary.total} total`,
        },
        {
          key: "queue",
          icon: <AppIcon name="users" />,
          tone: "violet",
          label: "In queue",
          value: dashboard.bookedSlots.length,
          hint: dashboard.nextSlot
            ? `Next: ${dashboard.nextSlot.startTime} – ${dashboard.nextSlot.endTime}`
            : "No patients waiting",
        },
        {
          key: "shifts",
          icon: <AppIcon name="calendar" />,
          tone: "slate",
          label: "Active shifts",
          value: dashboard.workShifts.activeCount,
          hint: `${dashboard.workShifts.weeklyPattern.length} days in weekly pattern`,
        },
      ]
    : [];

  const slotChartData = dashboard
    ? [
        {
          key: "booked",
          label: "Booked",
          value: dashboard.summary.booked,
          tone: "emerald",
        },
        {
          key: "open",
          label: "Open",
          value: dashboard.summary.available,
          tone: "cyan",
        },
        {
          key: "blocked",
          label: "Blocked",
          value: dashboard.summary.blocked,
          tone: "slate",
        },
      ].filter((point) => point.value > 0)
    : [];

  return (
    <PageLayout dashboard>
      <DoctorLayout
        title={`Hello, Dr. ${doctorLabel}`}
        description={pageDescription}
        actions={
          <>
            <Link to="/doctor/today-appointments" className="btn btn-primary btn-sm">
              Today&apos;s list
            </Link>
            <Link to="/doctor/schedule" className="btn btn-outline btn-sm">
              Calendar
            </Link>
          </>
        }
      >
        <div className="doctor-dashboard">
          {error && <div className="alert alert-error">{error}</div>}

          <DashboardKpiGrid items={kpis} loading={loading} columns={4} />

          <div className="dash-charts-row doctor-dashboard-charts">
            <DashboardBarChart
              title="Today's slot mix"
              description="Booked, open, and blocked slots"
              data={slotChartData}
              loading={loading}
              emptyMessage="No slots scheduled for today."
            />
            <DashboardBarChart
              title="Weekly shift pattern"
              description="Active shifts per weekday"
              data={(dashboard?.workShifts?.weeklyPattern || [])
                .filter((day) => (day.activeCount || 0) > 0 || (day.shifts?.length || 0) > 0)
                .map((day) => ({
                  key: String(day.dayOfWeek),
                  label: day.dayLabel?.slice(0, 3) || String(day.dayOfWeek),
                  value: day.activeCount || day.shifts?.length || 0,
                  tone: "violet",
                }))}
              loading={loading}
              emptyMessage="No weekly shift pattern configured."
              barClassName="dash-chart-bar--violet"
            />
          </div>

          <div className="doctor-dashboard-main">
            <section className="doctor-dashboard-panel">
              <header className="doctor-dashboard-panel-head">
                <div>
                  <h2>Today&apos;s schedule</h2>
                  <p className="doctor-dashboard-panel-lead">Booked visits appear first, then open and blocked slots.</p>
                </div>
                <Link to="/doctor/today-appointments" className="btn btn-outline btn-sm">
                  View all
                </Link>
              </header>

              {loading ? (
                <div className="doctor-dashboard-empty">Loading today&apos;s schedule…</div>
              ) : displaySlots.length ? (
                <div className="doctor-dashboard-schedule-scroll">
                  <ul className="doctor-dashboard-schedule">
                    {displaySlots.map((slot) => (
                      <li key={slot._id} className={`doctor-dashboard-slot doctor-dashboard-slot--${slot.status}`}>
                        <div className="doctor-dashboard-slot-timecol">
                          <span className="doctor-dashboard-slot-time">{slot.startTime}</span>
                          <span className="doctor-dashboard-slot-time-end">{slot.endTime}</span>
                        </div>
                        <div className="doctor-dashboard-slot-body">
                          <strong>
                            {slot.status === "booked"
                              ? "Patient appointment"
                              : slot.status === "blocked"
                                ? "Blocked time"
                                : "Open for booking"}
                          </strong>
                          <span>
                            {slot.roomName || "Room TBD"}
                            {slot.statusLabel ? ` · ${slot.statusLabel}` : ""}
                          </span>
                        </div>
                        <span className={`doctor-dashboard-slot-badge doctor-dashboard-slot-badge--${slot.status}`}>
                          {statusLabelFromSlot(slot)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {dashboard.todaySlots.length > displaySlots.length && (
                    <p className="doctor-dashboard-schedule-more">
                      +{dashboard.todaySlots.length - displaySlots.length} more slots ·{" "}
                      <Link to="/doctor/schedule">open calendar</Link>
                    </p>
                  )}
                </div>
              ) : (
                <div className="doctor-dashboard-empty">
                  <strong>No slots scheduled for today</strong>
                  <p>Confirm your work shifts or open the calendar to review availability.</p>
                  <Link to="/doctor/work-shifts" className="btn btn-outline btn-sm">
                    Review shifts
                  </Link>
                </div>
              )}
            </section>

            <aside className="doctor-dashboard-aside">
              <section className="doctor-dashboard-next card">
                <p className="doctor-dashboard-next-label">Next patient</p>
                {loading ? (
                  <p className="doctor-dashboard-next-empty">Loading queue…</p>
                ) : dashboard?.nextSlot ? (
                  <>
                    <strong className="doctor-dashboard-next-time">
                      {dashboard.nextSlot.startTime} – {dashboard.nextSlot.endTime}
                    </strong>
                    <p className="doctor-dashboard-next-meta">
                      {dashboard.nextSlot.roomName ? `${dashboard.nextSlot.roomName} · ` : ""}
                      {dashboard.nextSlot.statusLabel || "Booked appointment"}
                    </p>
                    <Link to="/doctor/today-appointments" className="btn btn-primary btn-sm doctor-dashboard-next-cta">
                      Open appointment list
                    </Link>
                  </>
                ) : (
                  <>
                    <strong className="doctor-dashboard-next-time">No queue</strong>
                    <p className="doctor-dashboard-next-meta">No booked patients are waiting right now.</p>
                  </>
                )}
              </section>

              <section className="doctor-dashboard-panel doctor-dashboard-quick">
                <h2>Quick links</h2>
                <nav className="doctor-dashboard-quick-nav" aria-label="Doctor quick links">
                  <Link to="/doctor/schedule" className="doctor-dashboard-quick-link">
                    <span>Schedule calendar</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link to="/doctor/work-shifts" className="doctor-dashboard-quick-link">
                    <span>Work shifts</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link to="/doctor/today-appointments" className="doctor-dashboard-quick-link">
                    <span>Today&apos;s appointments</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link to="/profile" className="doctor-dashboard-quick-link">
                    <span>Edit profile</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </nav>
              </section>
            </aside>
          </div>
        </div>
      </DoctorLayout>
    </PageLayout>
  );
}
