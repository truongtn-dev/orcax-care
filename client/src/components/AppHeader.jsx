import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AppHeader() {
  const { isAuthenticated, role, fullName, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="app-header">
      <Link to="/" className="logo">
        OrcaXCare
      </Link>
      <nav className="nav">
        <Link to="/search-doctors">Find Doctors</Link>
        {isAuthenticated && role === "patient" && <Link to="/patient">Dashboard</Link>}
        {isAuthenticated && role === "admin" && <Link to="/admin">Admin</Link>}
        {isAuthenticated && role === "doctor" && <Link to="/doctor">Doctor</Link>}
      </nav>
      <div className="header-actions">
        {!isAuthenticated ? (
          <>
            <Link to="/login" className="btn btn-outline">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary">
              Register
            </Link>
          </>
        ) : (
          <div className="avatar-menu">
            <button
              type="button"
              className="avatar-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="User menu"
            >
              <span className="avatar">{fullName?.charAt(0) || "U"}</span>
              <span className="avatar-name">{fullName || role}</span>
            </button>
            {menuOpen && (
              <div className="dropdown">
                <Link to="/change-password" onClick={() => setMenuOpen(false)}>
                  Change Password
                </Link>
                <button type="button" onClick={handleLogout}>
                  Log Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
