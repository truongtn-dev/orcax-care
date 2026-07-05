import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import LogoIcon from "./LogoIcon.jsx";
import AppIcon from "./icons/AppIcon.jsx";
import { formatRoleLabel } from "../utils/roleLabels.js";
import { NotificationApiClient } from "../services/notificationApi.js";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/search-doctors", label: "Find doctors" },
  { to: "/branches", label: "Branches" },
];

function UserAvatarStack({ name, imageUrl, className = "" }) {
  const initials = name?.charAt(0)?.toUpperCase() || "U";
  if (!imageUrl) {
    return <span className={`avatar ${className}`.trim()}>{initials}</span>;
  }
  return (
    <>
      <img
        src={imageUrl}
        alt=""
        className={`avatar avatar-photo ${className}`.trim()}
        onError={(event) => {
          event.currentTarget.style.display = "none";
          event.currentTarget.nextElementSibling?.classList.remove("avatar-fallback-hidden");
        }}
      />
      <span className={`avatar avatar-fallback-hidden ${className}`.trim()} aria-hidden="true">
        {initials}
      </span>
    </>
  );
}

export default function AppHeader() {
  const { isAuthenticated, role, fullName, avatarUrl, logout } = useAuth();
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

  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (role !== "patient") {
      setUnreadNotifications(0);
      return undefined;
    }

    let active = true;

    const loadUnread = () => {
      NotificationApiClient.listNotifications()
        .then(({ data }) => {
          if (active) setUnreadNotifications(data.unreadCount || 0);
        })
        .catch(() => {
          if (active) setUnreadNotifications(0);
        });
    };

    loadUnread();
    const timer = window.setInterval(loadUnread, 45000);
    const onUpdated = (event) => {
      if (typeof event.detail?.unreadCount === "number") {
        setUnreadNotifications(event.detail.unreadCount);
      } else {
        loadUnread();
      }
    };

    window.addEventListener("orcax:notifications-updated", onUpdated);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("orcax:notifications-updated", onUpdated);
    };
  }, [role, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
    window.history.replaceState(null, "", "/login");
  };

  const dashboardLink =
    role === "admin"
      ? "/admin"
      : role === "doctor"
        ? "/doctor"
        : role === "staff"
          ? "/staff"
          : role === "patient"
            ? "/patient"
            : null;

  const dashboardLabel =
    role === "admin"
      ? "Admin dashboard"
      : role === "doctor"
        ? "Doctor dashboard"
        : role === "staff"
          ? "Staff portal"
          : "My dashboard";

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
            {isAuthenticated && role === "patient" && (
              <Link
                to="/patient/notifications"
                className={`nav-link nav-link-mobile-only ${isActive("/patient/notifications") ? "nav-link-active" : ""}`}
              >
                Notifications
                {unreadNotifications > 0 ? ` (${unreadNotifications > 99 ? "99+" : unreadNotifications})` : ""}
              </Link>
            )}
          </div>

          <div className="nav-mobile-actions">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="btn btn-ghost btn-block">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn-primary btn-block">
                  Sign up
                </Link>
              </>
            ) : (
              <button type="button" className="btn btn-outline btn-block" onClick={handleLogout}>
                Log out
              </button>
            )}
          </div>
        </nav>

        <div className="header-actions">
          {!isAuthenticated ? (
            <>
              <Link to="/login" className="btn btn-ghost hide-mobile">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary hide-mobile">
                Sign up
              </Link>
            </>
          ) : (
            <div className="header-user-cluster">
              {role === "patient" && (
                <Link
                  to="/patient/notifications"
                  className={`header-notification-btn ${isActive("/patient/notifications") ? "is-active" : ""}`}
                  aria-label={
                    unreadNotifications > 0
                      ? `Notifications, ${unreadNotifications} unread`
                      : "Notifications"
                  }
                  title="Notifications"
                >
                  <AppIcon name="bell" size={22} />
                  {unreadNotifications > 0 && (
                    <span className="header-notification-badge">
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </span>
                  )}
                </Link>
              )}
              <div className="avatar-menu">
              <button
                type="button"
                className="avatar-btn"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="User menu"
              >
                <UserAvatarStack name={fullName} imageUrl={avatarUrl} />
                <span className="avatar-info hide-mobile">
                  <span className="avatar-name">{fullName || "User"}</span>
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
                      <UserAvatarStack name={fullName} imageUrl={avatarUrl} className="avatar-sm" />
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
                    {role === "patient" && (
                      <Link to="/patient/notifications" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                        Notifications
                        {unreadNotifications > 0 ? ` (${unreadNotifications})` : ""}
                      </Link>
                    )}
                    <Link to="/profile" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                      Edit profile
                    </Link>
                    <Link to="/change-password" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                      Change password
                    </Link>
                    <div className="dropdown-divider" />
                    <button type="button" role="menuitem" className="dropdown-danger" onClick={handleLogout}>
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
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
