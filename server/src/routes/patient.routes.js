import { Router } from "express";
import * as PatientFavoriteDoctorController from "../controllers/patientFavoriteDoctor.controller.js";
import * as PatientInsuranceCardController from "../controllers/patientInsuranceCard.controller.js";
import * as PatientAppointmentController from "../controllers/patientAppointment.controller.js";
import * as PatientEmrController from "../controllers/patientEmr.controller.js";
import * as PatientNotificationController from "../controllers/patientNotification.controller.js";
import * as PatientPrescriptionController from "../controllers/patientPrescription.controller.js";
import * as PatientPushSubscriptionController from "../controllers/patientPushSubscription.controller.js";
import * as PatientWalletController from "../controllers/patientWallet.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const patientRouter = Router();

patientRouter.use(requireDatabase, authMiddleware, requireRole("patient"));

patientRouter.get("/wallet", PatientWalletController.getWallet);
patientRouter.post("/wallet/topups/payos", PatientWalletController.createPayosTopup);
patientRouter.post("/wallet/topups/sepay", PatientWalletController.createSepayTopup);
patientRouter.post("/wallet/payos/mock-confirm", PatientWalletController.confirmMockPayosTopup);
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
patientRouter.put("/insurance-cards/:id", PatientInsuranceCardController.updateInsuranceCard);
patientRouter.delete("/insurance-cards/:id", PatientInsuranceCardController.deleteInsuranceCard);
patientRouter.post(
  "/insurance-cards/ocr",
  PatientInsuranceCardController.extractInsuranceCardOcr
);

patientRouter.get("/favorites", PatientFavoriteDoctorController.listFavoriteDoctors);
patientRouter.post("/favorites/:doctorId", PatientFavoriteDoctorController.addFavoriteDoctor);
patientRouter.delete("/favorites/:doctorId", PatientFavoriteDoctorController.removeFavoriteDoctor);

patientRouter.get("/appointments/fee-preview", PatientAppointmentController.previewBookingFee);
patientRouter.get("/appointments", PatientAppointmentController.listAppointments);
patientRouter.post("/appointments", PatientAppointmentController.createAppointment);
patientRouter.get("/appointments/:id", PatientAppointmentController.getAppointment);
patientRouter.put(
  "/appointments/:id/reschedule",
  PatientAppointmentController.rescheduleAppointment
);
patientRouter.post("/appointments/:id/cancel", PatientAppointmentController.cancelAppointment);
patientRouter.post("/appointments/:id/rate", PatientAppointmentController.rateAppointment);

patientRouter.get("/emr/timeline", PatientEmrController.listTimeline);

patientRouter.get("/prescriptions/:id", PatientPrescriptionController.getPrescription);

patientRouter.get("/notifications", PatientNotificationController.listNotifications);
patientRouter.put("/notifications/:id/read", PatientNotificationController.markNotificationRead);

patientRouter.get(
  "/push-subscription",
  PatientPushSubscriptionController.getPushSubscription
);
patientRouter.post(
  "/push-subscription",
  PatientPushSubscriptionController.savePushSubscription
);
patientRouter.delete(
  "/push-subscription",
  PatientPushSubscriptionController.deactivatePushSubscription
);
