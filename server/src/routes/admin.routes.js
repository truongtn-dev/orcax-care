import { Router } from "express";
import * as AdminAccountController from "../controllers/adminAccount.controller.js";
import * as AdminMasterController from "../controllers/adminMaster.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const adminRouter = Router();

adminRouter.use(requireDatabase, authMiddleware, requireRole("admin"));

adminRouter.get("/ping", (req, res) => {
  res.json({ ok: true, scope: "admin" });
});

adminRouter.get("/accounts/:id", AdminAccountController.getAccount);
adminRouter.put("/accounts/:id", AdminAccountController.updateAccount);
adminRouter.get("/specialties", AdminMasterController.listSpecialties);
adminRouter.post("/departments", AdminMasterController.createDepartment);
adminRouter.get("/departments/:id", AdminMasterController.getDepartmentDetail);
