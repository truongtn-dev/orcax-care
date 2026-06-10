import { getApiPublicOrigin, getClientOrigin, getWalletLimits } from "../config/wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import {
  createMomoPaymentLink,
  isMomoMockMode,
  isMomoPaymentSuccess,
  verifyMomoIpnSignature,
} from "./momo.service.js";
import { createPayosPaymentLink, isPayosMockMode, verifyPayosPayment } from "./payos.service.js";
import {
  completeTopupTransaction,
  deductWalletBalance,
  generateUniqueOrderCode,
  generateUniqueProviderOrderId,
  getWalletOverview,
  markTopupCancelled,
  markTopupFailed,
  serializeTransaction,
} from "./wallet.service.js";

function validateTopupAmount(amount) {
  const value = parseInt(amount, 10);
  const { minTopup, maxTopup } = getWalletLimits();
  if (!value || value < minTopup) {
    return { error: { status: 400, body: { message: `Minimum top-up amount is ${minTopup} VND` } } };
  }
  if (value > maxTopup) {
    return { error: { status: 400, body: { message: `Maximum top-up amount is ${maxTopup} VND` } } };
  }
  return { value, limits: { minTopup, maxTopup } };
}

export async function getPatientWallet(userId, query = {}) {
  const overview = await getWalletOverview(userId, query);
  const { minTopup, maxTopup } = getWalletLimits();
  return {
    status: 200,
    body: {
      ...overview,
      paymentMethods: [
        { id: "payos", label: "PayOS", enabled: true },
        { id: "momo", label: "Momo", enabled: true },
      ],
      limits: { minTopup, maxTopup },
      payosMockMode: isPayosMockMode(),
      momoMockMode: isMomoMockMode(),
    },
  };
}

export async function createPayosTopup(userId, payload = {}, req) {
  const validated = validateTopupAmount(payload.amount);
  if (validated.error) return validated.error;

  const orderCode = await generateUniqueOrderCode();
  const apiOrigin = getApiPublicOrigin(req);
  const clientOrigin = getClientOrigin();
  const returnUrl = `${apiOrigin}/api/payments/payos/return`;
  const cancelUrl = `${apiOrigin}/api/payments/payos/cancel`;

  const txn = await WalletTransaction.create({
    userId,
    type: "topup",
    amount: validated.value,
    status: "pending",
    provider: "payos",
    orderCode,
    description: payload.description?.trim() || "OrcaXCare wallet top-up",
  });

  const payment = await createPayosPaymentLink({
    orderCode,
    amount: validated.value,
    description: txn.description,
    returnUrl,
    cancelUrl,
  });

  txn.paymentLinkId = payment.paymentLinkId;
  await txn.save();

  return {
    status: 201,
    body: {
      transactionId: txn._id.toString(),
      orderCode,
      amount: validated.value,
      checkoutUrl: payment.mock
        ? `${clientOrigin}/patient/wallet/payos/mock?orderCode=${orderCode}`
        : payment.checkoutUrl,
      paymentMethod: "payos",
      mockMode: payment.mock,
    },
  };
}

export async function handlePayosReturn(query = {}) {
  const orderCode = Number(query.orderCode || query.order_code);
  if (!orderCode) {
    return { redirectStatus: "failed", reason: "Missing order code" };
  }

  if (query.mock === "1" || isPayosMockMode()) {
    const result = await completeTopupTransaction(orderCode);
    if (result.status === 200) {
      return { redirectStatus: "success", orderCode, receipt: result.body.receipt };
    }
    return {
      redirectStatus: "failed",
      orderCode,
      reason: result.body?.message || "Could not complete mock payment",
    };
  }

  const verification = await verifyPayosPayment(orderCode);
  if (!verification.paid) {
    await markTopupFailed(orderCode, `PayOS status: ${verification.status || "UNPAID"}`);
    return {
      redirectStatus: "failed",
      orderCode,
      reason: "Payment was not completed",
    };
  }

  const result = await completeTopupTransaction(orderCode);
  if (result.status === 200) {
    return { redirectStatus: "success", orderCode, receipt: result.body.receipt };
  }
  return {
    redirectStatus: "failed",
    orderCode,
    reason: result.body?.message || "Could not credit wallet",
  };
}

export async function handlePayosCancel(query = {}) {
  const orderCode = Number(query.orderCode || query.order_code);
  if (!orderCode) {
    return { redirectStatus: "cancelled", reason: "Missing order code" };
  }
  await markTopupCancelled(orderCode);
  return { redirectStatus: "cancelled", orderCode };
}

export async function confirmMockPayosTopup(userId, payload = {}) {
  if (!isPayosMockMode()) {
    return { status: 403, body: { message: "Mock PayOS confirmation is disabled" } };
  }

  const orderCode = Number(payload.orderCode);
  if (!orderCode) {
    return { status: 400, body: { message: "orderCode is required" } };
  }

  const txn = await WalletTransaction.findOne({ orderCode, type: "topup" });
  if (!txn || txn.userId.toString() !== userId) {
    return { status: 404, body: { message: "Top-up transaction not found" } };
  }

  const result = await completeTopupTransaction(orderCode);
  return result;
}

