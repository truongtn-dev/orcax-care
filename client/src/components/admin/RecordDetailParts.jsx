import RecordAvatar from "../RecordAvatar.jsx";

export function StatusBadge({ active, label }) {
  return (
    <span className={`status-badge ${active ? "status-badge-active" : "status-badge-inactive"}`}>
      {label}
    </span>
  );
}

export function DetailItem({ label, value, children, fullWidth = false }) {
  return (
    <div className={`detail-item ${fullWidth ? "detail-item-full" : ""}`}>
      <span className="detail-label">{label}</span>
      <span className="detail-value">{children ?? value ?? "—"}</span>
    </div>
  );
}

export function RecordDetailHeader({ name, email, imageUrl, badges, meta }) {
  return (
    <div className="card account-detail-header record-detail-header">
      <RecordAvatar name={name} imageUrl={imageUrl} size="lg" />
      <div className="record-detail-header-body">
        <h2>{name}</h2>
        {email && <p className="record-detail-email">{email}</p>}
        {meta}
        {badges?.length > 0 && <div className="status-badge-group">{badges}</div>}
      </div>
    </div>
  );
}

export function RecordDetailSection({ title, actions, children }) {
  return (
    <section className="card detail-section record-detail-section">
      {actions ? (
        <div className="detail-section-header">
          <h3>{title}</h3>
          <div className="detail-section-actions">{actions}</div>
        </div>
      ) : (
        <h3>{title}</h3>
      )}
      {children}
    </section>
  );
}

export function RecordIdChip({ label, value }) {
  if (!value) return null;
  return (
    <DetailItem label={label} fullWidth>
      <code className="record-id-chip">{value}</code>
    </DetailItem>
  );
}
