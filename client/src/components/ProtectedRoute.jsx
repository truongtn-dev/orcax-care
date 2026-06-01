import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(role)) {
    const fallback =
      role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : "/patient";
    return <Navigate to={fallback} replace />;
  }

  return children;
}
