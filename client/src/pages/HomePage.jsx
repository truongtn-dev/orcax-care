import { useEffect, useRef, useState } from "react";

import { Link } from "react-router-dom";

import PageLayout from "../components/PageLayout.jsx";

import ScrollReveal from "../components/ScrollReveal.jsx";

import DoctorSearchCard from "../components/DoctorSearchCard.jsx";

import DoctorCardSkeleton from "../components/DoctorCardSkeleton.jsx";

import BranchMap from "../components/BranchMap.jsx";

import { PublicApiClient } from "../services/publicApi.js";
import { getBranchPath } from "../utils/branchUrls.js";

import { useAuth } from "../context/AuthContext.jsx";

import { useHeroParallax } from "../hooks/useHeroParallax.js";

const FEATURED_DOCTORS_LIMIT = 6;

const NEWS_ITEMS = [
  {
    id: "flu-season",
    title: "Flu season reminders",
    summary: "Book preventive visits early and keep your insurance card ready at check-in.",
    date: "Jun 12, 2026",
  },
  {
    id: "wallet-topup",
    title: "Wallet top-up now supports SePay",
    summary: "Add funds instantly with VietQR before confirming your next appointment.",
    date: "Jun 8, 2026",
  },
  {
    id: "pediatrics",
    title: "Pediatrics walk-in hours expanded",
    summary: "Pediatrics Ward now offers additional afternoon slots on weekdays.",
    date: "Jun 3, 2026",
  },
];



const BENEFITS = [

  {

    title: "Find the right doctor",

    description: "Browse specialties, compare profiles, and choose a doctor you trust.",

    icon: (

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">

        <circle cx="11" cy="11" r="8" />

        <path d="m21 21-4.3-4.3" />

      </svg>

    ),

  },

  {

    title: "Book appointments online",

    description: "Pick a time slot, receive confirmation, and reschedule or cancel when needed.",

    icon: (

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">

        <rect x="3" y="4" width="18" height="18" rx="2" />

        <path d="M16 2v4M8 2v4M3 10h18" />

      </svg>

    ),

  },

  {

    title: "Convenient payments",

    description: "Pay with your wallet or popular payment gateways and track your history clearly.",

    icon: (

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">

        <rect x="2" y="5" width="20" height="14" rx="2" />

        <path d="M2 10h20" />

      </svg>

    ),

  },

  {

    title: "Centralized health records",

    description: "Visit notes, lab results, and prescriptions stored neatly and easy to access.",

    icon: (

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">

        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />

        <path d="M14 2v6h6M8 13h8M8 17h6" />

      </svg>

    ),

  },

  {

    title: "Shorter wait times",

    description: "Track queue status, get appointment reminders, and find nearby locations.",

    icon: (

      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">

        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />

        <path d="M13.73 21a2 2 0 0 1-3.46 0" />

      </svg>

    ),

  },

  {

    title: "Secure information",

    description: "Secure sign-in, profile management, and protection of your personal health data.",

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

    title: "Create an account",

    description: "Register in minutes and verify your email to get started.",

  },

  {

    title: "Book with a doctor",

    description: "Find a doctor, choose a suitable time slot, and confirm your appointment.",

  },

  {

    title: "Visit and follow up",

    description: "Attend on time, track your treatment, and review results and prescriptions after your visit.",

  },

];



