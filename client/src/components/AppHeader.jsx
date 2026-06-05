import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import LogoIcon from "./LogoIcon.jsx";
import { formatRoleLabel } from "../utils/roleLabels.js";

const NAV_LINKS = [
  { to: "/", label: "Trang chủ" },
  { to: "/search-doctors", label: "Tìm bác sĩ" },
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
    role === "admin" ? "Quản trị hệ thống" : role === "doctor" ? "Khu vực bác sĩ" : "Trang cá nhân";

  const isActive = (path) => location.pathname === path;

  return (
    <header className={`app-header ${scrolled ? "app-header-scrolled" : ""}`}>
      <div className="header-inner">
        <Link to="/" className="logo">
          <LogoIcon />
          <span className="logo-text">
            Orca<span className="logo-accent">X</span>Care
          </span>
        </Link>

        <nav className={`nav ${menuOpen ? "nav-open" : ""}`} aria-label="Điều hướng chính">
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
                  Đăng nhập
                </Link>
                <Link to="/register" className="btn btn-primary btn-block">
                  Đăng ký
                </Link>
              </>
            ) : (
              <button type="button" className="btn btn-outline btn-block" onClick={handleLogout}>
                Đăng xuất
              </button>
            )}
          </div>
        </nav>

        <div className="header-actions">
          {!isAuthenticated ? (
            <>
              <Link to="/login" className="btn btn-ghost hide-mobile">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn btn-primary hide-mobile">
                Đăng ký
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
                aria-label="Menu người dùng"
              >
                <span className="avatar">{fullName?.charAt(0)?.toUpperCase() || "U"}</span>
                <span className="avatar-info hide-mobile">
                  <span className="avatar-name">{fullName || "Người dùng"}</span>
                  <span className="avatar-role">{formatRoleLabel(role)}</span>
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
                        <span className="dropdown-role">{formatRoleLabel(role)}</span>
                      </div>
                    </div>
                    {dashboardLink && (
                      <Link to={dashboardLink} role="menuitem" onClick={() => setUserMenuOpen(false)}>
                        {dashboardLabel}
                      </Link>
                    )}
                    <Link to="/profile" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                      Sửa hồ sơ
                    </Link>
                    <Link to="/change-password" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                      Đổi mật khẩu
                    </Link>
                    <div className="dropdown-divider" />
                    <button type="button" role="menuitem" className="dropdown-danger" onClick={handleLogout}>
                      Đăng xuất
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
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
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
