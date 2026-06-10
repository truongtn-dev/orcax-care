import { Router } from "express";
import * as PayosPaymentController from "../controllers/payosPayment.controller.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const paymentsRouter = Router();

paymentsRouter.use(requireDatabase);

paymentsRouter.get("/payos/return", PayosPaymentController.payosReturn);
paymentsRouter.get("/payos/cancel", PayosPaymentController.payosCancel);
