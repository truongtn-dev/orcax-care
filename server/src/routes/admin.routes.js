import { Router } from "express";
import * as AdminAccountController from "../controllers/adminAccount.controller.js";
import * as AdminClinicRoomController from "../controllers/adminClinicRoom.controller.js";
import * as AdminDoctorController from "../controllers/adminDoctor.controller.js";
import * as AdminMasterController from "../controllers/adminMaster.controller.js";
import * as AdminPatientController from "../controllers/adminPatient.controller.js";
import * as AdminSpecialtyController from "../controllers/adminSpecialty.controller.js";
import * as AdminAppointmentSlotController from "../controllers/adminAppointmentSlot.controller.js";
import * as AdminWorkShiftController from "../controllers/adminWorkShift.controller.js";
import * as AdminController from "../controllers/admin.controller.js";
import * as AdminDashboardController from "../controllers/adminDashboard.controller.js";
import * as AdminComplaintController from "../controllers/adminComplaint.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const adminRouter = Router();

adminRouter.use(requireDatabase, authMiddleware, requireRole("admin"));

adminRouter.get("/ping", (req, res) => {
  res.json({ ok: true, scope: "admin" });
});

adminRouter.get("/dashboard", AdminDashboardController.getDashboard);

adminRouter.get("/complaints", AdminComplaintController.listComplaints);
adminRouter.get("/complaints/:id", AdminComplaintController.getComplaint);
adminRouter.patch("/complaints/:id/status", AdminComplaintController.updateComplaintStatus);
adminRouter.post("/complaints/:id/replies", AdminComplaintController.replyToComplaint);

adminRouter.get("/accounts", AdminAccountController.listAccounts);
adminRouter.post("/accounts", AdminAccountController.createAccount);
adminRouter.get("/accounts/:id", AdminAccountController.getAccount);
adminRouter.put("/accounts/:id", AdminAccountController.updateAccount);

adminRouter.post("/staff", AdminController.createStaffAccount);
adminRouter.get("/users", AdminController.listAllUsers);
adminRouter.put("/users/:userId/role", AdminController.changeUserRole);
adminRouter.put("/users/:userId/deactivate", AdminController.deactivateAccount);
adminRouter.put("/users/:userId/reactivate", AdminController.reactivateAccount);

adminRouter.get("/doctors", AdminDoctorController.listDoctors);
adminRouter.get("/doctors/export", AdminDoctorController.exportDoctors);
adminRouter.get("/doctors/import-template", AdminDoctorController.downloadImportTemplate);
adminRouter.post("/doctors/import", AdminDoctorController.importDoctors);
adminRouter.get("/doctors/:id", AdminDoctorController.getDoctor);
adminRouter.put("/doctors/:id", AdminDoctorController.updateDoctor);

adminRouter.get("/patients", AdminPatientController.listPatients);
adminRouter.post("/patients", AdminPatientController.createPatient);
adminRouter.get("/patients/:id", AdminPatientController.getPatient);
adminRouter.put("/patients/:id", AdminPatientController.updatePatient);

adminRouter.get("/specialties", (req, res) => {
  const { q, page, limit, isActive } = req.query;
  if (q || page || limit || isActive !== undefined) {
    return AdminSpecialtyController.listSpecialties(req, res);
  }
  return AdminMasterController.listSpecialties(req, res);
});
adminRouter.post("/specialties", AdminSpecialtyController.createSpecialty);
adminRouter.get("/specialties/:id", AdminSpecialtyController.getSpecialty);
adminRouter.put("/specialties/:specialtyId", AdminController.updateSpecialty);
adminRouter.delete("/specialties/:id", AdminSpecialtyController.deleteSpecialty);

adminRouter.get("/departments", AdminMasterController.listDepartments);
adminRouter.post("/departments", AdminMasterController.createDepartment);
adminRouter.get("/departments/:id", AdminMasterController.getDepartmentDetail);
adminRouter.put("/departments/:id", AdminMasterController.updateDepartment);
adminRouter.put("/departments/:id/deactivate", AdminMasterController.deactivateDepartment);

adminRouter.get("/clinic-rooms/departments", AdminClinicRoomController.listDepartmentOptions);
adminRouter.get("/clinic-rooms", AdminClinicRoomController.listClinicRooms);
adminRouter.post("/clinic-rooms", AdminClinicRoomController.createClinicRoom);
adminRouter.put("/clinic-rooms/:roomId", AdminClinicRoomController.updateClinicRoom);

adminRouter.post("/work-shifts/preview", AdminWorkShiftController.previewWorkShift);
adminRouter.get("/work-shifts", AdminWorkShiftController.listWorkShifts);
adminRouter.post("/work-shifts", AdminWorkShiftController.createWorkShift);
adminRouter.get("/work-shifts/:id/delete-impact", AdminWorkShiftController.getDeleteShiftImpact);
adminRouter.get("/work-shifts/:id", AdminWorkShiftController.getWorkShift);
adminRouter.put("/work-shifts/:id", AdminWorkShiftController.updateWorkShift);
adminRouter.delete("/work-shifts/:id", AdminWorkShiftController.deleteWorkShift);

adminRouter.post(
  "/appointment-slots/preview",
  AdminAppointmentSlotController.previewAppointmentSlots
);
adminRouter.post(
  "/appointment-slots/generate",
  AdminAppointmentSlotController.generateAppointmentSlots
);