export async function createMomoTopup(userId, payload = {}, req) {
  const validated = validateTopupAmount(payload.amount);
  if (validated.error) return validated.error;

  const providerOrderId = await generateUniqueProviderOrderId("MOMO");
  const requestId = `${providerOrderId}-req`;
  const apiOrigin = getApiPublicOrigin(req);
  const clientOrigin = getClientOrigin();
  const redirectUrl = `${apiOrigin}/api/payments/momo/return`;
  const ipnUrl = `${apiOrigin}/api/payments/momo/ipn`;

  const txn = await WalletTransaction.create({
    userId,
    type: "topup",
    amount: validated.value,
    status: "pending",
    provider: "momo",
    providerOrderId,
    paymentLinkId: requestId,
    description: payload.description?.trim() || "OrcaXCare wallet top-up via Momo",
  });

  const payment = await createMomoPaymentLink({
    orderId: providerOrderId,
    requestId,
    amount: validated.value,
    orderInfo: txn.description,
    redirectUrl,
    ipnUrl,
  });

  return {
    status: 201,
    body: {
      transactionId: txn._id.toString(),
      providerOrderId,
      amount: validated.value,
      checkoutUrl: payment.mock
        ? `${clientOrigin}/patient/wallet/momo/mock?orderId=${providerOrderId}`
        : payment.payUrl,
      paymentMethod: "momo",
      mockMode: payment.mock,
    },
  };
}

async function finalizeMomoTopup(payload = {}) {
  const providerOrderId = payload.orderId;
  if (!providerOrderId) {
    return { redirectStatus: "failed", reason: "Missing Momo order id" };
  }

  if (!isMomoMockMode() && !verifyMomoIpnSignature(payload)) {
    await markTopupFailed({ providerOrderId }, "Invalid Momo signature");
    return {
      redirectStatus: "failed",
      providerOrderId,
      reason: "Invalid payment signature",
    };
  }

  if (!isMomoPaymentSuccess(payload) && !isMomoMockMode()) {
    await markTopupFailed(
      { providerOrderId },
      payload.message || `Momo result code ${payload.resultCode}`
    );
    return {
      redirectStatus: "failed",
      providerOrderId,
      reason: payload.message || "Momo payment failed",
    };
  }

  const result = await completeTopupTransaction(
    { providerOrderId },
    { providerReferenceId: payload.transId || payload.requestId || "" }
  );

  if (result.status === 200) {
    return {
      redirectStatus: "success",
      providerOrderId,
      receipt: result.body.receipt,
    };
  }

  return {
    redirectStatus: "failed",
    providerOrderId,
    reason: result.body?.message || "Could not credit wallet",
  };
}

export async function handleMomoReturn(query = {}) {
  if (query.mock === "1" || isMomoMockMode()) {
    return finalizeMomoTopup({
      ...query,
      orderId: query.orderId,
      resultCode: 0,
      transId: query.transId || `MOCK-${query.orderId}`,
      accessKey: process.env.MOMO_ACCESS_KEY || "mock-access",
      amount: query.amount || "",
      extraData: "",
      message: "Success",
      orderInfo: "",
      orderType: "momo_wallet",
      partnerCode: process.env.MOMO_PARTNER_CODE || "MOCK",
      payType: "webApp",
      requestId: query.requestId || query.orderId,
      responseTime: Date.now(),
      signature: query.signature || "mock",
    });
  }

  return finalizeMomoTopup(query);
}

export async function handleMomoIpn(payload = {}) {
  const result = await finalizeMomoTopup(payload);
  return {
    status: result.redirectStatus === "success" ? 204 : 400,
    body:
      result.redirectStatus === "success"
        ? null
        : { message: result.reason || "Momo IPN rejected" },
  };
}

export async function confirmMockMomoTopup(userId, payload = {}) {
  if (!isMomoMockMode()) {
    return { status: 403, body: { message: "Mock Momo confirmation is disabled" } };
  }

  const providerOrderId = String(payload.orderId || "").trim();
  if (!providerOrderId) {
    return { status: 400, body: { message: "orderId is required" } };
  }

  const txn = await WalletTransaction.findOne({ providerOrderId, type: "topup" });
  if (!txn || txn.userId.toString() !== userId) {
    return { status: 404, body: { message: "Top-up transaction not found" } };
  }

  return completeTopupTransaction(
    { providerOrderId },
    { providerReferenceId: `MOCK-${providerOrderId}` }
  );
}

export async function deductPatientWallet(userId, payload = {}) {
  return deductWalletBalance(userId, payload.amount, payload.description);
}

export async function getTopupReceipt(userId, ref) {
  const refText = String(ref || "").trim();
  const numericRef = /^\d+$/.test(refText) ? Number(refText) : null;

  let txn = null;
  if (numericRef != null) {
    txn = await WalletTransaction.findOne({
      userId,
      orderCode: numericRef,
      type: "topup",
    }).lean();
  }
  if (!txn) {
    txn = await WalletTransaction.findOne({
      userId,
      providerOrderId: refText,
      type: "topup",
    }).lean();
  }

  if (!txn) {
    return { status: 404, body: { message: "Receipt not found" } };
  }

  return {
    status: 200,
    body: {
      receipt: {
        orderCode: txn.orderCode,
        providerOrderId: txn.providerOrderId,
        referenceId: txn.providerReferenceId || txn.paymentLinkId || "",
        amount: txn.amount,
        status: txn.status,
        provider: txn.provider,
        paidAt: txn.updatedAt,
        failureReason: txn.failureReason || "",
      },
      transaction: serializeTransaction(txn),
    },
  };
}
