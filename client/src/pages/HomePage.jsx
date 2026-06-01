import { useRef } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useHeroParallax } from "../hooks/useHeroParallax.js";

const FEATURES = [
  {
    title: "Find Specialists",
    description: "Search doctors by name, specialty, or department — filter and discover the right care quickly.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    title: "Secure Accounts",
    description: "Email verification, password reset, and role-based access keep your health data protected.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    title: "Role-Based Portals",
    description: "Dedicated dashboards for patients, doctors, and administrators — tailored to every user.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

const STEPS = [
  { title: "Create Account", description: "Register as a patient with email verification in minutes." },
  { title: "Find Your Doctor", description: "Browse specialists, filter by department, and view profiles." },
  { title: "Manage Your Care", description: "Access your dashboard, update security, and stay in control." },
];

export default function HomePage() {
  const heroRef = useRef(null);
  const { fullName, isAuthenticated, role } = useAuth();
  useHeroParallax(heroRef);

  const dashboardPath =
    role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : role === "patient" ? "/patient" : null;

  return (
    <PageLayout fullWidth>
      <div className="landing">
        <section className="hero-section" ref={heroRef}>
          <div className="hero-shapes" aria-hidden="true">
            <div className="hero-shape hero-shape-1" />
            <div className="hero-shape hero-shape-2" />
          </div>

          <div className="hero-content">
            <div className="hero-badge hero-animate-in">
              <span className="hero-badge-dot" />
              Healthcare Platform · 2026
            </div>

            <h1 className="hero-animate-in hero-animate-in-delay-1">
              {fullName ? (
                <>Welcome back, {fullName.split(" ")[0]}</>
              ) : (
                <>Healthcare made simple &amp; secure</>
              )}
            </h1>

            <p className="hero-sub hero-animate-in hero-animate-in-delay-2">
              {isAuthenticated
                ? "Your OrcaXCare portal is ready. Search doctors, manage your profile, and access care services from one place."
                : "Connect with verified doctors, manage appointments, and take control of your health journey — all in one modern portal."}
            </p>

            <div className="hero-actions hero-animate-in hero-animate-in-delay-3">
              <Link to="/search-doctors" className="btn btn-white btn-lg">
                Find Doctors
              </Link>
              {!isAuthenticated && (
                <Link to="/register" className="btn btn-outline btn-hero-outline btn-lg">
                  Create Account
                </Link>
              )}
              {isAuthenticated && dashboardPath && (
                <Link to={dashboardPath} className="btn btn-outline btn-hero-outline btn-lg">
                  Go to Dashboard
                </Link>
              )}
            </div>

            <div className="hero-stats hero-animate-in hero-animate-in-delay-4">
              <div className="hero-stat">
                <span className="hero-stat-value">500+</span>
                <span className="hero-stat-label">Doctors</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">20+</span>
                <span className="hero-stat-label">Specialties</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">24/7</span>
                <span className="hero-stat-label">Support</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <ScrollReveal className="section-header" variant="up">
            <span className="section-label">Why OrcaXCare</span>
            <h2>Everything you need for modern healthcare</h2>
            <p>A thoughtfully designed platform that puts patients first while empowering doctors and administrators.</p>
          </ScrollReveal>

          <div className="features-grid scroll-stagger-grid">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} as="article" className="feature-card" variant="float" delay={i * 120}>
                <div className="feature-icon-wrap">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="section section-alt">
          <ScrollReveal className="section-header" variant="up">
            <span className="section-label">How it works</span>
            <h2>Get started in three simple steps</h2>
            <p>From registration to finding the right doctor — we've streamlined every step.</p>
          </ScrollReveal>

          <div className="steps-grid scroll-stagger-grid">
            {STEPS.map((step, i) => (
              <ScrollReveal key={step.title} className="step-card" variant="scale" delay={i * 140}>
                <div className="step-number">{i + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <ScrollReveal className="cta-section" variant="scale" delay={80}>
          <h2>Ready to take control of your health?</h2>
          <p>Join thousands of patients who trust OrcaXCare for their healthcare needs.</p>
          <div className="cta-actions">
            <Link to="/register" className="btn btn-white btn-lg">
              Register Now
            </Link>
            <Link to="/search-doctors" className="btn btn-outline btn-hero-outline btn-lg">
              Browse Doctors
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </PageLayout>
  );
}
