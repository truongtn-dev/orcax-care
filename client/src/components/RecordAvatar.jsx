export default function RecordAvatar({ name, imageUrl, size = "lg" }) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className={`record-avatar record-avatar--${size}`} aria-hidden="true">
      {imageUrl ? (
        <img src={imageUrl} alt="" />
      ) : (
        <span className="record-avatar-initials">{initial}</span>
      )}
    </div>
  );
}
