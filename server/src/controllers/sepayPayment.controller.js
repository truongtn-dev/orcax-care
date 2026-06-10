import { getClientOrigin } from "../config/wallet.js";
import * as PatientWalletService from "../services/patientWallet.service.js";

function buildWalletRedirect({ status, refKey, refValue, reason = "" }) {
  const clientOrigin = getClientOrigin();
  const params = new URLSearchParams({ payment: status });
  if (refKey && refValue) params.set(refKey, String(refValue));
  if (reason) params.set("reason", reason);
  return `${clientOrigin}/patient/wallet?${params.toString()}`;
}

export async function sepayReturn(req, res) {
  try {
    const result = await PatientWalletService.handleSepayReturn(req.query);
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

export async function sepayError(req, res) {
  try {
    const result = await PatientWalletService.handleSepayError(req.query);
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

export async function sepayCancel(req, res) {
  try {
    const result = await PatientWalletService.handleSepayCancel(req.query);
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
    return res.redirect(buildWalletRedirect({ status: "cancelled", reason: "System error" }));
  }
}

export async function sepayIpn(req, res) {
  try {
    const result = await PatientWalletService.handleSepayIpn(req.body, req.headers);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "System error" });
  }
}
