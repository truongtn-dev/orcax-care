import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function formatRating(value) {
  if (value == null) return "No rating yet";
  return `${value.toFixed(1)} / 5.0`;
}

function Tag({ children }) {
  return <span className="status-badge status-badge-active">{children}</span>;
}

export default function DoctorPublicProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    PublicApiClient.getDoctor(id)
      .then(({ data }) => setDoctor(data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = () => {
    navigate("/search-doctors");
  };

  const languages = doctor?.languages?.length ? doctor.languages : ["English"];
  const workplace = doctor?.workplace || doctor?.department?.name || "Unknown workplace";

  return (
    <PageLayout>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <Link to="/search-doctors" className="back-link">
              ← Back to doctor search
            </Link>
            <h1>Doctor Profile</h1>
            <p>Explore the doctor's specialty, languages, workplace, and reviews.</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading profile…
        </div>
      )}

      {error && !loading && <div className="alert alert-error">{error}</div>}

      {!loading && doctor && (
        <div className="card">
          <div className="doctor-profile-header">
            <div className="doctor-profile-avatar large-avatar">
              {doctor.photoUrl ? (
                <img src={doctor.photoUrl} alt={doctor.fullName} />
              ) : (
                <span>{doctor.fullName?.charAt(0)?.toUpperCase() || "D"}</span>
              )}
            </div>
            <div className="doctor-profile-summary">
              <h2>{doctor.fullName}</h2>
              {doctor.specialty?.name && <p className="doctor-meta">{doctor.specialty.name}</p>}
              {doctor.department?.name && (
                <p className="doctor-meta">Workplace: {workplace}</p>
              )}
              <div className="doctor-profile-tags">
                {doctor.specialty?.code && <Tag>{doctor.specialty.code}</Tag>}
                {doctor.department?.name && <Tag>{workplace}</Tag>}
              </div>
            </div>
            <div className="doctor-profile-action">
              {isAuthenticated ? (
                <button type="button" className="btn btn-primary" onClick={handleBook}>
                  Book Appointment
                </button>
              ) : (
                <p className="field-note">Log in to see booking options.</p>
              )}
            </div>
          </div>

          <div className="detail-grid">
            <section className="card detail-section">
              <h3>About</h3>
              <p>{doctor.bio || "No profile description available."}</p>
            </section>

            <section className="card detail-section">
              <h3>Doctor details</h3>
              <div className="detail-list">
                <div className="detail-item">
                  <span className="detail-label">Specialty</span>
                  <span className="detail-value">{doctor.specialty?.name || "—"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Workplace</span>
                  <span className="detail-value">{workplace}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Languages</span>
                  <span className="detail-value">{languages.join(", ")}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Reviews</span>
                  <span className="detail-value">
                    {doctor.reviewCount > 0 ? (
                      <>
                        {formatRating(doctor.reviewRating)} · {doctor.reviewCount} review(s)
                      </>
                    ) : (
                      "No reviews yet"
                    )}
                  </span>
                </div>
                {doctor.reviewSummary && (
                  <div className="detail-item detail-item-full">
                    <span className="detail-label">Summary</span>
                    <span className="detail-value">{doctor.reviewSummary}</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
