"""SDS function registry: parent features + all sub-use-case diagram keys."""
from __future__ import annotations

import re

# Parent feature (build_design_specs SECTIONS) -> diagram file key
FEATURE_KEYS: dict[str, str] = {
    "View Portal Home": "PortalHome",
    "Register": "Register",
    "Login": "Login",
    "Forgot Password": "ForgotPassword",
    "Logout": "Logout",
    "Manage Profile": "ManageProfile",
    "Book Appointment": "BookAppointment",
    "Manage Appointments": "ManageAppointments",
    "View Prescriptions": "ViewPrescriptions",
    "Notifications": "Notifications",
    "Complaints (Patient)": "ComplaintsPatient",
    "Wallet": "Wallet",
    "Insurance": "Insurance",
    "Queue Status": "QueueStatus",
    "Favorites": "Favorites",
    "Doctor Dashboard": "DoctorDashboard",
    "Consultation & EMR": "ConsultationEMR",
    "Queue Session": "QueueSession",
    "Work Shift Schedule": "WorkShift",
    "Appointment Calendar": "AppointmentCalendar",
    "Patient EMR Timeline": "PatientEMRTimeline",
    "Medical Imaging": "MedicalImaging",
    "Prescription Management": "PrescriptionMgmt",
    "Manage Accounts": "ManageAccounts",
    "Manage Specialties": "ManageSpecialties",
    "Manage Departments": "ManageDepartments",
    "Manage Clinic Rooms": "ManageClinicRooms",
    "Manage Doctors": "ManageDoctors",
    "Manage Patients": "ManagePatients",
    "Admin Dashboard": "AdminDashboard",
    "Manage Pharmacy": "ManagePharmacy",
    "Queue Check-in": "QueueCheckin",
    "Manage Complaints (Staff)": "ManageComplaintsStaff",
    "Staff Dashboard": "StaffDashboard",
}

# UC root number -> parent diagram key (for sub-UC query inheritance)
UC_ROOT_TO_KEY: dict[str, str] = {
    "1": "PortalHome",
    "2": "Register",
    "3": "ManageProfile",
    "4": "ForgotPassword",
    "5": "Login",
    "6": "Logout",
    "7": "BookAppointment",
    "8": "ManageAppointments",
    "9": "ViewPrescriptions",
    "10": "Notifications",
    "11": "ComplaintsPatient",
    "12": "Wallet",
    "13": "Insurance",
    "14": "QueueStatus",
    "15": "Favorites",
    "16": "DoctorDashboard",
    "17": "ConsultationEMR",
    "18": "QueueSession",
    "19": "WorkShift",
    "20": "AppointmentCalendar",
    "21": "PatientEMRTimeline",
    "23": "MedicalImaging",
    "24": "PrescriptionMgmt",
    "25": "ManageAccounts",
    "26": "ManageSpecialties",
    "27": "ManageDepartments",
    "28": "ManageClinicRooms",
    "29": "ManageDoctors",
    "30": "ManagePatients",
    "31": "AdminDashboard",
    "32": "ManagePharmacy",
    "33": "QueueCheckin",
    "34": "ManageComplaintsStaff",
    "35": "StaffDashboard",
}


def uc_sort_key(uc: str) -> tuple[int, ...]:
    m = re.match(r"UC-([\d.]+)", uc or "")
    if not m:
        return (999, 999)
    return tuple(int(p) for p in m.group(1).split("."))


def uc_id_and_name(uc: str) -> tuple[str, str]:
    parts = (uc or "").split(" ", 1)
    return parts[0], (parts[1] if len(parts) > 1 else parts[0])


def queries_for_key(key: str, uc: str, http: str, service_call: str, parent_queries: dict[str, str]) -> str:
    if key in parent_queries and parent_queries[key]:
        if re.match(r"UC-\d+\.\d", uc):
            return (
                f"// {uc}\n"
                f"// API: {http}\n"
                f"// Service: {service_call}\n"
                f"// Related collections — see parent UC queries below.\n\n"
                + parent_queries[key]
            )
        return parent_queries[key]

    root = re.match(r"UC-(\d+)", uc or "")
    if root:
        parent_key = UC_ROOT_TO_KEY.get(root.group(1))
        if parent_key and parent_key in parent_queries and parent_queries[parent_key]:
            return (
                f"// {uc}\n"
                f"// API: {http}\n"
                f"// Service: {service_call}\n\n"
                + parent_queries[parent_key]
            )

    return f"""// {uc}
// API: {http}
// Service: {service_call}
"""
