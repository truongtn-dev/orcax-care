import crypto from "node:crypto";

const SEPAY_SANDBOX_CHECKOUT = "https://pay-sandbox.sepay.vn/v1/checkout/init";
const SEPAY_PRODUCTION_CHECKOUT = "https://pay.sepay.vn/v1/checkout/init";
const SEPAY_SANDBOX_API = "https://pgapi-sandbox.sepay.vn/v1";
const SEPAY_PRODUCTION_API = "https://pgapi.sepay.vn/v1";

/** Field order for HMAC signature — must match SePay docs / SDK */
const SEPAY_SIGN_FIELD_ORDER = [
  "order_amount",
  "merchant",
  "currency",
  "operation",
  "order_description",
  "order_invoice_number",
  "customer_id",
  "payment_method",
  "success_url",
  "error_url",
  "cancel_url",
];

const SIGNABLE_FIELDS = new Set(SEPAY_SIGN_FIELD_ORDER);

export function isSepayProduction() {
  if (process.env.SEPAY_ENV === "production") return true;
  if (process.env.SEPAY_ENV === "sandbox") return false;
  return /LIVE/i.test(process.env.SEPAY_MERCHANT_ID || "");
}

function getSepayEndpoints() {
  const production = isSepayProduction();
  return {
    checkoutInit:
      process.env.SEPAY_CHECKOUT_URL ||
      (production ? SEPAY_PRODUCTION_CHECKOUT : SEPAY_SANDBOX_CHECKOUT),
    apiBase: production ? SEPAY_PRODUCTION_API : SEPAY_SANDBOX_API,
  };
}

function getSepayConfig() {
  const { checkoutInit } = getSepayEndpoints();
  return {
    merchantId: process.env.SEPAY_MERCHANT_ID || "",
    secretKey: process.env.SEPAY_SECRET_KEY || "",
    checkoutUrl: checkoutInit,
  };
}

function getSepayAuthHeader() {
  const { merchantId, secretKey } = getSepayConfig();
  return `Basic ${Buffer.from(`${merchantId}:${secretKey}`).toString("base64")}`;
}

export function isSepayMockMode() {
  return (
    process.env.SEPAY_MOCK === "true" ||
    !process.env.SEPAY_MERCHANT_ID ||
    !process.env.SEPAY_SECRET_KEY
  );
}

export function signSepayFields(fields = {}, secretKey) {
  const signed = [];
  for (const field of SEPAY_SIGN_FIELD_ORDER) {
    const value = fields[field];
    if (!SIGNABLE_FIELDS.has(field)) continue;
    if (value === undefined || value === null || value === "") continue;
    signed.push(`${field}=${value}`);
  }
  return crypto.createHmac("sha256", secretKey).update(signed.join(","), "utf8").digest("base64");
}

function buildOrderedCheckoutFields(fields = {}, signature) {
  const ordered = {};
  for (const field of SEPAY_SIGN_FIELD_ORDER) {
    if (fields[field] === undefined || fields[field] === null || fields[field] === "") continue;
    ordered[field] = String(fields[field]);
  }
  ordered.signature = signature;
  return ordered;
}

export function createSepayCheckout({
  orderInvoiceNumber,
  amount,
  description,
  successUrl,
  errorUrl,
  cancelUrl,
  customerId = "",
  paymentMethod = "BANK_TRANSFER",
}) {
  if (isSepayMockMode()) {
    return {
      checkoutUrl: `${successUrl.split("?")[0]}?mock=1&orderId=${orderInvoiceNumber}`,
      checkoutFields: null,
      checkoutMethod: "GET",
      mock: true,
    };
  }

  const { merchantId, secretKey, checkoutUrl } = getSepayConfig();
  const fields = {
    order_amount: String(amount),
    merchant: merchantId,
    currency: "VND",
    operation: "PURCHASE",
    order_description: description,
    order_invoice_number: orderInvoiceNumber,
    payment_method: paymentMethod,
    success_url: successUrl,
    error_url: errorUrl,
    cancel_url: cancelUrl,
  };

  if (customerId) {
    fields.customer_id = customerId;
  }

  const signature = signSepayFields(fields, secretKey);

  return {
    checkoutUrl,
    checkoutFields: buildOrderedCheckoutFields(fields, signature),
    checkoutMethod: "POST",
    mock: false,
  };
}

export function parseSepayCheckoutHtml(html = "") {
  const qrMatch = html.match(/https:\/\/qr\.sepay\.vn\/img\?[^"']+/);
  const accMatch = html.match(/class="account-number">([^<]+)/);
  const qrCode = qrMatch?.[0] || "";
  let transferContent = "";
  let bin = "";
  if (qrCode) {
    try {
      const url = new URL(qrCode);
      transferContent = url.searchParams.get("des") || "";
      bin = url.searchParams.get("bank") || "";
    } catch {
      /* ignore malformed QR URL */
    }
  }
  return {
    qrCode,
    accountNumber: accMatch?.[1]?.trim() || "",
    bin,
    transferContent,
  };
}

/**
 * Initialize SePay session server-side and extract VietQR for in-app checkout.
 * Avoids redirecting the patient to pay.sepay.vn.
 */
export async function initializeSepayCheckout(params) {
  const payment = createSepayCheckout(params);
  if (payment.mock) return payment;

  const initRes = await fetch(payment.checkoutUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payment.checkoutFields).toString(),
    redirect: "manual",
  });

  if (initRes.status !== 302 && !initRes.ok) {
    throw new Error(`SePay checkout init failed (${initRes.status})`);
  }

  const sessionUrl = initRes.headers.get("location");
  if (!sessionUrl) {
    throw new Error("SePay checkout init did not return a session URL");
  }

  const html = await fetch(sessionUrl).then((res) => res.text());
  const parsed = parseSepayCheckoutHtml(html);
  const sepayOrderId =
    new URL(sessionUrl).searchParams.get("order_id") || parsed.transferContent || "";

  if (!parsed.qrCode) {
    throw new Error("SePay session did not expose VietQR data");
  }

  return {
    ...payment,
    checkoutPageUrl: sessionUrl,
    sepayOrderId,
    qrCode: parsed.qrCode,
    accountNumber: parsed.accountNumber,
    bin: parsed.bin,
    transferContent: parsed.transferContent,
    currency: "VND",
    mock: false,
  };
}

export async function verifySepayOrderStatus(orderInvoiceNumber) {
  if (isSepayMockMode() || !orderInvoiceNumber) {
    return { paid: false, status: "pending" };
  }

  const { apiBase } = getSepayEndpoints();
  const res = await fetch(`${apiBase}/order/detail/${encodeURIComponent(orderInvoiceNumber)}`, {
    headers: { Authorization: getSepayAuthHeader() },
  });

  if (!res.ok) {
    return { paid: false, status: "unknown" };
  }

  const json = await res.json();
  const orderStatus = json.data?.order_status || "pending";
  return {
    paid: orderStatus === "CAPTURED",
    status: orderStatus,
    sepayOrderId: json.data?.order_id || "",
  };
}

export function verifySepayIpnSecret(headerValue) {
  if (isSepayMockMode()) return true;
  const { secretKey } = getSepayConfig();
  return headerValue === secretKey;
}

export function isSepayOrderPaid(payload = {}) {
  return (
    payload.notification_type === "ORDER_PAID" &&
    payload.order?.order_status === "CAPTURED" &&
    payload.transaction?.transaction_status === "APPROVED"
  );
}
