import { Router } from "express";
import * as PatientAppointmentController from "../controllers/patientAppointment.controller.js";
import * as PatientFavoriteDoctorController from "../controllers/patientFavoriteDoctor.controller.js";
import * as PatientInsuranceCardController from "../controllers/patientInsuranceCard.controller.js";
import * as PatientWalletController from "../controllers/patientWallet.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const patientRouter = Router();

patientRouter.use(requireDatabase, authMiddleware, requireRole("patient"));

patientRouter.get("/wallet", PatientWalletController.getWallet);
patientRouter.post("/wallet/topups/payos", PatientWalletController.createPayosTopup);
patientRouter.post("/wallet/topups/vnpay", PatientWalletController.createVnpayTopup);
patientRouter.post("/wallet/topups/sepay", PatientWalletController.createSepayTopup);
patientRouter.post("/wallet/payos/mock-confirm", PatientWalletController.confirmMockPayosTopup);
patientRouter.post("/wallet/vnpay/mock-confirm", PatientWalletController.confirmMockVnpayTopup);
patientRouter.post("/wallet/sepay/mock-confirm", PatientWalletController.confirmMockSepayTopup);
patientRouter.post("/wallet/deduct", PatientWalletController.deductWallet);
patientRouter.post(
  "/wallet/topups/:provider/:ref/cancel",
  PatientWalletController.cancelTopup
);
patientRouter.get(
  "/wallet/topups/:provider/:ref/checkout",
  PatientWalletController.getTopupCheckout
);
patientRouter.get(
  "/wallet/topups/:provider/:ref/status",
  PatientWalletController.getTopupStatus
);
patientRouter.get("/wallet/receipts/:orderCode", PatientWalletController.getTopupReceipt);

patientRouter.get("/insurance-cards", PatientInsuranceCardController.listInsuranceCards);
patientRouter.post("/insurance-cards", PatientInsuranceCardController.createInsuranceCard);

patientRouter.get("/favorites", PatientFavoriteDoctorController.listFavoriteDoctors);
patientRouter.post("/favorites/:doctorId", PatientFavoriteDoctorController.addFavoriteDoctor);
patientRouter.delete("/favorites/:doctorId", PatientFavoriteDoctorController.removeFavoriteDoctor);

patientRouter.get("/doctors/:doctorId/slots", PatientAppointmentController.getDoctorSlots);
patientRouter.get("/appointments", PatientAppointmentController.listAppointments);
patientRouter.post("/appointments", PatientAppointmentController.bookAppointment);
patientRouter.post("/appointments/:id/cancel", PatientAppointmentController.cancelAppointment);
patientRouter.post("/appointments/:id/rate", PatientAppointmentController.rateAppointment);
