import PageLayout from "./PageLayout.jsx";



export default function AuthPageLayout({ title, subtitle, children }) {

  return (

    <PageLayout auth>

      <div className="auth-shell">

        <aside className="auth-brand" aria-hidden="false">

          <div className="auth-brand-content">

            <div className="auth-brand-badge">Nền tảng y tế số</div>

            <h2>Đồng hành cùng sức khỏe của bạn</h2>

            <p>

              Tra cứu bác sĩ, đặt lịch khám và quản lý hồ sơ sức khỏe một cách an toàn, thuận tiện.

            </p>

            <ul className="auth-brand-features">

              <li>

                <span className="feature-icon" aria-hidden="true">✓</span>

                Đội ngũ bác sĩ đã được xác minh

              </li>

              <li>

                <span className="feature-icon" aria-hidden="true">✓</span>

                Thông tin tài khoản được bảo mật

              </li>

              <li>

                <span className="feature-icon" aria-hidden="true">✓</span>

                Hỗ trợ người dùng 24/7

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

