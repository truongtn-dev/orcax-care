import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./DoctorPublicProfilePage.css";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import DoctorAvailabilityPanel from "../components/DoctorAvailabilityPanel.jsx";
import {
  IconAbout,
  IconCalendar,
  IconDetails,
  IconReview,
} from "../components/DoctorProfileIcons.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import DoctorRatingDisplay from "../components/DoctorRatingDisplay.jsx";
import { getDoctorProfilePath, isMongoObjectId } from "../utils/doctorUrls.js";

function getInitials(name) {
  if (!name) return "D";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function DoctorPublicProfilePage() {
  const { slug: slugParam } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [profileTab, setProfileTab] = useState("info");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    PublicApiClient.getDoctor(slugParam)
      .then(({ data }) => setDoctor(data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [slugParam]);

  useEffect(() => {
    if (!doctor?._id) return;
    PublicApiClient.listDoctorReviews(doctor._id, { limit: 20 })
      .then(({ data }) => setReviews(data.items || []))
      .catch(() => setReviews([]));
  }, [doctor?._id]);

  useEffect(() => {
    if (!doctor?.slug) return;
    if (isMongoObjectId(slugParam) && doctor.slug !== slugParam) {
      navigate(getDoctorProfilePath(doctor), { replace: true });
    }
  }, [doctor, slugParam, navigate]);

  useEffect(() => {
    if (!isAuthenticated || role !== "patient" || !doctor?._id) {
      setIsFavorite(false);
      return;
    }

    let active = true;
    PatientApiClient.listFavoriteDoctors()
      .then(({ data }) => {
        if (!active) return;
        const found = (data.items || []).some((item) => item.doctorId === doctor._id);
        setIsFavorite(found);
      })
      .catch(() => {
        if (active) setIsFavorite(false);
      });

    return () => {
      active = false;
    };
  }, [doctor?._id, isAuthenticated, role]);

  const handleBook = () => {
    if (!doctor?._id) return;

    if (isAuthenticated) {
      navigate(`/patient/book?doctorId=${doctor._id}`);
      return;
    }
    navigate(`/login?next=${encodeURIComponent(`/patient/book?doctorId=${doctor._id}`)}`);
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated || role !== "patient" || !doctor?._id) return;

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await PatientApiClient.removeFavoriteDoctor(doctor._id);
        setIsFavorite(false);
      } else {
        await PatientApiClient.addFavoriteDoctor(doctor._id);
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
                    <div className="doctor-profile-stat doctor-profile-stat--rating">
                      <span className="doctor-profile-stat-label">Rating</span>
                      <DoctorRatingDisplay
                        rating={doctor.reviewRating}
                        reviewCount={doctor.reviewCount}
                        variant="light"
                        compact
                      />
                    </div>
                  </div>
                </div>
              </section>
            </ScrollReveal>

            <div className="doctor-profile-page-body">
              <div className="doctor-profile-body">
                <div className="doctor-profile-main">
                  <div className="doctor-profile-tabs" role="tablist" aria-label="Doctor profile sections">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={profileTab === "info"}
                      className={profileTab === "info" ? "is-active" : ""}
                      onClick={() => setProfileTab("info")}
                    >
                      Information
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={profileTab === "reviews"}
                      className={profileTab === "reviews" ? "is-active" : ""}
                      onClick={() => setProfileTab("reviews")}
                    >
                      Reviews ({doctor.reviewCount || reviews.length})
                    </button>
                  </div>

                  {profileTab === "info" && (
                  <>
                  <ScrollReveal variant="up" delay={40}>
                    <section className="doctor-profile-panel doctor-profile-panel--compact">
                      <div className="doctor-profile-panel-head">
                        <span className="doctor-profile-panel-icon" aria-hidden="true">
                          <IconAbout />
                        </span>
                        <h2>About</h2>
                      </div>
                      <p className="doctor-profile-about-text">
                        {doctor.bio?.trim() ||
                          "OrcaXCare physician dedicated to patient care and follow-up."}
                      </p>
                    </section>
                  </ScrollReveal>

                  <ScrollReveal variant="up" delay={120}>
                    <section className="doctor-profile-panel doctor-profile-panel--booking" id="doctor-availability">
                      <div className="doctor-profile-panel-head">
                        <span className="doctor-profile-panel-icon" aria-hidden="true">
                          <IconCalendar />
                        </span>
                        <h2>Book an appointment</h2>
                      </div>
                      <DoctorAvailabilityPanel
                        doctorId={doctor._id}
                        consultationFee={doctor.consultationFee}
                        isAuthenticated={isAuthenticated}
                        variant="profile"
                      />
                    </section>
                  </ScrollReveal>
                  </>
                  )}

                  {profileTab === "reviews" && (
                    <ScrollReveal variant="up" delay={40}>
                      <section className="doctor-profile-panel doctor-profile-panel--compact">
                        <div className="doctor-profile-panel-head">
                          <span className="doctor-profile-panel-icon" aria-hidden="true">
                            <IconReview />
                          </span>
                          <h2>Patient reviews</h2>
                        </div>
                        {reviews.length === 0 ? (
                          <p className="doctor-profile-about-text">No public reviews yet.</p>
                        ) : (
                          <ul className="doctor-profile-review-list">
                            {reviews.map((review) => (
                              <li key={review._id} className="doctor-profile-review-item">
                                <div className="doctor-profile-review-head">
                                  <strong>{review.patientDisplayName}</strong>
                                  <DoctorRatingDisplay rating={review.rating} reviewCount={0} compact />
                                </div>
                                <p>{review.comment || "No written comment."}</p>
                                <span>{new Date(review.reviewedAt).toLocaleDateString()}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    </ScrollReveal>
                  )}
                </div>

                <aside className="doctor-profile-sidebar">
                  <ScrollReveal variant="up" delay={80}>
                    <section className="doctor-profile-panel doctor-profile-panel--compact">
                    <div className="doctor-profile-panel-head">
                      <span className="doctor-profile-panel-icon" aria-hidden="true">
                        <IconDetails />
                      </span>
                      <h2>Details</h2>
                    </div>
                    <dl className="doctor-profile-facts">
                      <div className="doctor-profile-fact">
                        <dt>Specialty</dt>
                        <dd>{specialtyName}</dd>
                      </div>
                      <div className="doctor-profile-fact">
                        <dt>Workplace</dt>
                        <dd>{workplace}</dd>
                      </div>
                      <div className="doctor-profile-fact">
                        <dt>Languages</dt>
                        <dd>{languages.join(", ")}</dd>
                      </div>
                      <div className="doctor-profile-fact doctor-profile-fact--rating">
                        <dt>Patient rating</dt>
                        <dd>
                          <DoctorRatingDisplay
                            rating={doctor.reviewRating}
                            reviewCount={doctor.reviewCount}
                            variant="panel"
                          />
                        </dd>
                      </div>
                    </dl>
                  </section>
                </ScrollReveal>

                  {doctor.reviewSummary && (
                    <ScrollReveal variant="up" delay={100}>
                      <section className="doctor-profile-panel doctor-profile-panel--compact doctor-profile-review">
                        <div className="doctor-profile-panel-head">
                          <span className="doctor-profile-panel-icon" aria-hidden="true">
                            <IconReview />
                          </span>
                          <h2>Review summary</h2>
                        </div>
                        <p>{doctor.reviewSummary}</p>
                      </section>
                    </ScrollReveal>
                  )}
                </aside>
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
