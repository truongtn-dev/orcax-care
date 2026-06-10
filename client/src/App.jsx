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
import PatientPortalPlaceholderPage from "./pages/PatientPortalPlaceholderPage.jsx";
import AdminAccountDetailPage from "./pages/AdminAccountDetailPage.jsx";
import AdminAccountPage from "./pages/AdminAccountPage.jsx";
import AdminClinicRoomPage from "./pages/AdminClinicRoomPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminPatientDetailPage from "./pages/AdminPatientDetailPage.jsx";
import AdminPatientEditPage from "./pages/AdminPatientEditPage.jsx";
import AdminPatientPage from "./pages/AdminPatientPage.jsx";
import AdminSpecialtyPage from "./pages/AdminSpecialtyPage.jsx";
import DoctorDashboardPage from "./pages/DoctorDashboardPage.jsx";
import DoctorPublicProfilePage from "./pages/DoctorPublicProfilePage.jsx";
import AccountEditPage from "./pages/admin/AccountEditPage.jsx";
import CreateWorkShiftPage from "./pages/admin/CreateWorkShiftPage.jsx";
import EditWorkShiftPage from "./pages/admin/EditWorkShiftPage.jsx";
import WorkShiftsListPage from "./pages/admin/WorkShiftsListPage.jsx";
import DoctorWorkShiftsPage from "./pages/DoctorWorkShiftsPage.jsx";
import DoctorEditPage from "./pages/admin/DoctorEditPage.jsx";
import DoctorsListPage from "./pages/admin/DoctorsListPage.jsx";
import DepartmentCreatePage from "./pages/admin/DepartmentCreatePage.jsx";
import DepartmentDetailPage from "./pages/admin/DepartmentDetailPage.jsx";
import PatientEditPage from "./pages/admin/PatientEditPage.jsx";
import PatientsListPage from "./pages/admin/PatientsListPage.jsx";
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
              <ProtectedRoute roles={["patient", "doctor", "admin", "staff"]}>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={["patient", "doctor", "admin", "staff"]}>
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
            path="/patient/book"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientPortalPlaceholderPage type="book" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientPortalPlaceholderPage type="appointments" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/wallet"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientPortalPlaceholderPage type="wallet" />
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
            path="/admin/account"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminAccountPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/account/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminAccountDetailPage />
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
            path="/admin/doctors"
            element={
              <ProtectedRoute roles={["admin"]}>
                <DoctorsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/doctors/:id/edit"
            element={
              <ProtectedRoute roles={["admin"]}>
                <DoctorEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/work-shifts"
            element={
              <ProtectedRoute roles={["admin"]}>
                <WorkShiftsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/work-shifts/new"
            element={
              <ProtectedRoute roles={["admin"]}>
                <CreateWorkShiftPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/work-shifts/:id/edit"
            element={
              <ProtectedRoute roles={["admin"]}>
                <EditWorkShiftPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patients"
            element={
              <ProtectedRoute roles={["admin"]}>
                <PatientsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patients/:id/edit"
            element={
              <ProtectedRoute roles={["admin"]}>
                <PatientEditPage />
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
            path="/admin/patient/:id/edit"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminPatientEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patient/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminPatientDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patient"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminPatientPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/specialty"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminSpecialtyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/clinic-room"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminClinicRoomPage />
              </ProtectedRoute>
            }
          />
          <Route path="/doctor/:id" element={<DoctorPublicProfilePage />} />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute roles={["doctor"]}>
                <DoctorDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/work-shifts"
            element={
              <ProtectedRoute roles={["doctor"]}>
                <DoctorWorkShiftsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
