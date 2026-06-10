import { getClientOrigin } from "../config/wallet.js";
import * as PatientWalletService from "../services/patientWallet.service.js";

function buildWalletRedirect({ status, refKey, refValue, reason = "" }) {
  const clientOrigin = getClientOrigin();
  const params = new URLSearchParams({ payment: status });
  if (refKey && refValue) params.set(refKey, String(refValue));
  if (reason) params.set("reason", reason);
  return `${clientOrigin}/patient/wallet?${params.toString()}`;
}

export async function vnpayReturn(req, res) {
  try {
    const result = await PatientWalletService.handleVnpayReturn(req.query);
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

export async function vnpayIpn(req, res) {
  try {
    const result = await PatientWalletService.handleVnpayIpn(req.query);
    return res.status(200).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(200).json({ RspCode: "99", Message: "System error" });
  }
}
