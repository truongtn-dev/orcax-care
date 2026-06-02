import { useRef } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useHeroParallax } from "../hooks/useHeroParallax.js";

const BENEFITS = [
  {
    title: "Find the right doctor",
    description: "Browse specialists, compare profiles, and choose someone you trust.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    title: "Book visits online",
    description: "Pick a time slot, get confirmations, and change or cancel when plans shift.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    title: "Easy, secure payments",
    description: "Pay with wallet or popular gateways — always see what you paid and when.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    title: "Your records, together",
    description: "Visit notes, test images, and prescriptions — organized so you are not lost in paper.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
      </svg>
    ),
  },
  {
    title: "Less waiting, more clarity",
    description: "Know your queue status, get reminders, and find the nearest branch on a map.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    title: "Private by design",
    description: "Sign in safely, control your profile, and keep sensitive health information protected.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    title: "Create your account",
    description: "Register in minutes and verify your email to get started.",
  },
  {
    title: "Book with a doctor",
    description: "Search, choose a time, and confirm — add insurance or pay when you are ready.",
  },
  {
    title: "Visit & stay informed",
    description: "Check in, follow your care, and access results and prescriptions afterward.",
  },
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
              Trusted digital healthcare
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
                ? "Book appointments, manage your profile, and follow your care — all in one place."
                : "Find doctors, book visits, pay online, and keep your health information organized — without the hassle."}
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
                <span className="hero-stat-label">Online access</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <ScrollReveal className="section-header" variant="up">
            <span className="section-label">Why OrcaXCare</span>
            <h2>Care that fits real life</h2>
            <p>
              No technical jargon — just what matters: finding a doctor, getting to your appointment, and staying on top
              of your health afterward.
            </p>
          </ScrollReveal>

          <div className="features-grid scroll-stagger-grid">
            {BENEFITS.map((item, i) => (
              <ScrollReveal key={item.title} as="article" className="feature-card" variant="float" delay={i * 100}>
                <div className="feature-icon-wrap">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="section section-alt">
          <ScrollReveal className="section-header" variant="up">
            <span className="section-label">How it works</span>
            <h2>Three steps to get started</h2>
            <p>From your first sign-up to your next follow-up — straightforward at every stage.</p>
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
          <p>Create a free account or browse doctors — it only takes a minute to begin.</p>
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
