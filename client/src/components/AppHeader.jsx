import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/search-doctors", label: "Find Doctors" },
];

export default function AppHeader() {
  const { isAuthenticated, role, fullName, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
    window.history.replaceState(null, "", "/login");
  };

  const dashboardLink =
    role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : role === "patient" ? "/patient" : null;

  const dashboardLabel =
    role === "admin" ? "Admin Panel" : role === "doctor" ? "Doctor Portal" : "My Dashboard";

  const isActive = (path) => location.pathname === path;

  return (
    <header className={`app-header ${scrolled ? "app-header-scrolled" : ""}`}>
      <div className="header-inner">
        <Link to="/" className="logo">
          <span className="logo-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="currentColor" fillOpacity="0.12" />
              <path
                d="M8 16c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path d="M16 8v16M10 13h12M10 19h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="logo-text">
            Orca<span className="logo-accent">X</span>Care
          </span>
        </Link>

        <nav className={`nav ${menuOpen ? "nav-open" : ""}`} aria-label="Main navigation">
          <div className="nav-links">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className={`nav-link ${isActive(to) ? "nav-link-active" : ""}`}>
                {label}
              </Link>
            ))}
            {isAuthenticated && dashboardLink && (
              <Link
                to={dashboardLink}
                className={`nav-link ${isActive(dashboardLink) ? "nav-link-active" : ""}`}
              >
                {dashboardLabel}
              </Link>
            )}
          </div>

          <div className="nav-mobile-actions">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="btn btn-ghost btn-block">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary btn-block">
                  Get Started
                </Link>
              </>
            ) : (
              <button type="button" className="btn btn-outline btn-block" onClick={handleLogout}>
                Log Out
              </button>
            )}
          </div>
        </nav>

        <div className="header-actions">
          {!isAuthenticated ? (
            <>
              <Link to="/login" className="btn btn-ghost hide-mobile">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary hide-mobile">
                Get Started
              </Link>
            </>
          ) : (
            <div className="avatar-menu">
              <button
                type="button"
                className="avatar-btn"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="User menu"
              >
                <span className="avatar">{fullName?.charAt(0)?.toUpperCase() || "U"}</span>
                <span className="avatar-info hide-mobile">
                  <span className="avatar-name">{fullName || "User"}</span>
                  <span className="avatar-role">{role}</span>
                </span>
                <svg className="avatar-chevron hide-mobile" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {userMenuOpen && (
                <>
                  <div className="dropdown-backdrop" onClick={() => setUserMenuOpen(false)} aria-hidden="true" />
                  <div className="dropdown" role="menu">
                    <div className="dropdown-header">
                      <span className="avatar avatar-sm">{fullName?.charAt(0)?.toUpperCase() || "U"}</span>
                      <div>
                        <strong>{fullName}</strong>
                        <span className="dropdown-role">{role}</span>
                      </div>
                    </div>
                    {dashboardLink && (
                      <Link to={dashboardLink} role="menuitem" onClick={() => setUserMenuOpen(false)}>
                        {dashboardLabel}
                      </Link>
                    )}
                    <Link to="/change-password" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                      Change Password
                    </Link>
                    <div className="dropdown-divider" />
                    <button type="button" role="menuitem" className="dropdown-danger" onClick={handleLogout}>
                      Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            className={`menu-toggle ${menuOpen ? "menu-toggle-open" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {menuOpen && <div className="nav-overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
    </header>
  );
}
