import PageLayout from "./PageLayout.jsx";



export default function AuthPageLayout({ title, subtitle, children }) {

  return (

    <PageLayout auth>

      <div className="auth-shell">

        <aside className="auth-brand" aria-hidden="false">

          <div className="auth-brand-content">

            <div className="auth-brand-badge">Digital health platform</div>

            <h2>Here for your health</h2>

            <p>

              Find doctors, book appointments, and manage your health records safely and easily.

            </p>

            <ul className="auth-brand-features">

              <li>

                <span className="feature-icon" aria-hidden="true">✓</span>

                Verified doctor network

              </li>

              <li>

                <span className="feature-icon" aria-hidden="true">✓</span>

                Secure account information

              </li>

              <li>

                <span className="feature-icon" aria-hidden="true">✓</span>

                24/7 user support

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

