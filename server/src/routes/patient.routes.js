import { Router } from "express";
import * as PatientWalletController from "../controllers/patientWallet.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const patientRouter = Router();

patientRouter.use(requireDatabase, authMiddleware, requireRole("patient"));

patientRouter.get("/wallet", PatientWalletController.getWallet);
patientRouter.post("/wallet/topups/payos", PatientWalletController.createPayosTopup);
patientRouter.post("/wallet/topups/momo", PatientWalletController.createMomoTopup);
patientRouter.post("/wallet/payos/mock-confirm", PatientWalletController.confirmMockPayosTopup);
patientRouter.post("/wallet/momo/mock-confirm", PatientWalletController.confirmMockMomoTopup);
patientRouter.post("/wallet/deduct", PatientWalletController.deductWallet);
patientRouter.get("/wallet/receipts/:orderCode", PatientWalletController.getTopupReceipt);
