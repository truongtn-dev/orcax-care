import "./DoctorRatingDisplay.css";

function filledStarCount(rating) {
  const value = Number(rating);
  if (Number.isNaN(value) || value <= 0) return 0;
  return Math.min(5, Math.max(0, Math.round(value)));
}

export default function DoctorRatingDisplay({
  rating,
  reviewCount = 0,
  variant = "default",
  compact = false,
}) {
  const count = Number(reviewCount) || 0;
  const hasReviews = count > 0 && rating != null && Number(rating) > 0;
  const score = hasReviews ? Number(rating).toFixed(1) : null;
  const stars = hasReviews ? filledStarCount(rating) : 0;

  if (!hasReviews) {
    return (
      <span className={`doctor-rating doctor-rating--empty doctor-rating--${variant}`}>
        No reviews yet
      </span>
    );
  }

  const reviewLabel = `${count} ${count === 1 ? "review" : "reviews"}`;

  return (
    <div
      className={`doctor-rating doctor-rating--${variant}${compact ? " doctor-rating--compact" : ""}`}
      aria-label={`Rated ${score} out of 5 from ${reviewLabel}`}
    >
      <div className="doctor-rating-stars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={`doctor-rating-star ${star <= stars ? "is-filled" : ""}`}>
            ★
          </span>
        ))}
      </div>
      <div className="doctor-rating-meta">
        <strong className="doctor-rating-score">{score}</strong>
        <span className="doctor-rating-count">{reviewLabel}</span>
      </div>
    </div>
  );
}
