import { Router } from "express";
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
patientRouter.get("/wallet/receipts/:orderCode", PatientWalletController.getTopupReceipt);

patientRouter.get("/insurance-cards", PatientInsuranceCardController.listInsuranceCards);
patientRouter.post("/insurance-cards", PatientInsuranceCardController.createInsuranceCard);
