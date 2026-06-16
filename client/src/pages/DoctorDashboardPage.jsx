import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DoctorLayout from "../components/DoctorLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { DoctorApiClient } from "../services/doctorApi.js";
import { getApiErrorMessage } from "../services/api.js";
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

function getQueueLabel(bookedSlots) {
  if (!bookedSlots.length) {
    return {
      value: "No queue yet",
      hint: "No patients are waiting for consultation right now.",
    };
  }

  if (bookedSlots.length === 1) {
    return {
      value: "1 patient waiting",
      hint: `Next patient: ${bookedSlots[0].startTime} - ${bookedSlots[0].endTime}`,
    };
  }

  return {
    value: `${bookedSlots.length} patients waiting`,
    hint: `Next patient: ${bookedSlots[0].startTime} - ${bookedSlots[0].endTime}`,
  };
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
        const queue = getQueueLabel(bookedSlots);
        const workShifts = workShiftsResponse.data || {};

        setDashboard({
          doctorName: schedule.doctor?.fullName || workShifts.doctor?.fullName || fullName || "Doctor",
          todayLabel: formatDashboardDate(today),
          summary: schedule.summary || { total: 0, available: 0, booked: 0, blocked: 0 },
          todaySlots,
          bookedSlots,
          nextSlot,
          queue,
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

  const stats = dashboard
    ? [
        {
          label: "Today's appointments",
          value: dashboard.summary.booked,
          hint: `${dashboard.summary.available} open slots remain`,
        },
        {
          label: "Queue status",
          value: dashboard.queue.value,
          hint: dashboard.queue.hint,
        },
        {
          label: "Active work shifts",
          value: dashboard.workShifts.activeCount,
          hint: `${dashboard.workShifts.total} total shifts on file`,
        },
      ]
    : [];

  return (
    <PageLayout dashboard>
      <DoctorLayout
        title="Doctor dashboard"
        actions={
          <Link to="/doctor/schedule" className="btn btn-outline btn-sm">
            Open calendar
          </Link>
        }
      >
        <div className="doctor-dashboard">
          <ScrollReveal variant="up">
            <section className="doctor-dashboard-hero">
              <span className="doctor-dashboard-hero-orb doctor-dashboard-hero-orb--1" aria-hidden="true" />
              <span className="doctor-dashboard-hero-orb doctor-dashboard-hero-orb--2" aria-hidden="true" />

              <div className="doctor-dashboard-hero-inner">
                <div className="doctor-dashboard-hero-copy">
                  <p className="doctor-dashboard-eyebrow">Clinical overview</p>
                  <h1>Hello, Dr. {doctorLabel}</h1>
                  <p className="doctor-dashboard-hero-lead">
                    Track today&apos;s appointments, monitor queue status, and jump into the tools you use most.
                  </p>
                  <div className="doctor-dashboard-hero-actions">
                    <Link to="/doctor/schedule" className="btn btn-primary">
                      View schedule
                    </Link>
                    <Link to="/doctor/work-shifts" className="btn btn-outline">
                      Review shifts
                    </Link>
                  </div>
                </div>

                <div className="doctor-dashboard-hero-card">
                  <span className="doctor-dashboard-hero-card-label">Today</span>
                  <strong>{dashboard?.todayLabel || formatDashboardDate(new Date())}</strong>
                  <p>
                    {loading
                      ? "Loading live schedule and work shifts..."
                      : dashboard
                        ? `${dashboard.summary.booked} booked appointments and ${dashboard.summary.available} open slots.`
                        : "Waiting for schedule data."}
                  </p>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="doctor-dashboard-stats">
            {(loading ? [0, 1, 2] : stats).map((item, index) => (
              <ScrollReveal key={item.label || index} variant="float" delay={index * 30}>
                <article className="doctor-dashboard-stat">
                  {loading ? (
                    <>
                      <span className="doctor-dashboard-stat-label">Loading...</span>
                      <span className="doctor-dashboard-stat-value doctor-dashboard-stat-value--skeleton">--</span>
                      <span className="doctor-dashboard-stat-hint">Fetching dashboard metrics.</span>
                    </>
                  ) : (
                    <>
                      <span className="doctor-dashboard-stat-label">{item.label}</span>
                      <span className="doctor-dashboard-stat-value">{item.value}</span>
                      <span className="doctor-dashboard-stat-hint">{item.hint}</span>
                    </>
                  )}
                </article>
              </ScrollReveal>
            ))}
          </div>

          <div className="doctor-dashboard-body">
            <ScrollReveal variant="up" delay={40}>
              <section className="doctor-dashboard-panel">
                <div className="doctor-dashboard-panel-head">
                  <div>
                    <p className="doctor-dashboard-panel-kicker">Live schedule</p>
                    <h2>Today&apos;s appointments</h2>
                  </div>
                  <span className="doctor-dashboard-pill">
                    {dashboard ? `${dashboard.todaySlots.length} slots` : "Realtime"}
                  </span>
                </div>

                {loading ? (
                  <div className="doctor-dashboard-empty">Loading today&apos;s schedule...</div>
                ) : dashboard?.todaySlots.length ? (
                  <div className="doctor-dashboard-list">
                    {dashboard.todaySlots.map((slot) => (
                      <article key={slot._id} className={`doctor-dashboard-slot doctor-dashboard-slot--${slot.status}`}>
                        <div className="doctor-dashboard-slot-left">
                          <strong className="doctor-dashboard-slot-time">
                            {slot.startTime} - {slot.endTime}
                          </strong>
                          <span className="doctor-dashboard-slot-meta">
                            {slot.roomName ? `${slot.roomName} · ` : ""}
                            {slot.status === "booked"
                              ? "Patient appointment"
                              : slot.status === "blocked"
                                ? "Blocked for other work"
                                : "Open for booking"}
                          </span>
                        </div>
                        <span className="doctor-dashboard-slot-pill">{statusLabelFromSlot(slot)}</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="doctor-dashboard-empty">
                    No appointments are scheduled for today yet. Open your work shifts to confirm your roster.
                  </div>
                )}
              </section>
            </ScrollReveal>

            <ScrollReveal variant="up" delay={80}>
              <section className="doctor-dashboard-panel">
                <div className="doctor-dashboard-panel-head">
                  <div>
                    <p className="doctor-dashboard-panel-kicker">Queue snapshot</p>
                    <h2>Current status</h2>
                  </div>
                </div>

                {loading ? (
                  <div className="doctor-dashboard-empty">Loading queue snapshot...</div>
                ) : (
                  <div className="doctor-dashboard-snapshot">
                    <div className="doctor-dashboard-snapshot-card">
                      <span className="doctor-dashboard-snapshot-label">Next patient</span>
                      <strong>
                        {dashboard?.nextSlot
                          ? `${dashboard.nextSlot.startTime} - ${dashboard.nextSlot.endTime}`
                          : "No patient queued"}
                      </strong>
                      <p>
                        {dashboard?.nextSlot
                          ? `${dashboard.nextSlot.roomName ? `${dashboard.nextSlot.roomName} · ` : ""}${dashboard.nextSlot.statusLabel}`
                          : "The queue is currently empty."}
                      </p>
                    </div>

                    <div className="doctor-dashboard-snapshot-card doctor-dashboard-snapshot-card--soft">
                      <span className="doctor-dashboard-snapshot-label">Work shift coverage</span>
                      <strong>{dashboard?.workShifts.activeCount || 0} active shifts</strong>
                      <p>{dashboard?.workShifts.weeklyPattern?.length || 0} days with assigned coverage in the weekly pattern.</p>
                    </div>
                  </div>
                )}
              </section>
            </ScrollReveal>
          </div>

          <ScrollReveal variant="up" delay={120}>
            <section className="doctor-dashboard-shortcuts">
              <Link to="/doctor/schedule" className="card shortcut card-hover doctor-dashboard-shortcut">
                <div className="shortcut-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M8 2v4M16 2v4M3 10h18" />
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
                  </svg>
                </div>
                <h3>Schedule calendar</h3>
                <p>Inspect booked, available, and blocked slots in day or week view.</p>
                <span className="shortcut-arrow">Open calendar →</span>
              </Link>

              <Link to="/doctor/work-shifts" className="card shortcut card-hover doctor-dashboard-shortcut">
                <div className="shortcut-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </div>
                <h3>Work shifts</h3>
                <p>Check your roster and confirm the weekly pattern used to generate slots.</p>
                <span className="shortcut-arrow">Open shifts →</span>
              </Link>

              <Link to="/profile" className="card shortcut card-hover doctor-dashboard-shortcut">
                <div className="shortcut-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h3>Update profile</h3>
                <p>Edit your professional profile, bio, and contact details.</p>
                <span className="shortcut-arrow">View details →</span>
              </Link>
            </section>
          </ScrollReveal>
        </div>
      </DoctorLayout>
    </PageLayout>
  );
}
