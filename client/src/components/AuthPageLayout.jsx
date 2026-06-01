import PageLayout from "./PageLayout.jsx";

export default function AuthPageLayout({ title, subtitle, children }) {
  return (
    <PageLayout auth>
      <div className="auth-shell">
        <aside className="auth-brand" aria-hidden="false">
          <div className="auth-brand-content">
            <div className="auth-brand-badge">Healthcare Platform 2026</div>
            <h2>Care that moves with you</h2>
            <p>
              Secure access to doctors, appointments, and your health records — designed for clarity, speed, and peace
              of mind.
            </p>
            <ul className="auth-brand-features">
              <li>
                <span className="feature-icon" aria-hidden="true">✓</span>
                Verified doctors across specialties
              </li>
              <li>
                <span className="feature-icon" aria-hidden="true">✓</span>
                End-to-end encrypted accounts
              </li>
              <li>
                <span className="feature-icon" aria-hidden="true">✓</span>
                24/7 patient support
              </li>
            </ul>
          </div>
          <div className="auth-brand-visual" aria-hidden="true">
            <div className="auth-orb auth-orb-1" />
            <div className="auth-orb auth-orb-2" />
            <div className="auth-orb auth-orb-3" />
          </div>
        </aside>

        <div className="auth-form-panel">
          <div className="auth-card">
            <div className="auth-card-header">
              <h1>{title}</h1>
              {subtitle && <p className="muted">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
