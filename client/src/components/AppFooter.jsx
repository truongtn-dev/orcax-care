import { Link } from "react-router-dom";
import LogoIcon from "./LogoIcon.jsx";

const QUICK_LINKS = [
  { to: "/", label: "Trang chủ" },
  { to: "/search-doctors", label: "Tìm bác sĩ" },
  { to: "/register", label: "Đăng ký" },
  { to: "/login", label: "Đăng nhập" },
];

const SUPPORT_LINKS = [
  { to: "/forgot-password", label: "Quên mật khẩu" },
  { to: "/verify-email", label: "Xác minh email" },
  { to: "/change-password", label: "Đổi mật khẩu" },
];

export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <LogoIcon bgOpacity={0.15} />
              OrcaXCare
            </Link>
            <p className="footer-tagline">
              Nền tảng y tế số giúp bạn tìm bác sĩ, đặt lịch khám và quản lý hồ sơ sức khỏe mọi lúc, mọi nơi.
            </p>
          </div>

          <div className="footer-col">
            <h4>Liên kết nhanh</h4>
            <ul>
              {QUICK_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Tài khoản</h4>
            <ul>
              {SUPPORT_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Liên hệ</h4>
            <ul className="footer-contact">
              <li>
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                support@orcaxcare.com
              </li>
              <li>
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                1900 1234
              </li>
              <li>
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                Thành phố Hồ Chí Minh, Việt Nam
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {year} OrcaXCare. Bảo lưu mọi quyền.</p>
          <div className="footer-bottom-links">
            <a href="#privacy">Chính sách bảo mật</a>
            <a href="#terms">Điều khoản dịch vụ</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
