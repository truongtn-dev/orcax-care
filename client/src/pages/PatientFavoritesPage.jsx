import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";

function getInitials(name) {
  if (!name) return "D";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function PatientFavoritesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState("");
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadFavorites() {
      setLoading(true);
      setError("");
      try {
        const { data } = await PatientApiClient.listFavoriteDoctors();
        if (!active) return;
        setItems(data.items || []);
      } catch (err) {
        if (!active) return;
        setError(getApiErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFavorites();
    return () => {
      active = false;
    };
  }, []);

  const showUndoNotice = (entry) => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }

    setNotice({
      doctorId: entry.doctorId,
      doctorName: entry.doctor.fullName,
      entry,
      restoring: false,
    });

    noticeTimerRef.current = setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 6000);
  };

  const handleRemove = async (entry) => {
    setError("");
    setRemovingId(entry.doctorId);

    const previousItems = items;
    setItems((current) => current.filter((item) => item.doctorId !== entry.doctorId));

    try {
      await PatientApiClient.removeFavoriteDoctor(entry.doctorId);
      showUndoNotice(entry);
    } catch (err) {
      setItems(previousItems);
      setError(getApiErrorMessage(err));
    } finally {
      setRemovingId("");
    }
  };

  const handleUndo = async () => {
    if (!notice?.doctorId || notice.restoring) return;

    setNotice((current) => (current ? { ...current, restoring: true } : current));
    setError("");

    try {
      await PatientApiClient.addFavoriteDoctor(notice.doctorId);
      setItems((current) => {
        if (current.some((item) => item.doctorId === notice.doctorId)) {
          return current;
        }
        return [notice.entry, ...current];
      });
      setNotice(null);
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = null;
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
      setNotice((current) => (current ? { ...current, restoring: false } : current));
    }
  };

  return (
    <PageLayout>
      <div className="patient-dashboard">
        <ScrollReveal variant="up">
          <section className="patient-dashboard-hero">
            <div className="patient-dashboard-hero-orb patient-dashboard-hero-orb--1" aria-hidden="true" />
            <div className="patient-dashboard-hero-orb patient-dashboard-hero-orb--2" aria-hidden="true" />
            <div className="patient-dashboard-hero-inner">
              <div className="patient-dashboard-hero-main">
                <p className="patient-dashboard-hero-eyebrow">Favorites</p>
                <h1>Saved doctors</h1>
                <p className="patient-dashboard-hero-lead">
                  Keep your frequently visited doctors in one place and remove them anytime.
                </p>
                <div className="patient-dashboard-hero-actions">
                  <Link to="/search-doctors" className="btn btn-primary">
                    Find doctors
                  </Link>
                  <Link to="/patient" className="btn btn-outline">
                    Back to dashboard
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {error && <div className="alert alert-error">{error}</div>}
        {notice && (
          <div className="alert alert-success" style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
            <span>{notice.doctorName} removed from favorites.</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleUndo} disabled={notice.restoring}>
              {notice.restoring ? "Restoring..." : "Undo"}
            </button>
          </div>
        )}

        <section className="patient-dashboard-section">
          <div className="patient-section-pill patient-section-pill--cyan">Favorite doctors</div>
          <div className="doctor-grid-premium">
            {loading && <div className="card empty-state">Loading favorites...</div>}

            {!loading && items.length === 0 && (
              <div className="card empty-state">
                <h3>No favorite doctors yet</h3>
                <p>Save doctors from profile pages to access them quickly later.</p>
                <div className="form-actions">
                  <Link to="/search-doctors" className="btn btn-primary">
                    Browse doctors
                  </Link>
                </div>
              </div>
            )}

            {!loading &&
              items.map((item) => {
                const doctor = item.doctor;
                const initials = getInitials(doctor.fullName);

                return (
                  <article key={item.doctorId} className="doctor-card-premium">
                    <div className="doctor-card-premium-accent" aria-hidden="true" />
                    <div className="doctor-card-premium-header">
                      <div className="doctor-card-avatar-ring">
                        {doctor.photoUrl ? (
                          <img src={doctor.photoUrl} alt="" className="doctor-card-photo" loading="lazy" />
                        ) : null}
                        <span className={`doctor-card-initials ${doctor.photoUrl ? "doctor-card-initials-hidden" : ""}`}>
                          {initials}
                        </span>
                      </div>
                      <div className="doctor-card-premium-titles">
                        <h3>{doctor.fullName}</h3>
                        {doctor.specialty?.name && (
                          <span className="doctor-card-specialty-pill">{doctor.specialty.name}</span>
                        )}
                      </div>
                    </div>

                    <p className="doctor-card-premium-bio">
                      {doctor.bio || "Experienced physician dedicated to patient care."}
                    </p>

                    <div className="doctor-card-premium-footer">
                      <Link to={`/doctor/${doctor._id}`} className="btn btn-primary btn-sm doctor-card-cta">
                        View profile
                      </Link>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleRemove(item)}
                        disabled={removingId === item.doctorId}
                      >
                        {removingId === item.doctorId ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
