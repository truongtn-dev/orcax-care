import { Link } from "react-router-dom";
import LogoIcon from "./LogoIcon.jsx";

const QUICK_LINKS = [
  { to: "/", label: "Home" },
  { to: "/search-doctors", label: "Find doctors" },
  { to: "/register", label: "Sign up" },
  { to: "/login", label: "Sign in" },
];

const SUPPORT_LINKS = [
  { to: "/forgot-password", label: "Forgot password" },
  { to: "/verify-email", label: "Verify email" },
  { to: "/change-password", label: "Change password" },
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
              A digital health platform to find doctors, book appointments, and manage your health records anytime, anywhere.
            </p>
          </div>

          <div className="footer-col">
            <h4>Quick links</h4>
            <ul>
              {QUICK_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Account</h4>
            <ul>
              {SUPPORT_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Contact</h4>
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
                Ho Chi Minh City, Vietnam
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {year} OrcaXCare. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#privacy">Privacy policy</a>
            <a href="#terms">Terms of service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
