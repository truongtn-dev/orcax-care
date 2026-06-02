import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";
import ChangePasswordPage from "./pages/ChangePasswordPage.jsx";
import EditProfilePage from "./pages/EditProfilePage.jsx";
import SearchDoctorsPage from "./pages/SearchDoctorsPage.jsx";
import PatientDashboardPage from "./pages/PatientDashboardPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import DoctorDashboardPage from "./pages/DoctorDashboardPage.jsx";
import AccountEditPage from "./pages/admin/AccountEditPage.jsx";
import DepartmentCreatePage from "./pages/admin/DepartmentCreatePage.jsx";
import DepartmentDetailPage from "./pages/admin/DepartmentDetailPage.jsx";
import SpecialtiesListPage from "./pages/admin/SpecialtiesListPage.jsx";
import "./App.css";
import "./glass.css";
import "./scroll-reveal.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/search-doctors" element={<SearchDoctorsPage />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute roles={["patient", "doctor", "admin"]}>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={["patient", "doctor", "admin"]}>
                <EditProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/accounts/:id/edit"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AccountEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/specialties"
            element={
              <ProtectedRoute roles={["admin"]}>
                <SpecialtiesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments/new"
            element={
              <ProtectedRoute roles={["admin"]}>
                <DepartmentCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <DepartmentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute roles={["doctor"]}>
                <DoctorDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
