import crypto from "node:crypto";

const SEPAY_SANDBOX_CHECKOUT = "https://pay-sandbox.sepay.vn/v1/checkout/init";
const SEPAY_PRODUCTION_CHECKOUT = "https://pay.sepay.vn/v1/checkout/init";

const SIGNABLE_FIELDS = new Set([
  "merchant",
  "operation",
  "payment_method",
  "order_amount",
  "currency",
  "order_invoice_number",
  "order_description",
  "customer_id",
  "success_url",
  "error_url",
  "cancel_url",
]);

function getSepayConfig() {
  return {
    merchantId: process.env.SEPAY_MERCHANT_ID || "",
    secretKey: process.env.SEPAY_SECRET_KEY || "",
    checkoutUrl:
      process.env.SEPAY_CHECKOUT_URL ||
      (process.env.SEPAY_ENV === "production"
        ? SEPAY_PRODUCTION_CHECKOUT
        : SEPAY_SANDBOX_CHECKOUT),
  };
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
  for (const [field, value] of Object.entries(fields)) {
    if (!SIGNABLE_FIELDS.has(field)) continue;
    if (value === undefined || value === null || value === "") continue;
    signed.push(`${field}=${value}`);
  }
  return crypto.createHmac("sha256", secretKey).update(signed.join(","), "utf8").digest("base64");
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
    merchant: merchantId,
    currency: "VND",
    order_amount: String(amount),
    operation: "PURCHASE",
    payment_method: paymentMethod,
    order_description: description,
    order_invoice_number: orderInvoiceNumber,
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
    checkoutFields: { ...fields, signature },
    checkoutMethod: "POST",
    mock: false,
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
