import { Router } from "express";
import * as StaffPharmacyController from "../controllers/staffPharmacy.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const staffRouter = Router();

staffRouter.use(requireDatabase, authMiddleware, requireRole("staff", "admin"));

staffRouter.get("/dashboard", StaffPharmacyController.getStaffDashboard);
staffRouter.get("/pharmacy/dashboard", StaffPharmacyController.getPharmacyDashboard);
staffRouter.get("/pharmacy/medicines", StaffPharmacyController.listMedicines);
staffRouter.get("/pharmacy/medicines/:id", StaffPharmacyController.getMedicineDetail);
staffRouter.get("/pharmacy/stock-movements", StaffPharmacyController.listStockMovements);
staffRouter.post("/pharmacy/stock-inbound", StaffPharmacyController.stockInbound);
staffRouter.post("/pharmacy/prescriptions/verify", StaffPharmacyController.verifyPrescription);
staffRouter.post("/pharmacy/medicines", StaffPharmacyController.createMedicine);
