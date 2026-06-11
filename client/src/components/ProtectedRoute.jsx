import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, role, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="loading-spinner" />
        <p>Checking your session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(role)) {
    const fallback =
      role === "admin" ? "/admin" : role === "doctor" ? "/doctor/schedule" : role === "staff" ? "/staff" : "/patient";
    return <Navigate to={fallback} replace />;
  }

  return children;
}
