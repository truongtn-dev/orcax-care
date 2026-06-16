import { Link } from "react-router-dom";
import { formatWalletCurrency } from "../utils/walletUtils.js";

function getInitials(name) {
  if (!name) return "D";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function DoctorSearchCard({ doctor }) {
  const { _id, fullName, bio, photoUrl, specialty, department, licenseNo, availability, consultationFee } =
    doctor;
  const initials = getInitials(fullName);
  const openSlots = availability?.availableCount || 0;

  return (
    <article className="doctor-card-premium">
      <div className="doctor-card-premium-accent" aria-hidden="true" />
      <div className="doctor-card-premium-header">
        <div className="doctor-card-avatar-ring">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="doctor-card-photo"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("doctor-card-initials-hidden");
              }}
            />
          ) : null}
          <span className={`doctor-card-initials ${photoUrl ? "doctor-card-initials-hidden" : ""}`}>
            {initials}
          </span>
          <span className="doctor-card-status" title="Accepting appointments">
            <span className="doctor-card-status-dot" />
          </span>
        </div>
        <div className="doctor-card-premium-titles">
          <h3>{fullName}</h3>
          {specialty?.name && (
            <span className="doctor-card-specialty-pill">{specialty.name}</span>
          )}
        </div>
      </div>

      <div className="doctor-card-premium-meta">
        {department?.name && (
          <span className="doctor-card-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
              <path d="M9 9V5a3 3 0 0 1 6 0v4" />
            </svg>
            {department.name}
          </span>
        )}
        {licenseNo && (
          <span className="doctor-card-meta-item doctor-card-license">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {licenseNo}
          </span>
        )}
      </div>

      <p className="doctor-card-premium-bio">{bio || "Experienced physician dedicated to patient care."}</p>

      {openSlots > 0 && (
        <p className="doctor-card-availability">
          {openSlots} open slot{openSlots === 1 ? "" : "s"} · from{" "}
          {formatWalletCurrency(consultationFee || 200000)}
        </p>
      )}

      <div className="doctor-card-premium-footer">
        <span className="doctor-card-verified">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Verified profile
        </span>
        <Link to={`/doctor/${_id}`} className="btn btn-primary btn-sm doctor-card-cta">
          View profile
        </Link>
      </div>
    </article>
  );
}
