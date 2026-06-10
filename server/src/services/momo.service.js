import crypto from "node:crypto";

const MOMO_SANDBOX_BASE = "https://test-payment.momo.vn";
const MOMO_PRODUCTION_BASE = "https://payment.momo.vn";

export function isMomoMockMode() {
  return (
    process.env.MOMO_MOCK === "true" ||
    !process.env.MOMO_PARTNER_CODE ||
    !process.env.MOMO_ACCESS_KEY ||
    !process.env.MOMO_SECRET_KEY
  );
}

function getMomoConfig() {
  return {
    partnerCode: process.env.MOMO_PARTNER_CODE || "",
    accessKey: process.env.MOMO_ACCESS_KEY || "",
    secretKey: process.env.MOMO_SECRET_KEY || "",
    baseUrl:
      process.env.MOMO_BASE_URL ||
      (process.env.MOMO_ENV === "production" ? MOMO_PRODUCTION_BASE : MOMO_SANDBOX_BASE),
  };
}

function signCreatePayment({
  accessKey,
  amount,
  extraData,
  ipnUrl,
  orderId,
  orderInfo,
  partnerCode,
  redirectUrl,
  requestId,
  requestType,
  secretKey,
}) {
  const rawSignature = [
    `accessKey=${accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${ipnUrl}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${partnerCode}`,
    `redirectUrl=${redirectUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join("&");

  return crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
}

export function verifyMomoIpnSignature(payload = {}) {
  const { secretKey } = getMomoConfig();
  if (!secretKey || !payload.signature) return false;

  const rawSignature = [
    `accessKey=${payload.accessKey || ""}`,
    `amount=${payload.amount ?? ""}`,
    `extraData=${payload.extraData || ""}`,
    `message=${payload.message || ""}`,
    `orderId=${payload.orderId || ""}`,
    `orderInfo=${payload.orderInfo || ""}`,
    `orderType=${payload.orderType || ""}`,
    `partnerCode=${payload.partnerCode || ""}`,
    `payType=${payload.payType || ""}`,
    `requestId=${payload.requestId || ""}`,
    `responseTime=${payload.responseTime ?? ""}`,
    `resultCode=${payload.resultCode ?? ""}`,
    `transId=${payload.transId ?? ""}`,
  ].join("&");

  const expected = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
  return expected === payload.signature;
}

export async function createMomoPaymentLink({
  orderId,
  requestId,
  amount,
  orderInfo,
  redirectUrl,
  ipnUrl,
  extraData = "",
  requestType = "captureWallet",
}) {
  if (isMomoMockMode()) {
    return {
      payUrl: `${redirectUrl.split("?")[0]}?mock=1&orderId=${orderId}`,
      requestId,
      mock: true,
    };
  }

  const { partnerCode, accessKey, secretKey, baseUrl } = getMomoConfig();
  const signature = signCreatePayment({
    accessKey,
    amount,
    extraData,
    ipnUrl,
    orderId,
    orderInfo,
    partnerCode,
    redirectUrl,
    requestId,
    requestType,
    secretKey,
  });

  const response = await fetch(`${baseUrl}/v2/gateway/api/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: "vi",
    }),
  });

  const body = await response.json();
  if (!response.ok || body.resultCode !== 0 || !body.payUrl) {
    throw new Error(body.message || "Could not create Momo payment link");
  }

  return {
    payUrl: body.payUrl,
    requestId,
    deeplink: body.deeplink || "",
    mock: false,
  };
}

export function isMomoPaymentSuccess(payload = {}) {
  return Number(payload.resultCode) === 0;
}
