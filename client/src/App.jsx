import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
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
import PatientAppointmentsPage from "./pages/PatientAppointmentsPage.jsx";
import PatientBookAppointmentPage from "./pages/PatientBookAppointmentPage.jsx";
import PatientWalletPage from "./pages/PatientWalletPage.jsx";
import PatientWalletCheckoutPage from "./pages/PatientWalletCheckoutPage.jsx";
import PatientWalletMockCheckoutPage from "./pages/PatientWalletMockCheckoutPage.jsx";
import PatientWalletSepayMockCheckoutPage from "./pages/PatientWalletSepayMockCheckoutPage.jsx";
import PatientInsuranceCardsPage from "./pages/PatientInsuranceCardsPage.jsx";
import PatientEmrTimelinePage from "./pages/PatientEmrTimelinePage.jsx";
import PatientFavoritesPage from "./pages/PatientFavoritesPage.jsx";
import PatientNotificationsPage from "./pages/PatientNotificationsPage.jsx";
import PatientSubmitComplaintPage from "./pages/PatientSubmitComplaintPage.jsx";
import PatientComplaintsPage from "./pages/PatientComplaintsPage.jsx";
import AdminAccountDetailPage from "./pages/AdminAccountDetailPage.jsx";
import AdminAccountPage from "./pages/AdminAccountPage.jsx";
import AdminClinicRoomPage from "./pages/AdminClinicRoomPage.jsx";
import AdminBranchesPage from "./pages/AdminBranchesPage.jsx";
import AdminComplaintsListPage from "./pages/admin/AdminComplaintsListPage.jsx";
import AdminComplaintDetailPage from "./pages/admin/AdminComplaintDetailPage.jsx";
import BranchLocatorPage from "./pages/BranchLocatorPage.jsx";
import BranchDetailPage from "./pages/BranchDetailPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminPatientDetailPage from "./pages/AdminPatientDetailPage.jsx";
import AdminSpecialtyPage from "./pages/AdminSpecialtyPage.jsx";
import DoctorPublicProfilePage from "./pages/DoctorPublicProfilePage.jsx";
import DoctorDashboardPage from "./pages/DoctorDashboardPage.jsx";
import CreateWorkShiftPage from "./pages/admin/CreateWorkShiftPage.jsx";
import EditWorkShiftPage from "./pages/admin/EditWorkShiftPage.jsx";
import GenerateAppointmentSlotsPage from "./pages/admin/GenerateAppointmentSlotsPage.jsx";
import WorkShiftsListPage from "./pages/admin/WorkShiftsListPage.jsx";
import DoctorScheduleCalendarPage from "./pages/DoctorScheduleCalendarPage.jsx";
import DoctorTodayAppointmentsPage from "./pages/DoctorTodayAppointmentsPage.jsx";
import DoctorEncounterDetailPage from "./pages/DoctorEncounterDetailPage.jsx";
import DoctorPrescriptionCreatePage from "./pages/DoctorPrescriptionCreatePage.jsx";
import PrescriptionDetailPage from "./pages/PrescriptionDetailPage.jsx";
import StaffDashboardPage from "./pages/StaffDashboardPage.jsx";
import StaffPharmacyPage from "./pages/StaffPharmacyPage.jsx";
import StaffBranchPage from "./pages/StaffBranchPage.jsx";
import StaffVerifyPrescriptionPage from "./pages/StaffVerifyPrescriptionPage.jsx";
import StaffMedicineDetailPage from "./pages/StaffMedicineDetailPage.jsx";
import StaffQueueCheckinPage from "./pages/StaffQueueCheckinPage.jsx";
import DoctorQueueSessionPage from "./pages/DoctorQueueSessionPage.jsx";
import PatientQueueStatusPage from "./pages/PatientQueueStatusPage.jsx";
import QueueBoardPage from "./pages/QueueBoardPage.jsx";
import DoctorWorkShiftsPage from "./pages/DoctorWorkShiftsPage.jsx";
import DoctorDetailPage from "./pages/admin/DoctorDetailPage.jsx";
import DoctorsListPage from "./pages/admin/DoctorsListPage.jsx";
import SpecialtyDetailPage from "./pages/admin/SpecialtyDetailPage.jsx";
import CreatePatientPage from "./pages/admin/CreatePatientPage.jsx";
import DepartmentCreatePage from "./pages/admin/DepartmentCreatePage.jsx";
import DepartmentDetailPage from "./pages/admin/DepartmentDetailPage.jsx";
import PatientsListPage from "./pages/admin/PatientsListPage.jsx";
import StaffListPage from "./pages/admin/StaffListPage.jsx";
import SpecialtiesListPage from "./pages/admin/SpecialtiesListPage.jsx";
import "./App.css";
import "./glass.css";
import "./styles/adminRecordPages.css";
import "./styles/dashboard.shared.css";
import "./components/icons/icons.css";
import "./scroll-reveal.css";

function LegacyAdminPatientRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/admin/patients/${id}` : "/admin/patients"} replace />;
}

function LegacyAdminPatientEditRedirect() {
  const { id } = useParams();
  return <Navigate to={`/admin/patients?edit=${encodeURIComponent(id)}`} replace />;
}

function AdminDoctorEditRedirect() {
  const { id } = useParams();
  return <Navigate to={`/admin/doctors?edit=${encodeURIComponent(id)}`} replace />;
}

function AdminAccountEditRedirect() {
  const { id } = useParams();
  return <Navigate to={`/admin/account?edit=${encodeURIComponent(id)}`} replace />;
}

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
                <PatientBookAppointmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientAppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/wallet"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientWalletPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/wallet/checkout/:provider/:ref"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientWalletCheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/wallet/payos/mock"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientWalletMockCheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/wallet/sepay/mock"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientWalletSepayMockCheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route path="/queue-board/:roomId" element={<QueueBoardPage />} />
          <Route
            path="/patient/queue"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientQueueStatusPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/emr"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientEmrTimelinePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/prescriptions/:id"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PrescriptionDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/insurance-cards"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientInsuranceCardsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/favorites"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientFavoritesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/complaints"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientComplaintsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/complaints/new"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientSubmitComplaintPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/notifications"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientNotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute roles={["staff"]}>
                <StaffDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/pharmacy"
            element={
              <ProtectedRoute roles={["staff", "admin"]}>
                <StaffPharmacyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/prescriptions/verify"
            element={
              <ProtectedRoute roles={["staff", "admin"]}>
                <StaffVerifyPrescriptionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/checkin"
            element={
              <ProtectedRoute roles={["staff", "admin"]}>
                <StaffQueueCheckinPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/branch"
            element={
              <ProtectedRoute roles={["staff", "admin"]}>
                <StaffBranchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/pharmacy/medicines/:id"
            element={
              <ProtectedRoute roles={["staff", "admin"]}>
                <StaffMedicineDetailPage />
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
            path="/admin/account/:id/edit"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminAccountEditRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/accounts/:id/edit"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminAccountEditRedirect />
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
                <AdminDoctorEditRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/doctors/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <DoctorDetailPage />
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
            path="/admin/appointment-slots/generate"
            element={
              <ProtectedRoute roles={["admin"]}>
                <GenerateAppointmentSlotsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute roles={["admin"]}>
                <StaffListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patients/new"
            element={
              <ProtectedRoute roles={["admin"]}>
                <CreatePatientPage />
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
                <LegacyAdminPatientEditRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patients/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminPatientDetailPage />
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
                <LegacyAdminPatientEditRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patient/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <LegacyAdminPatientRedirect />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/patient" element={<Navigate to="/admin/patients" replace />} />
          <Route
            path="/admin/specialty/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <SpecialtyDetailPage />
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
            path="/admin/complaints"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminComplaintsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminComplaintDetailPage />
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
          <Route
            path="/admin/branches"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminBranchesPage />
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
          <Route
            path="/doctor/today-appointments"
            element={
              <ProtectedRoute roles={["doctor"]}>
                <DoctorTodayAppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/encounters/:id"
            element={
              <ProtectedRoute roles={["doctor"]}>
                <DoctorEncounterDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/encounters/:id/prescriptions/new"
            element={
              <ProtectedRoute roles={["doctor"]}>
                <DoctorPrescriptionCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/prescriptions/:id"
            element={
              <ProtectedRoute roles={["doctor"]}>
                <PrescriptionDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/queue"
            element={
              <ProtectedRoute roles={["doctor"]}>
                <DoctorQueueSessionPage />
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
          <Route
            path="/doctor/schedule"
            element={
              <ProtectedRoute roles={["doctor"]}>
                <DoctorScheduleCalendarPage />
              </ProtectedRoute>
            }
          />
          <Route path="/branches" element={<BranchLocatorPage />} />
          <Route path="/branches/:slug" element={<BranchDetailPage />} />
          <Route path="/doctor/:slug" element={<DoctorPublicProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
