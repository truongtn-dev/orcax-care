import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import LogoIcon from "./LogoIcon.jsx";
import AppIcon from "./icons/AppIcon.jsx";
import { formatRoleLabel } from "../utils/roleLabels.js";
import "./PortalShell.css";

function NavIcon({ name }) {
  return <AppIcon name={name} size={18} className="portal-nav-icon" />;
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
  description,
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
                        <span className="portal-sidebar-link-label">{item.label}</span>
                        {item.badge != null && Number(item.badge) > 0 ? (
                          <span className="portal-nav-badge" aria-label={`${item.badge} alerts`}>
                            {Number(item.badge) > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
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
          {description ? <p className="portal-page-description">{description}</p> : null}
        </div>

        <div className="portal-content">
          {actions ? <div className="portal-page-actions">{actions}</div> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
