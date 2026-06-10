import { Router } from "express";
import * as DoctorWorkShiftController from "../controllers/doctorWorkShift.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const doctorRouter = Router();

doctorRouter.use(requireDatabase, authMiddleware, requireRole("doctor"));

doctorRouter.get("/work-shifts", DoctorWorkShiftController.listMyWorkShifts);
