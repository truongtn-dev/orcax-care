import { getApiPublicOrigin, getClientOrigin, getWalletLimits } from "../config/wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { createPayosPaymentLink, isPayosMockMode, verifyPayosPayment } from "./payos.service.js";
import {
  completeTopupTransaction,
  deductWalletBalance,
  generateUniqueOrderCode,
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
      paymentMethods: [{ id: "payos", label: "PayOS", enabled: true }],
      limits: { minTopup, maxTopup },
      payosMockMode: isPayosMockMode(),
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

export async function deductPatientWallet(userId, payload = {}) {
  return deductWalletBalance(userId, payload.amount, payload.description);
}

export async function getTopupReceipt(userId, orderCode) {
  const txn = await WalletTransaction.findOne({
    userId,
    orderCode: Number(orderCode),
    type: "topup",
  }).lean();

  if (!txn) {
    return { status: 404, body: { message: "Receipt not found" } };
  }

  return {
    status: 200,
    body: {
      receipt: {
        orderCode: txn.orderCode,
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
