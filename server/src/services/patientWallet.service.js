import { getApiPublicOrigin, getClientOrigin, getWalletLimits } from "../config/wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import {
  buildVnpayIpnFailure,
  buildVnpayIpnSuccess,
  createVnpayPaymentUrl,
  isVnpayMockMode,
  isVnpayPaymentSuccess,
  verifyVnpayCallback,
} from "./vnpay.service.js";
import {
  createPayosPaymentLink,
  isPayosMockMode,
  verifyPayosPayment,
  verifyPayosWebhook,
} from "./payos.service.js";
import {
  initializeSepayCheckout,
  isSepayMockMode,
  isSepayOrderPaid,
  verifySepayIpnSecret,
  verifySepayOrderStatus,
} from "./sepay.service.js";
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
        { id: "payos", label: "PayOS", enabled: !isPayosMockMode() },
        { id: "sepay", label: "SePay", enabled: !isSepayMockMode() },
      ],
      limits: { minTopup, maxTopup },
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

  let payment;
  try {
    payment = await createPayosPaymentLink({
      orderCode,
      amount: validated.value,
      description: txn.description,
      returnUrl,
      cancelUrl,
    });
  } catch (err) {
    console.error("PayOS create payment link failed:", err);
    await markTopupFailed(orderCode, err?.message || "PayOS unavailable");
    return {
      status: 502,
      body: {
        message:
          "Could not create PayOS payment link. Check gateway configuration or try again later.",
      },
    };
  }

  txn.paymentLinkId = payment.paymentLinkId;
  txn.checkoutSnapshot = payment.mock
    ? null
    : {
        qrCode: payment.qrCode,
        checkoutUrl: payment.checkoutUrl,
        accountNumber: payment.accountNumber,
        accountName: payment.accountName,
        bin: payment.bin,
        currency: payment.currency,
        expiredAt: payment.expiredAt,
      };
  await txn.save();

  const checkoutPath = payment.mock
    ? `/patient/wallet/payos/mock?orderCode=${orderCode}`
    : `/patient/wallet/checkout/payos/${orderCode}`;

  return {
    status: 201,
    body: {
      transactionId: txn._id.toString(),
      orderCode,
      amount: validated.value,
      checkoutPath,
      checkoutUrl: `${clientOrigin}${checkoutPath}`,
      externalCheckoutUrl: payment.mock ? null : payment.checkoutUrl,
      paymentMethod: "payos",
      checkoutMode: payment.mock ? "mock" : "embedded",
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

export async function createVnpayTopup(userId, payload = {}, req) {
  const validated = validateTopupAmount(payload.amount);
  if (validated.error) return validated.error;

  const providerOrderId = await generateUniqueProviderOrderId("VNP");
  const apiOrigin = getApiPublicOrigin(req);
  const clientOrigin = getClientOrigin();
  const returnUrl = `${apiOrigin}/api/payments/vnpay/return`;
  const ipnUrl = `${apiOrigin}/api/payments/vnpay/ipn`;
  const ipAddr = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "127.0.0.1";

  const txn = await WalletTransaction.create({
    userId,
    type: "topup",
    amount: validated.value,
    status: "pending",
    provider: "vnpay",
    providerOrderId,
    description: payload.description?.trim() || "OrcaXCare wallet top-up via VNPay",
  });

  const payment = createVnpayPaymentUrl({
    orderId: providerOrderId,
    amount: validated.value,
    orderInfo: txn.description,
    returnUrl,
    ipnUrl,
    ipAddr,
  });

  if (!payment.mock) {
    txn.checkoutSnapshot = { payUrl: payment.payUrl };
    await txn.save();
  }

  const checkoutPath = payment.mock
    ? `/patient/wallet/vnpay/mock?orderId=${providerOrderId}`
    : `/patient/wallet/checkout/vnpay/${providerOrderId}`;

  return {
    status: 201,
    body: {
      transactionId: txn._id.toString(),
      providerOrderId,
      amount: validated.value,
      checkoutPath,
      checkoutUrl: `${clientOrigin}${checkoutPath}`,
      externalCheckoutUrl: payment.mock ? null : payment.payUrl,
      paymentMethod: "vnpay",
      checkoutMode: payment.mock ? "mock" : "embedded",
    },
  };
}

async function finalizeVnpayTopup(query = {}) {
  const providerOrderId = query.vnp_TxnRef || query.orderId;
  if (!providerOrderId) {
    return { redirectStatus: "failed", reason: "Missing VNPay order id" };
  }

  if (!isVnpayMockMode() && !verifyVnpayCallback(query)) {
    await markTopupFailed({ providerOrderId }, "Invalid VNPay signature");
    return {
      redirectStatus: "failed",
      providerOrderId,
      reason: "Invalid payment signature",
    };
  }

  if (!isVnpayPaymentSuccess(query) && !isVnpayMockMode()) {
    await markTopupFailed(
      { providerOrderId },
      query.vnp_Message || `VNPay response code ${query.vnp_ResponseCode}`
    );
    return {
      redirectStatus: "failed",
      providerOrderId,
      reason: query.vnp_Message || "VNPay payment failed",
    };
  }

  const result = await completeTopupTransaction(
    { providerOrderId },
    { providerReferenceId: query.vnp_TransactionNo || query.vnp_BankTranNo || "" }
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

export async function handleVnpayReturn(query = {}) {
  if (query.mock === "1" || isVnpayMockMode()) {
    return finalizeVnpayTopup({
      ...query,
      vnp_TxnRef: query.orderId,
      vnp_ResponseCode: "00",
      vnp_TransactionNo: query.vnp_TransactionNo || `MOCK-${query.orderId}`,
    });
  }

  return finalizeVnpayTopup(query);
}

export async function handleVnpayIpn(query = {}) {
  const result = await finalizeVnpayTopup(query);
  return {
    body:
      result.redirectStatus === "success"
        ? buildVnpayIpnSuccess()
        : buildVnpayIpnFailure(result.reason || "VNPay IPN rejected"),
  };
}

export async function createSepayTopup(userId, payload = {}, req) {
  const validated = validateTopupAmount(payload.amount);
  if (validated.error) return validated.error;

  const providerOrderId = await generateUniqueProviderOrderId("SEP");
  const apiOrigin = getApiPublicOrigin(req);
  const clientOrigin = getClientOrigin();
  const successUrl = `${apiOrigin}/api/payments/sepay/return?orderId=${providerOrderId}`;
  const errorUrl = `${apiOrigin}/api/payments/sepay/error?orderId=${providerOrderId}`;
  const cancelUrl = `${apiOrigin}/api/payments/sepay/cancel?orderId=${providerOrderId}`;

  const txn = await WalletTransaction.create({
    userId,
    type: "topup",
    amount: validated.value,
    status: "pending",
    provider: "sepay",
    providerOrderId,
    description: payload.description?.trim() || "OrcaXCare wallet top-up via SePay",
  });

  let payment;
  try {
    payment = await initializeSepayCheckout({
      orderInvoiceNumber: providerOrderId,
      amount: validated.value,
      description: txn.description,
      successUrl,
      errorUrl,
      cancelUrl,
      customerId: userId.toString(),
    });
  } catch (err) {
    console.error("SePay checkout init failed:", err);
    await markTopupFailed({ providerOrderId }, err?.message || "SePay unavailable");
    return {
      status: 502,
      body: {
        message:
          "Could not create SePay checkout session. Check gateway configuration or try again later.",
      },
    };
  }

  if (!payment.mock) {
    txn.checkoutSnapshot = {
      qrCode: payment.qrCode,
      accountNumber: payment.accountNumber,
      bin: payment.bin,
      transferContent: payment.transferContent,
      sepayOrderId: payment.sepayOrderId,
      checkoutPageUrl: payment.checkoutPageUrl,
      currency: payment.currency,
    };
    txn.providerReferenceId = payment.sepayOrderId || "";
    await txn.save();
  }

  const checkoutPath = payment.mock
    ? `/patient/wallet/sepay/mock?orderId=${providerOrderId}`
    : `/patient/wallet/checkout/sepay/${providerOrderId}`;

  return {
    status: 201,
    body: {
      transactionId: txn._id.toString(),
      providerOrderId,
      amount: validated.value,
      checkoutPath,
      checkoutUrl: `${clientOrigin}${checkoutPath}`,
      paymentMethod: "sepay",
      checkoutMode: payment.mock ? "mock" : "qr",
    },
  };
}

async function finalizeSepayTopup(providerOrderId, providerReferenceId = "") {
  if (!providerOrderId) {
    return { redirectStatus: "failed", reason: "Missing SePay order id" };
  }

  const result = await completeTopupTransaction(
    { providerOrderId },
    { providerReferenceId }
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

export async function handleSepayReturn(query = {}) {
  const providerOrderId = query.orderId || query.order_invoice_number;
  if (query.mock === "1" || isSepayMockMode()) {
    return finalizeSepayTopup(providerOrderId, `MOCK-${providerOrderId}`);
  }
  return finalizeSepayTopup(
    providerOrderId,
    query.transaction_id || query.order_id || ""
  );
}

export async function handleSepayError(query = {}) {
  const providerOrderId = query.orderId;
  if (providerOrderId) {
    await markTopupFailed({ providerOrderId }, "SePay payment failed");
  }
  return {
    redirectStatus: "failed",
    providerOrderId,
    reason: "SePay payment failed",
  };
}

export async function handleSepayCancel(query = {}) {
  const providerOrderId = query.orderId;
  if (providerOrderId) {
    await markTopupCancelled({ providerOrderId }, "SePay payment cancelled");
  }
  return {
    redirectStatus: "cancelled",
    providerOrderId,
    reason: "SePay payment cancelled",
  };
}

export async function handleSepayIpn(payload = {}, headers = {}) {
  const secretHeader = headers["x-secret-key"] || headers["X-Secret-Key"];
  if (!verifySepayIpnSecret(secretHeader)) {
    return { status: 401, body: { success: false, message: "Unauthorized IPN" } };
  }

  if (!isSepayOrderPaid(payload)) {
    return { status: 200, body: { success: true, message: "Ignored notification" } };
  }

  const providerOrderId = payload.order?.order_invoice_number;
  const providerReferenceId =
    payload.transaction?.transaction_id || payload.order?.order_id || "";

  const result = await finalizeSepayTopup(providerOrderId, providerReferenceId);
  if (result.redirectStatus === "success") {
    return { status: 200, body: { success: true } };
  }

  return {
    status: 400,
    body: { success: false, message: result.reason || "Could not credit wallet" },
  };
}

export async function confirmMockSepayTopup(userId, payload = {}) {
  if (!isSepayMockMode()) {
    return { status: 403, body: { message: "Mock SePay confirmation is disabled" } };
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

export async function confirmMockVnpayTopup(userId, payload = {}) {
  if (!isVnpayMockMode()) {
    return { status: 403, body: { message: "Mock VNPay confirmation is disabled" } };
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

async function findTopupTransaction(userId, provider, ref) {
  const refText = String(ref || "").trim();
  const numericRef = /^\d+$/.test(refText) ? Number(refText) : null;

  if (provider === "payos" && numericRef != null) {
    return WalletTransaction.findOne({ userId, orderCode: numericRef, type: "topup" });
  }

  return WalletTransaction.findOne({ userId, providerOrderId: refText, type: "topup" });
}

export async function cancelTopup(userId, provider, ref) {
  const txn = await findTopupTransaction(userId, provider, ref);
  if (!txn) {
    return { status: 404, body: { message: "Top-up transaction not found" } };
  }
  if (txn.status === "success") {
    return { status: 409, body: { message: "Transaction is already paid and cannot be cancelled" } };
  }
  if (txn.status === "cancelled" || txn.status === "failed") {
    return { status: 200, body: { transaction: serializeTransaction(txn) } };
  }
  const result = await markTopupCancelled(
    txn.provider === "payos" ? txn.orderCode : { providerOrderId: txn.providerOrderId },
    "Cancelled by patient"
  );
  return result;
}

export async function getTopupCheckout(userId, provider, ref) {
  const txn = await findTopupTransaction(userId, provider, ref);
  if (!txn) {
    return { status: 404, body: { message: "Top-up transaction not found" } };
  }

  return {
    status: 200,
    body: {
      transactionId: txn._id.toString(),
      provider: txn.provider,
      orderCode: txn.orderCode,
      providerOrderId: txn.providerOrderId,
      amount: txn.amount,
      status: txn.status,
      description: txn.description,
      checkoutSnapshot: txn.checkoutSnapshot || null,
      mockMode:
        txn.provider === "payos"
          ? isPayosMockMode()
          : txn.provider === "vnpay"
            ? isVnpayMockMode()
            : isSepayMockMode(),
    },
  };
}

export async function getTopupStatus(userId, provider, ref) {
  const txn = await findTopupTransaction(userId, provider, ref);
  if (!txn) {
    return { status: 404, body: { message: "Top-up transaction not found" } };
  }

  if (txn.status === "success") {
    return {
      status: 200,
      body: {
        paid: true,
        status: txn.status,
        provider: txn.provider,
        orderCode: txn.orderCode,
        providerOrderId: txn.providerOrderId,
        amount: txn.amount,
      },
    };
  }

  if (txn.status === "failed" || txn.status === "cancelled") {
    return {
      status: 200,
      body: {
        paid: false,
        status: txn.status,
        provider: txn.provider,
        orderCode: txn.orderCode,
        providerOrderId: txn.providerOrderId,
        amount: txn.amount,
        failureReason: txn.failureReason || "",
      },
    };
  }

  if (txn.provider === "sepay" && txn.providerOrderId && !isSepayMockMode()) {
    const verification = await verifySepayOrderStatus(txn.providerOrderId);
    if (verification.paid) {
      const result = await completeTopupTransaction(
        { providerOrderId: txn.providerOrderId },
        { providerReferenceId: verification.sepayOrderId || txn.providerReferenceId || "" }
      );
      if (result.status === 200) {
        return {
          status: 200,
          body: {
            paid: true,
            status: "success",
            provider: txn.provider,
            providerOrderId: txn.providerOrderId,
            amount: txn.amount,
            receipt: result.body.receipt,
          },
        };
      }
    }
    return {
      status: 200,
      body: {
        paid: false,
        status: "pending",
        provider: txn.provider,
        providerOrderId: txn.providerOrderId,
        gatewayStatus: verification.status,
        amount: txn.amount,
      },
    };
  }

  if (txn.provider === "payos" && txn.orderCode && !isPayosMockMode()) {
    const verification = await verifyPayosPayment(txn.orderCode);
    if (verification.paid) {
      const result = await completeTopupTransaction(txn.orderCode);
      if (result.status === 200) {
        return {
          status: 200,
          body: {
            paid: true,
            status: "success",
            provider: txn.provider,
            orderCode: txn.orderCode,
            amount: txn.amount,
            receipt: result.body.receipt,
          },
        };
      }
    }
    return {
      status: 200,
      body: {
        paid: false,
        status: "pending",
        provider: txn.provider,
        orderCode: txn.orderCode,
        gatewayStatus: verification.status,
        amount: txn.amount,
      },
    };
  }

  return {
    status: 200,
    body: {
      paid: false,
      status: txn.status,
      provider: txn.provider,
      orderCode: txn.orderCode,
      providerOrderId: txn.providerOrderId,
      amount: txn.amount,
    },
  };
}

export async function handlePayosWebhook(payload = {}) {
  try {
    const data = await verifyPayosWebhook(payload);
    if (!data?.orderCode) {
      return { status: 400, body: { message: "Invalid PayOS webhook payload" } };
    }

    const result = await completeTopupTransaction(data.orderCode, {
      providerReferenceId: data.reference || data.paymentLinkId || "",
    });

    if (result.status === 200) {
      return { status: 200, body: { success: true } };
    }

    return {
      status: 200,
      body: { success: true, message: result.body?.message || "Already processed" },
    };
  } catch (err) {
    console.error("PayOS webhook error:", err);
    return { status: 400, body: { message: "Webhook verification failed" } };
  }
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
