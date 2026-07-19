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
doctorRouter.get("/prescriptions", DoctorPrescriptionController.listDoctorPrescriptions);
doctorRouter.get("/prescriptions/:id", DoctorPrescriptionController.getPrescription);
doctorRouter.post("/prescriptions/:id/items", DoctorPrescriptionController.addLineItem);
doctorRouter.put("/prescriptions/:id/items/:itemId", DoctorPrescriptionController.updateLineItem);
doctorRouter.delete("/prescriptions/:id/items/:itemId", DoctorPrescriptionController.removeLineItem);
doctorRouter.get("/appointments/:id", DoctorAppointmentController.getAppointment);
doctorRouter.post("/appointments/:id/start-consultation", DoctorEncounterController.createEncounter);
doctorRouter.get("/encounters/:id", DoctorEncounterController.getEncounter);
doctorRouter.put("/encounters/:id", DoctorEncounterController.updateEncounter);
doctorRouter.post("/encounters/:id/sign-off", DoctorEncounterController.signOffEncounter);
doctorRouter.post("/encounters/:id/prescriptions", DoctorPrescriptionController.createPrescription);
doctorRouter.get("/encounters/:id/prescription", DoctorEncounterController.getPrescriptionByEncounterId);
doctorRouter.post("/encounters/:id/medical-images", DoctorMedicalImageController.uploadMedicalImage);
doctorRouter.delete("/medical-images/:id", DoctorMedicalImageController.deleteMedicalImage);
doctorRouter.get("/icd10", DoctorEncounterController.searchIcd10);
doctorRouter.post("/encounters/:id/diagnoses", DoctorEncounterController.addDiagnosis);
doctorRouter.put("/encounters/:id/diagnoses/:code", DoctorEncounterController.updateDiagnosis);
doctorRouter.delete("/encounters/:id/diagnoses/:code", DoctorEncounterController.removeDiagnosis);
doctorRouter.get("/appointment-slots/:id", DoctorScheduleController.getAppointmentSlotDetail);
doctorRouter.put("/appointment-slots/:id/block", DoctorScheduleController.blockAppointmentSlot);
doctorRouter.put("/appointment-slots/:id/unblock", DoctorScheduleController.unblockAppointmentSlot);
