import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./PatientDashboardPage.css";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { useAuth } from "../context/AuthContext.jsx";

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const DASHBOARD_SECTIONS = [
  {
    group: "Care",
    theme: "cyan",
    sectionIcon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M12 14v4" />
        <path d="M10 16h4" />
      </svg>
    ),
    items: [
      {
        to: "/search-doctors",
        title: "Find a doctor",
        description: "Browse by specialty or department before you book.",
        badge: "Search",
        theme: "sky",
        cta: "Browse doctors",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        ),
      },
      {
        to: "/patient/book",
        title: "Book an appointment",
        description: "Choose a doctor and time slot for your visit.",
        badge: "Booking",
        theme: "cyan",
        cta: "Start booking",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <path d="M3 10h18" />
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M12 14v4" />
            <path d="M10 16h4" />
          </svg>
        ),
      },
      {
        to: "/patient/appointments",
        title: "My appointments",
        description: "Upcoming visits and your consultation history.",
        badge: "Visits",
        theme: "teal",
        cta: "View appointments",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M8 12h8" />
            <path d="M8 16h5" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "Payments & insurance",
    theme: "emerald",
    sectionIcon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
        <path d="M14 10h6v6h-6a3 3 0 0 1 0-6z" />
      </svg>
    ),
    items: [
      {
        to: "/patient/wallet",
        title: "Wallet",
        description: "Top up with PayOS or SePay and track transactions.",
        badge: "Payments",
        theme: "emerald",
        cta: "Open wallet",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
            <path d="M17 12h.01" />
            <path d="M14 10h6v6h-6a3 3 0 0 1 0-6z" />
          </svg>
        ),
      },
      {
        to: "/patient/insurance-cards",
        title: "Health insurance",
        description: "Save insurance cards for faster check-in and billing.",
        badge: "Insurance",
        theme: "amber",
        cta: "Manage cards",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "Account",
    theme: "violet",
    sectionIcon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    items: [
      {
        to: "/patient/favorites",
        title: "Favorite doctors",
        description: "Keep your preferred doctors and remove them anytime.",
        badge: "Favorites",
        theme: "violet",
        cta: "Manage favorites",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
          </svg>
        ),
      },
      {
        to: "/profile",
        title: "Profile",
        description: "Update contact details, date of birth, and emergency contact.",
        badge: "Account",
        theme: "violet",
        cta: "Edit profile",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
      },
    ],
  },
];

export default function PatientDashboardPage() {
  const { fullName } = useAuth();
  const firstName = fullName?.split(" ")[0] || "there";
  const [walletBalance, setWalletBalance] = useState(null);
  const [upcomingCount, setUpcomingCount] = useState(null);

  useEffect(() => {
    let active = true;
    PatientApiClient.getWallet()
      .then(({ data }) => {
        if (active) setWalletBalance(data.balance ?? 0);
      })
      .catch(() => {
        if (active) setWalletBalance(null);
      });

    PatientApiClient.listAppointments()
      .then(({ data }) => {
        if (!active) return;
        const now = new Date();
        const upcoming = (data.items || []).filter((app) => {
          if (app.status !== "booked") return false;
          const slot = app.slotId;
          if (!slot) return false;
          const slotDate = new Date(slot.date);
          const [h, m] = (slot.startTime || "00:00").split(":");
          slotDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
          return slotDate > now;
        });
        setUpcomingCount(upcoming.length);
      })
      .catch(() => {
        if (active) setUpcomingCount(null);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <PageLayout>
      <div className="patient-dashboard">
        <ScrollReveal variant="up">
          <section className="patient-dashboard-hero">
            <div className="patient-dashboard-hero-orb patient-dashboard-hero-orb--1" aria-hidden="true" />
            <div className="patient-dashboard-hero-orb patient-dashboard-hero-orb--2" aria-hidden="true" />
            <div className="patient-dashboard-hero-inner">
              <div className="patient-dashboard-hero-main">
                <p className="patient-dashboard-hero-eyebrow">Your health portal</p>
                <h1>Hello, {firstName}</h1>
                <p className="patient-dashboard-hero-lead">
                  Book visits, manage your wallet, and keep your profile up to date — all in one place.
                </p>
                <div className="patient-dashboard-hero-actions">
                  <Link to="/search-doctors" className="btn btn-primary">
                    Find a doctor
                  </Link>
                  <Link to="/patient/wallet" className="btn btn-outline">
                    Top up wallet
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal variant="up" delay={40}>
          <div className="patient-dashboard-quick">
            <Link to="/patient/wallet" className="patient-quick-card">
              <span className="patient-quick-icon patient-quick-icon--wallet" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
                  <path d="M14 10h6v6h-6a3 3 0 0 1 0-6z" />
                </svg>
              </span>
              <div className="patient-quick-body">
                <span className="patient-quick-value">
                  {walletBalance === null ? "—" : formatCurrency(walletBalance)}
                </span>
                <span className="patient-quick-label">Wallet balance</span>
                <span className="patient-quick-hint">Tap to top up or view history</span>
              </div>
            </Link>

            <Link to="/patient/appointments" className="patient-quick-card">
              <span className="patient-quick-icon patient-quick-icon--care" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                </svg>
              </span>
              <div className="patient-quick-body">
                <span className="patient-quick-value">
                  {upcomingCount === null ? "—" : upcomingCount}
                </span>
                <span className="patient-quick-label">Upcoming visits</span>
                <span className="patient-quick-hint">View your booked appointments</span>
              </div>
            </Link>

            <Link to="/search-doctors" className="patient-quick-card">
              <span className="patient-quick-icon patient-quick-icon--search" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <div className="patient-quick-body">
                <span className="patient-quick-value">Explore</span>
                <span className="patient-quick-label">Find specialists</span>
                <span className="patient-quick-hint">Search by specialty or department</span>
              </div>
            </Link>
          </div>
        </ScrollReveal>

        {DASHBOARD_SECTIONS.map((section, sectionIndex) => (
          <ScrollReveal key={section.group} variant="up" delay={60 + sectionIndex * 40}>
            <section className="patient-dashboard-section">
              <div className={`patient-section-pill patient-section-pill--${section.theme}`}>
                <span className="patient-section-pill-icon">{section.sectionIcon}</span>
                {section.group}
              </div>
              <div className={`patient-shortcut-grid patient-shortcut-grid--${section.items.length}`}>
                {section.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`card patient-shortcut patient-shortcut--${item.theme} card-hover ${item.tag ? "is-muted" : ""}`}
                  >
                    {item.tag && <span className="patient-shortcut-tag">{item.tag}</span>}
                    <div className={`patient-shortcut-icon patient-shortcut-icon--${item.theme}`}>
                      {item.icon}
                    </div>
                    <span className={`patient-shortcut-badge patient-shortcut-badge--${item.theme}`}>
                      {item.badge}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <span className="patient-shortcut-arrow">
                      {item.cta}
                      <ArrowIcon />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </ScrollReveal>
        ))}
      </div>
    </PageLayout>
  );
}
