import { getClientOrigin } from "../config/wallet.js";
import * as PatientWalletService from "../services/patientWallet.service.js";

function buildWalletRedirect({ status, orderCode, reason = "" }) {
  const clientOrigin = getClientOrigin();
  const params = new URLSearchParams({ payment: status });
  if (orderCode) params.set("orderCode", String(orderCode));
  if (reason) params.set("reason", reason);
  return `${clientOrigin}/patient/wallet?${params.toString()}`;
}

export async function payosReturn(req, res) {
  try {
    const result = await PatientWalletService.handlePayosReturn(req.query);
    return res.redirect(
      buildWalletRedirect({
        status: result.redirectStatus,
        orderCode: result.orderCode,
        reason: result.reason || "",
      })
    );
  } catch (err) {
    console.error(err);
    return res.redirect(buildWalletRedirect({ status: "failed", reason: "System error" }));
  }
}

export async function payosWebhook(req, res) {
  try {
    const result = await PatientWalletService.handlePayosWebhook(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}

export async function payosCancel(req, res) {
  try {
    const result = await PatientWalletService.handlePayosCancel(req.query);
    return res.redirect(
      buildWalletRedirect({
        status: result.redirectStatus,
        orderCode: result.orderCode,
        reason: result.reason || "Payment cancelled",
      })
    );
  } catch (err) {
    console.error(err);
    return res.redirect(buildWalletRedirect({ status: "cancelled", reason: "System error" }));
  }
}
