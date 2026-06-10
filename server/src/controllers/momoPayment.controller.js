import { getClientOrigin } from "../config/wallet.js";
import * as PatientWalletService from "../services/patientWallet.service.js";

function buildWalletRedirect({ status, refKey, refValue, reason = "" }) {
  const clientOrigin = getClientOrigin();
  const params = new URLSearchParams({ payment: status });
  if (refKey && refValue) params.set(refKey, String(refValue));
  if (reason) params.set("reason", reason);
  return `${clientOrigin}/patient/wallet?${params.toString()}`;
}

export async function momoReturn(req, res) {
  try {
    const result = await PatientWalletService.handleMomoReturn(req.query);
    return res.redirect(
      buildWalletRedirect({
        status: result.redirectStatus,
        refKey: "orderId",
        refValue: result.providerOrderId,
        reason: result.reason || "",
      })
    );
  } catch (err) {
    console.error(err);
    return res.redirect(buildWalletRedirect({ status: "failed", reason: "System error" }));
  }
}

export async function momoIpn(req, res) {
  try {
    const result = await PatientWalletService.handleMomoIpn(req.body);
    if (result.status === 204) {
      return res.status(204).end();
    }
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "System error" });
  }
}
