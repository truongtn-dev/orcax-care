import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import LogoIcon from "./LogoIcon.jsx";
import { formatRoleLabel } from "../utils/roleLabels.js";
import "./AdminLayout.css";

export const ADMIN_DASHBOARD_TABS = [
  { id: "accounts", label: "Tài khoản" },
  { id: "specialties", label: "Chuyên khoa" },
  { id: "rooms", label: "Phòng khám" },
  { id: "doctors", label: "Hồ sơ bác sĩ" },
  { id: "departments", label: "Khoa/phòng ban" },
];

export const ADMIN_PAGE_LINKS = [
  { to: "/admin/account", label: "Danh sách tài khoản", match: ["/admin/account"] },
  { to: "/admin/patient", label: "Quản lý bệnh nhân", match: ["/admin/patient"] },
  { to: "/admin/specialty", label: "Quản lý chuyên khoa", match: ["/admin/specialty"] },
  { to: "/admin/clinic-room", label: "Quản lý phòng khám", match: ["/admin/clinic-room"] },
];

const TAB_META = {
  accounts: {
    title: "Tài khoản",
    description: "Quản lý tài khoản hệ thống, vai trò và trạng thái hoạt động.",
  },
  specialties: {
    title: "Chuyên khoa",
    description: "Danh mục chuyên khoa lâm sàng trên hệ thống.",
  },
  rooms: {
    title: "Phòng khám",
    description: "Quản lý phòng khám và trạng thái sử dụng.",
  },
  doctors: {
    title: "Hồ sơ bác sĩ",
    description: "Tra cứu và xuất danh sách bác sĩ.",
  },
  departments: {
    title: "Khoa/phòng ban",
    description: "Danh mục khoa, phòng ban và thông tin liên quan.",
  },
};

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
        <path d="M9 8h1" />
        <path d="M9 12h1" />
        <path d="M9 16h1" />
        <path d="M14 8h1" />
        <path d="M14 12h1" />
        <path d="M14 16h1" />
        <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      </>
    ),
    doctor: (
      <>
        <path d="M11 2v2" />
        <path d="M5 2v2" />
        <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
        <path d="M8 15a6 6 0 0 0 12 0v-2" />
      </>
    ),
    layers: (
      <>
        <path d="m12.83 2.18 8 4.58a1 1 0 0 1 0 1.64l-8 4.58a1 1 0 0 1-1.66 0l-8-4.58a1 1 0 0 1 0-1.64l8-4.58a1 1 0 0 1 1.66 0z" />
        <path d="M2.5 10.5 12 15l9.5-4.5" />
        <path d="M2.5 15.5 12 20l9.5-4.5" />
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
  };

  return (
    <svg
      className="admin-nav-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

const TAB_ICONS = {
  accounts: "users",
  specialties: "stethoscope",
  rooms: "building",
  doctors: "doctor",
  departments: "layers",
};

function isPathActive(pathname, matchPaths) {
  return matchPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function buildBreadcrumbs({ isDashboard, activeTab, pathname, pageTitle }) {
  const crumbs = [{ label: "Quản trị", to: "/admin" }];

  if (isDashboard) {
    crumbs.push({ label: "Tổng quan", to: `/admin?tab=${activeTab}` });
    const tab = ADMIN_DASHBOARD_TABS.find((item) => item.id === activeTab);
    crumbs.push({ label: tab?.label || pageTitle, current: true });
    return crumbs;
  }

  const pageLink = ADMIN_PAGE_LINKS.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );

  if (pageLink && pageLink.label !== pageTitle) {
    crumbs.push({ label: pageLink.label, to: pageLink.to });
    crumbs.push({ label: pageTitle, current: true });
  } else {
    crumbs.push({ label: pageTitle, current: true });
  }

  return crumbs;
}

function FooterIcon({ name }) {
  if (name === "home") {
    return (
      <svg className="admin-sidebar-action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  }

  return (
    <svg className="admin-sidebar-action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function AdminLayout({ children, title, description, actions }) {
  const { fullName, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isDashboard = location.pathname === "/admin";
  const activeTab = searchParams.get("tab") || "accounts";
  const tabMeta = isDashboard ? TAB_META[activeTab] : null;

  const pageTitle = title || tabMeta?.title || "Quản trị hệ thống";
  const pageDescription =
    description || tabMeta?.description || "Quản lý dữ liệu và cấu hình hệ thống OrcaXCare.";
  const breadcrumbs = buildBreadcrumbs({
    isDashboard,
    activeTab,
    pathname: location.pathname,
    pageTitle,
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const userInitial = fullName?.charAt(0)?.toUpperCase() || "Q";

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${sidebarOpen ? "admin-sidebar-open" : ""}`}>
        <div className="admin-sidebar-brand">
          <Link to="/admin" className="admin-sidebar-logo" onClick={() => setSidebarOpen(false)}>
            <LogoIcon />
            <span>
              <span className="admin-sidebar-logo-title">
                Orca<span className="logo-accent">X</span>Care
              </span>
              <small>Quản trị</small>
            </span>
          </Link>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Điều hướng quản trị">
          <p className="admin-sidebar-label">Tổng quan</p>
          <ul>
            {ADMIN_DASHBOARD_TABS.map((tab) => {
              const active = isDashboard && activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <Link
                    to={`/admin?tab=${tab.id}`}
                    className={`admin-sidebar-link ${active ? "admin-sidebar-link-active" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <NavIcon name={TAB_ICONS[tab.id]} />
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="admin-sidebar-label">Quản lý chi tiết</p>
          <ul>
            {ADMIN_PAGE_LINKS.map((item) => {
              const active = isPathActive(location.pathname, item.match);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`admin-sidebar-link ${active ? "admin-sidebar-link-active" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <NavIcon name="list" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <span className="admin-user-avatar" aria-hidden="true">
              {userInitial}
            </span>
            <div className="admin-user-meta">
              <span className="admin-user-name">{fullName || "Quản trị viên"}</span>
              <span className="admin-user-role">{formatRoleLabel(role)}</span>
            </div>
          </div>
          <div className="admin-sidebar-actions">
            <Link to="/" className="admin-sidebar-action" onClick={() => setSidebarOpen(false)}>
              <FooterIcon name="home" />
              Về trang chủ
            </Link>
            <button type="button" className="admin-sidebar-action admin-sidebar-action-muted" onClick={handleLogout}>
              <FooterIcon name="logout" />
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Đóng menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="admin-main">
        <header className="admin-page-header">
          <button
            type="button"
            className="admin-menu-toggle"
            aria-label="Mở menu quản trị"
            onClick={() => setSidebarOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="admin-page-header-body">
            <nav className="admin-breadcrumb" aria-label="Breadcrumb">
              <ol className="admin-breadcrumb-list">
                {breadcrumbs.map((crumb, index) => (
                  <li key={`${crumb.label}-${index}`} className="admin-breadcrumb-item">
                    {index > 0 && (
                      <span className="admin-breadcrumb-sep" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </span>
                    )}
                    {crumb.current ? (
                      <span className="admin-breadcrumb-current" aria-current="page">
                        {crumb.label}
                      </span>
                    ) : crumb.to ? (
                      <Link to={crumb.to} className="admin-breadcrumb-link">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="admin-breadcrumb-text">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>

            <div className="admin-page-header-row">
              <div className="admin-page-header-text">
                <h1 className="admin-page-title">{pageTitle}</h1>
                <p className="admin-page-subtitle">{pageDescription}</p>
              </div>
              {actions ? <div className="admin-page-header-actions">{actions}</div> : null}
            </div>
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
