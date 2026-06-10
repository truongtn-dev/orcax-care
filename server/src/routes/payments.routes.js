import { Router } from "express";
import * as SepayPaymentController from "../controllers/sepayPayment.controller.js";
import * as VnpayPaymentController from "../controllers/vnpayPayment.controller.js";
import * as PayosPaymentController from "../controllers/payosPayment.controller.js";
import { requireDatabase } from "../middlewares/requireDatabase.js";

export const paymentsRouter = Router();

paymentsRouter.use(requireDatabase);

paymentsRouter.get("/payos/return", PayosPaymentController.payosReturn);
paymentsRouter.get("/payos/cancel", PayosPaymentController.payosCancel);
paymentsRouter.get("/vnpay/return", VnpayPaymentController.vnpayReturn);
paymentsRouter.get("/vnpay/ipn", VnpayPaymentController.vnpayIpn);
paymentsRouter.get("/sepay/return", SepayPaymentController.sepayReturn);
paymentsRouter.get("/sepay/error", SepayPaymentController.sepayError);
paymentsRouter.get("/sepay/cancel", SepayPaymentController.sepayCancel);
paymentsRouter.post("/sepay/ipn", SepayPaymentController.sepayIpn);
