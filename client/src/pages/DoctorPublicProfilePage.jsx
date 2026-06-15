import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./DoctorPublicProfilePage.css";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function getInitials(name) {
  if (!name) return "D";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatRating(value, reviewCount) {
  if (value == null || reviewCount === 0) return "No ratings yet";
  return `${value.toFixed(1)} / 5 · ${reviewCount} reviews`;
}

export default function DoctorPublicProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    PublicApiClient.getDoctor(id)
      .then(({ data }) => setDoctor(data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || role !== "patient") {
      setIsFavorite(false);
      return;
    }

    let active = true;
    PatientApiClient.listFavoriteDoctors()
      .then(({ data }) => {
        if (!active) return;
        const found = (data.items || []).some((item) => item.doctorId === id);
        setIsFavorite(found);
      })
      .catch(() => {
        if (active) setIsFavorite(false);
      });

    return () => {
      active = false;
    };
  }, [id, isAuthenticated, role]);

  const handleBook = () => {
    navigate(`/patient/book?doctorId=${id}`);
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated || role !== "patient") return;

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await PatientApiClient.removeFavoriteDoctor(id);
        setIsFavorite(false);
      } else {
        await PatientApiClient.addFavoriteDoctor(id);
        setIsFavorite(true);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setFavoriteLoading(false);
    }
  };

  const languages = doctor?.languages?.length ? doctor.languages : ["Vietnamese"];
  const workplace = doctor?.workplace || doctor?.department?.name || "Not provided";
  const specialtyName = doctor?.specialty?.name || "Not provided";
  const initials = getInitials(doctor?.fullName);

  return (
    <PageLayout>
      <div className="doctor-profile-fullpage">
        {loading && (
          <div className="doctor-profile-loading">
            <div className="loading-spinner" />
            Loading doctor profile…
          </div>
        )}

        {error && !loading && (
          <div className="doctor-profile-page-body">
            <div className="alert alert-error">{error}</div>
          </div>
        )}

        {!loading && doctor && (
          <>
            <ScrollReveal variant="up">
              <section className="doctor-profile-hero doctor-profile-hero--fullbleed">
                <span className="doctor-profile-hero-orb doctor-profile-hero-orb--1" aria-hidden="true" />
                <span className="doctor-profile-hero-orb doctor-profile-hero-orb--2" aria-hidden="true" />

                <div className="doctor-profile-hero-content">
                  <div className="doctor-profile-hero-inner">
                    <div className="doctor-profile-avatar-wrap">
                      {doctor.photoUrl ? (
                        <img src={doctor.photoUrl} alt="" />
                      ) : (
                        <span aria-hidden="true">{initials}</span>
                      )}
                      <span className="doctor-profile-status" title="Accepting appointments">
                        <span className="doctor-profile-status-dot" />
                      </span>
                    </div>

                    <div className="doctor-profile-hero-main">
                      <p className="doctor-profile-eyebrow">OrcaXCare physician</p>
                      <h1>{doctor.fullName}</h1>
                      <p className="doctor-profile-specialty">{specialtyName}</p>
                      <div className="doctor-profile-hero-meta">
                        <span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                            <path d="M9 9V5a3 3 0 0 1 6 0v4" />
                          </svg>
                          {workplace}
                        </span>
                        {doctor.licenseNo && (
                          <span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            {doctor.licenseNo}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="doctor-profile-hero-aside">
                      <span className="doctor-profile-verified">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                        Verified profile
                      </span>
                      {isAuthenticated && role === "patient" ? (
                        <div className="doctor-profile-hero-actions">
                          <button type="button" className="btn doctor-profile-book-btn" onClick={handleBook}>
                            Book an appointment
                          </button>
                          <button
                            type="button"
                            className="btn doctor-profile-favorite-btn"
                            onClick={handleToggleFavorite}
                            disabled={favoriteLoading}
                          >
                            {favoriteLoading
                              ? "Updating..."
                              : isFavorite
                                ? "Remove from favorites"
                                : "Add to favorites"}
                          </button>
                        </div>
                      ) : (
                        <p className="doctor-profile-signin-note">
                          <Link to="/login" style={{ color: "inherit", fontWeight: 700 }}>
                            Sign in
                          </Link>{" "}
                          to book an appointment
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="doctor-profile-stats">
                    <div className="doctor-profile-stat">
                      <span className="doctor-profile-stat-label">Workplace</span>
                      <span className="doctor-profile-stat-value">{workplace}</span>
                    </div>
                    <div className="doctor-profile-stat">
                      <span className="doctor-profile-stat-label">Languages</span>
                      <span className="doctor-profile-stat-value">{languages.join(", ")}</span>
                    </div>
                    <div className="doctor-profile-stat">
                      <span className="doctor-profile-stat-label">Rating</span>
                      <span className="doctor-profile-stat-value">
                        {formatRating(doctor.reviewRating, doctor.reviewCount)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </ScrollReveal>

            <div className="doctor-profile-page-body">
              <div className="doctor-profile-body">
                <ScrollReveal variant="up" delay={40}>
                  <section className="doctor-profile-panel">
                    <div className="doctor-profile-panel-head">
                      <span className="doctor-profile-panel-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                          <path d="M14 2v6h6" />
                          <path d="M16 13H8" />
                          <path d="M16 17H8" />
                          <path d="M10 9H8" />
                        </svg>
                      </span>
                      <h2>About</h2>
                    </div>
                    <p className="doctor-profile-about-text">
                      {doctor.bio?.trim() ||
                        "OrcaXCare physician dedicated to patient care and follow-up."}
                    </p>
                  </section>
                </ScrollReveal>

                <ScrollReveal variant="up" delay={80}>
                  <section className="doctor-profile-panel">
                    <div className="doctor-profile-panel-head">
                      <span className="doctor-profile-panel-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4" />
                          <path d="M12 8h.01" />
                        </svg>
                      </span>
                      <h2>Details</h2>
                    </div>
                    <div className="doctor-profile-facts">
                      <div className="doctor-profile-fact">
                        <span className="doctor-profile-fact-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 2v2" />
                            <path d="M5 2v2" />
                            <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
                            <path d="M8 15h6" />
                            <path d="M8 19h6" />
                          </svg>
                        </span>
                        <div>
                          <span className="doctor-profile-fact-label">Specialty</span>
                          <span className="doctor-profile-fact-value">{specialtyName}</span>
                        </div>
                      </div>
                      <div className="doctor-profile-fact">
                        <span className="doctor-profile-fact-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                            <path d="M9 9V5a3 3 0 0 1 6 0v4" />
                          </svg>
                        </span>
                        <div>
                          <span className="doctor-profile-fact-label">Workplace</span>
                          <span className="doctor-profile-fact-value">{workplace}</span>
                        </div>
                      </div>
                      <div className="doctor-profile-fact">
                        <span className="doctor-profile-fact-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m5 8 6 6" />
                            <path d="m4 14 6-6 2-3" />
                            <path d="M2 5h12" />
                            <path d="M7 2h1" />
                            <path d="m22 22-5-10-5 10" />
                            <path d="M14 18h6" />
                          </svg>
                        </span>
                        <div>
                          <span className="doctor-profile-fact-label">Languages</span>
                          <span className="doctor-profile-fact-value">{languages.join(", ")}</span>
                        </div>
                      </div>
                      <div className="doctor-profile-fact">
                        <span className="doctor-profile-fact-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </span>
                        <div>
                          <span className="doctor-profile-fact-label">Patient rating</span>
                          <span className="doctor-profile-fact-value">
                            {formatRating(doctor.reviewRating, doctor.reviewCount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>
                </ScrollReveal>

                {doctor.reviewSummary && (
                  <ScrollReveal variant="up" delay={120}>
                    <section className="doctor-profile-panel doctor-profile-review">
                      <div className="doctor-profile-panel-head">
                        <span className="doctor-profile-panel-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </span>
                        <h2>Review summary</h2>
                      </div>
                      <p>{doctor.reviewSummary}</p>
                    </section>
                  </ScrollReveal>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
