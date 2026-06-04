import { Router } from "express";
import * as AdminAccountController from "../controllers/adminAccount.controller.js";
import * as AdminDoctorController from "../controllers/adminDoctor.controller.js";
import * as AdminMasterController from "../controllers/adminMaster.controller.js";
import * as AdminPatientController from "../controllers/adminPatient.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const adminRouter = Router();

adminRouter.use(requireDatabase, authMiddleware, requireRole("admin"));

adminRouter.get("/ping", (req, res) => {
  res.json({ ok: true, scope: "admin" });
});

adminRouter.get("/accounts/:id", AdminAccountController.getAccount);
adminRouter.put("/accounts/:id", AdminAccountController.updateAccount);
adminRouter.get("/doctors", AdminDoctorController.listDoctors);
adminRouter.get("/doctors/:id", AdminDoctorController.getDoctor);
adminRouter.put("/doctors/:id", AdminDoctorController.updateDoctor);
adminRouter.get("/patients", AdminPatientController.listPatients);
adminRouter.get("/patients/:id", AdminPatientController.getPatient);
adminRouter.put("/patients/:id", AdminPatientController.updatePatient);
adminRouter.get("/specialties", AdminMasterController.listSpecialties);
adminRouter.get("/departments", AdminMasterController.listDepartments);
adminRouter.post("/departments", AdminMasterController.createDepartment);
adminRouter.get("/departments/:id", AdminMasterController.getDepartmentDetail);
