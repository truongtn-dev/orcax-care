export default function DoctorCardSkeleton() {
  return (
    <div className="doctor-card-premium doctor-card-skeleton" aria-hidden="true">
      <div className="skeleton skeleton-avatar" />
      <div className="skeleton skeleton-line skeleton-line-lg" />
      <div className="skeleton skeleton-pill" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line skeleton-line-short" />
      <div className="skeleton skeleton-footer" />
    </div>
  );
}
