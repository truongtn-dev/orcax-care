import { Router } from "express";
import * as DoctorAppointmentController from "../controllers/doctorAppointment.controller.js";
import * as DoctorEncounterController from "../controllers/doctorEncounter.controller.js";
import * as DoctorMedicalImageController from "../controllers/doctorMedicalImage.controller.js";
import * as DoctorPrescriptionController from "../controllers/doctorPrescription.controller.js";
import * as DoctorScheduleController from "../controllers/doctorSchedule.controller.js";
import * as DoctorWorkShiftController from "../controllers/doctorWorkShift.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const doctorRouter = Router();

doctorRouter.use(requireDatabase, authMiddleware, requireRole("doctor"));

doctorRouter.get("/work-shifts", DoctorWorkShiftController.listMyWorkShifts);
doctorRouter.get("/schedule", DoctorScheduleController.getScheduleCalendar);
doctorRouter.get("/appointments/today", DoctorAppointmentController.listTodayAppointments);
doctorRouter.get("/medicines", DoctorPrescriptionController.listMedicines);
doctorRouter.get("/prescriptions/:id", DoctorPrescriptionController.getPrescription);
doctorRouter.get("/appointments/:id", DoctorAppointmentController.getAppointment);
doctorRouter.get("/encounters/:id", DoctorEncounterController.getEncounter);
doctorRouter.put("/encounters/:id", DoctorEncounterController.updateEncounter);
doctorRouter.post("/encounters/:id/sign-off", DoctorEncounterController.signOffEncounter);
doctorRouter.post("/encounters/:id/prescriptions", DoctorPrescriptionController.createPrescription);
doctorRouter.delete("/medical-images/:id", DoctorMedicalImageController.deleteMedicalImage);
doctorRouter.get("/appointment-slots/:id", DoctorScheduleController.getAppointmentSlotDetail);
doctorRouter.put("/appointment-slots/:id/block", DoctorScheduleController.blockAppointmentSlot);
doctorRouter.put("/appointment-slots/:id/unblock", DoctorScheduleController.unblockAppointmentSlot);
