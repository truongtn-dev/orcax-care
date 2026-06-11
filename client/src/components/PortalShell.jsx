import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import LogoIcon from "./LogoIcon.jsx";
import { formatRoleLabel } from "../utils/roleLabels.js";
import "./PortalShell.css";

function NavIcon({ name }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    calendar: (
      <>
        <path d="M8 2v4M16 2v4M3 10h18" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    stethoscope: (
      <>
        <path d="M11 2v2" />
        <path d="M5 2v2" />
        <path d="M5 3H4a2 2 0 0 0-2 2v3a6 6 0 0 0 6 6 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2h-1" />
        <path d="M8 15a6 6 0 0 0 12 0v-3" />
      </>
    ),
    building: (
      <>
        <path d="M3 21h18" />
        <path d="M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1" />
        <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      </>
    ),
    doctor: (
      <>
        <path d="M11 2v2M5 2v2" />
        <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
        <path d="M8 15a6 6 0 0 0 12 0v-2" />
      </>
    ),
    layers: (
      <>
        <path d="m12.83 2.18 8 4.58a1 1 0 0 1 0 1.64l-8 4.58a1 1 0 0 1-1.66 0l-8-4.58a1 1 0 0 1 0-1.64l8-4.58a1 1 0 0 1 1.66 0z" />
        <path d="M2.5 10.5 12 15l9.5-4.5M2.5 15.5 12 20l9.5-4.5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    list: (
      <>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </>
    ),
    user: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    staff: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 11v2a4 4 0 0 1-4 4h-1" />
        <path d="M16 11h6" />
      </>
    ),
    sparkles: (
      <>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        <path d="m5.6 5.6 2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      </>
    ),
  };

  return (
    <svg
      className="portal-nav-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {paths[name] || paths.list}
    </svg>
  );
}

function isPathActive(pathname, search, item) {
  if (item.match?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (item.tab) {
    const params = new URLSearchParams(search);
    const onDashboard = pathname === "/admin";
    return onDashboard && (params.get("tab") || "overview") === item.tab;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export default function PortalShell({
  children,
  portalLabel = "Portal",
  homeLink = "/",
  sections = [],
  title,
  actions,
}) {
  const { fullName, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const userInitial = fullName?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="portal-shell">
      <aside className={`portal-sidebar ${sidebarOpen ? "portal-sidebar-open" : ""}`}>
        <div className="portal-sidebar-brand">
          <Link to={homeLink} className="portal-sidebar-logo" onClick={() => setSidebarOpen(false)}>
            <LogoIcon />
            <span>
              <span className="portal-sidebar-logo-title">
                Orca<span className="logo-accent">X</span>Care
              </span>
              <small>{portalLabel}</small>
            </span>
          </Link>
        </div>

        <nav className="portal-sidebar-nav" aria-label={`${portalLabel} navigation`}>
          {sections.map((section) => (
            <div key={section.label}>
              <p className="portal-sidebar-label">{section.label}</p>
              <ul>
                {section.items.map((item) => {
                  const active = isPathActive(location.pathname, location.search, item);
                  return (
                    <li key={item.to + (item.tab || "")}>
                      <Link
                        to={item.to}
                        className={`portal-sidebar-link ${active ? "portal-sidebar-link-active" : ""}`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <NavIcon name={item.icon} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="portal-sidebar-footer">
          <div className="portal-user-card">
            <span className="portal-user-avatar" aria-hidden="true">
              {userInitial}
            </span>
            <div className="portal-user-meta">
              <span className="portal-user-name">{fullName || "User"}</span>
              <span className="portal-user-role">{formatRoleLabel(role)}</span>
            </div>
          </div>
          <button
            type="button"
            className="portal-sidebar-action portal-sidebar-action-muted"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="portal-sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="portal-main">
        <div className="portal-page-top">
          <button
            type="button"
            className="portal-menu-toggle"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          {title ? <h1 className="portal-page-title">{title}</h1> : null}
        </div>

        <div className="portal-content">
          {actions ? <div className="portal-page-actions">{actions}</div> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