export default function HomePage() {

  const heroRef = useRef(null);

  const { fullName, isAuthenticated, role } = useAuth();

  const [featuredDoctors, setFeaturedDoctors] = useState([]);

  const [featuredLoading, setFeaturedLoading] = useState(true);

  const [branches, setBranches] = useState([]);

  const [branchesLoading, setBranchesLoading] = useState(true);

  useHeroParallax(heroRef);

  useEffect(() => {

    let active = true;

    PublicApiClient.getFeaturedDoctors(FEATURED_DOCTORS_LIMIT)

      .then(({ data }) => {

        if (active) setFeaturedDoctors(data.items || []);

      })

      .catch(() => {

        if (active) setFeaturedDoctors([]);

      })

      .finally(() => {

        if (active) setFeaturedLoading(false);

      });

    return () => {

      active = false;

    };

  }, []);



  useEffect(() => {

    let active = true;

    PublicApiClient.listBranches()

      .then(({ data }) => {

        if (active) setBranches(data.items || []);

      })

      .catch(() => {

        if (active) setBranches([]);

      })

      .finally(() => {

        if (active) setBranchesLoading(false);

      });

    return () => {

      active = false;

    };

  }, []);



  const dashboardPath =

    role === "admin"
      ? "/admin"
      : role === "doctor"
        ? "/doctor"
        : role === "staff"
          ? "/staff"
          : role === "patient"
            ? "/patient"
            : null;



  return (

    <PageLayout>

      <div className="landing">

        <section className="hero-section" ref={heroRef}>

          <div className="hero-shapes" aria-hidden="true">

            <div className="hero-shape hero-shape-1" />

            <div className="hero-shape hero-shape-2" />

          </div>



          <div className="hero-content">

            <div className="hero-badge hero-animate-in">

              <span className="hero-badge-dot" />

              Trusted digital healthcare platform

            </div>



            <h1 className="hero-animate-in hero-animate-in-delay-1">

              {fullName ? (

                <>Welcome back, {fullName.split(" ")[0]}</>

              ) : (

                <>Healthcare made simple and secure</>

              )}

            </h1>



            <p className="hero-sub hero-animate-in hero-animate-in-delay-2">

              {isAuthenticated

                ? "Book appointments, manage your records, and follow your care — all in one place."

                : "Find doctors, book visits, pay online, and manage your health records — quickly and without hassle."}

            </p>



            <div className="hero-actions hero-animate-in hero-animate-in-delay-3">

              <Link to="/search-doctors" className="btn btn-white btn-lg">

                Find a doctor

              </Link>

              {!isAuthenticated && (

                <Link to="/register" className="btn btn-outline btn-hero-outline btn-lg">

                  Create an account

                </Link>

              )}

              {isAuthenticated && dashboardPath && (

                <Link to={dashboardPath} className="btn btn-outline btn-hero-outline btn-lg">

                  My dashboard

                </Link>

              )}

            </div>



            <div className="hero-stats hero-animate-in hero-animate-in-delay-4">

              <div className="hero-stat">

                <span className="hero-stat-value">500+</span>

                <span className="hero-stat-label">Doctors</span>

              </div>

              <div className="hero-stat">

                <span className="hero-stat-value">{branchesLoading ? "…" : `${branches.length || 3}+`}</span>

                <span className="hero-stat-label">Clinic branches</span>

              </div>

              <div className="hero-stat">

                <span className="hero-stat-value">24/7</span>

                <span className="hero-stat-label">Online support</span>

              </div>

            </div>

          </div>

        </section>



        {(featuredLoading || featuredDoctors.length > 0) && (

          <section className="section section-alt home-featured-doctors">

            <ScrollReveal className="section-header" variant="up">

              <span className="section-label">Featured doctors</span>

              <h2>Top-rated specialists</h2>

              <p>

                Browse highly rated doctors with open appointment slots — click a profile to view details and book.

              </p>

            </ScrollReveal>



            {featuredLoading && (

              <div className="doctor-grid-premium" aria-busy="true" aria-label="Loading featured doctors">

                {Array.from({ length: FEATURED_DOCTORS_LIMIT }).map((_, index) => (

                  <DoctorCardSkeleton key={index} />

                ))}

              </div>

            )}



            {!featuredLoading && featuredDoctors.length > 0 && (

              <>

                <div className="doctor-grid-premium scroll-stagger-grid">

                  {featuredDoctors.map((doctor, index) => (

                    <ScrollReveal key={doctor._id} variant="float" delay={index * 80}>

                      <DoctorSearchCard doctor={doctor} />

                    </ScrollReveal>

                  ))}

                </div>



                <div className="section-footer-actions">

                  <Link to="/search-doctors" className="btn btn-primary">

                    View all doctors

                  </Link>

                </div>

              </>

            )}

          </section>

        )}

        {(branchesLoading || branches.length > 0) && (

          <section className="section section-alt home-branches">

            <ScrollReveal className="section-header" variant="up">

              <span className="section-label">Our clinics</span>

              <h2>Find OrcaX Care near you</h2>

              <p>

                Visit us across Ho Chi Minh City — explore the map, then choose a clinic for directions, hours, and contact details.

              </p>

            </ScrollReveal>



            <ScrollReveal className="home-branches-map-stage" variant="up">

              {branchesLoading ? (

                <div className="home-branches-map-skeleton" aria-busy="true" aria-label="Loading branch map" />

              ) : (

                <BranchMap branches={branches} className="branch-map--home" />

              )}

            </ScrollReveal>



            <div className="home-branches-grid scroll-stagger-grid">

                {branchesLoading &&

                  Array.from({ length: 3 }).map((_, index) => (

                    <div key={index} className="home-branch-card home-branch-card--skeleton" aria-hidden="true" />

                  ))}



                {!branchesLoading &&

                  branches.map((branch, index) => (

                    <ScrollReveal key={branch._id} variant="float" delay={index * 90}>

                      <Link to={getBranchPath(branch)} className="home-branch-card">

                        <span className="home-branch-card-accent" aria-hidden="true" />

                        <div className="home-branch-card-head">

                          <span className="home-branch-card-index">{String(index + 1).padStart(2, "0")}</span>

                          <h3>{branch.name}</h3>

                        </div>

                        <p className="home-branch-card-address">

                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">

                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />

                            <circle cx="12" cy="10" r="3" />

                          </svg>

                          <span>{branch.address}</span>

                        </p>

                        <div className="home-branch-card-meta">

                          <span className="home-branch-chip">

                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">

                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />

                            </svg>

                            {branch.phone}

                          </span>

                          {branch.workingHours && (

                            <span className="home-branch-chip">

                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">

                                <circle cx="12" cy="12" r="10" />

                                <path d="M12 6v6l4 2" />

                              </svg>

                              {branch.workingHours}

                            </span>

                          )}

                        </div>

                        <span className="home-branch-card-action">

                          View clinic details

                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">

                            <path d="M5 12h14M13 5l7 7-7 7" />

                          </svg>

                        </span>

                      </Link>

                    </ScrollReveal>

                  ))}

            </div>



            {!branchesLoading && branches.length > 0 && (

              <div className="section-footer-actions">

                <Link to="/branches" className="btn btn-primary">

                  View all locations

                </Link>

              </div>

            )}

          </section>

        )}

        <section className="section home-news-strip">
          <ScrollReveal className="section-header" variant="up">
            <span className="section-label">News & updates</span>
            <h2>What&apos;s new at OrcaXCare</h2>
            <p>Service announcements and tips for patients and families.</p>
          </ScrollReveal>
          <div className="home-news-grid scroll-stagger-grid">
            {NEWS_ITEMS.map((item, index) => (
              <ScrollReveal key={item.id} variant="up" delay={index * 70}>
                <article className="card home-news-card">
                  <time className="home-news-date" dateTime={item.date}>
                    {item.date}
                  </time>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="section">

          <ScrollReveal className="section-header" variant="up">

            <span className="section-label">Why OrcaXCare</span>

            <h2>Built for everyday life</h2>

            <p>

              No complicated jargon — just what you need: find a doctor, keep your appointments, and follow your

              health after each visit.

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

            <h2>Get started in 3 steps</h2>

            <p>From registration to follow-up visits — a simple, easy-to-follow process.</p>

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

          <h2>Ready to take charge of your health?</h2>

          <p>Sign up for free or browse our doctors — it only takes a few minutes to get started.</p>

          <div className="cta-actions">

            <Link to="/register" className="btn btn-white btn-lg">

              Sign up now

            </Link>

            <Link to="/search-doctors" className="btn btn-outline btn-hero-outline btn-lg">

              Browse doctors

            </Link>

          </div>

        </ScrollReveal>

      </div>

    </PageLayout>

  );

}
