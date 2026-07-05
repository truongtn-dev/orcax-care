import { Link } from "react-router-dom";
import { getBranchPath } from "../utils/branchUrls.js";
import "./ClinicBranchCard.css";

export default function ClinicBranchCard({ branch, index = 0, to, onMouseEnter, onFocus }) {
  const href = to || getBranchPath(branch);

  return (
    <Link
      to={href}
      className="clinic-branch-card"
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
    >
      <span className="clinic-branch-card-accent" aria-hidden="true" />

      <div className="clinic-branch-card-head">
        <span className="clinic-branch-card-index">{String(index + 1).padStart(2, "0")}</span>
        <h3>{branch.name}</h3>
      </div>

      <p className="clinic-branch-card-address">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>{branch.address}</span>
      </p>

      <div className="clinic-branch-card-meta">
        <span className="clinic-branch-chip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          {branch.phone}
        </span>
        {branch.workingHours && (
          <span className="clinic-branch-chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {branch.workingHours}
          </span>
        )}
      </div>

      <span className="clinic-branch-card-action">
        View clinic details
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}
