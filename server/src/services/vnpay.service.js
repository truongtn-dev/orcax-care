import crypto from "node:crypto";
import querystring from "node:querystring";

const VNPAY_SANDBOX_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const VNPAY_PRODUCTION_URL = "https://vnpayment.vn/paymentv2/vpcpay.html";

function sortVnpayParams(params = {}) {
  const sorted = {};
  Object.keys(params)
    .sort()
    .forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== "") {
        sorted[key] = String(value);
      }
    });
  return sorted;
}

function formatVnpayDate(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function signVnpayParams(params, secretKey) {
  const sorted = sortVnpayParams(params);
  const signData = querystring.stringify(sorted, { encode: false });
  return crypto.createHmac("sha512", secretKey).update(signData, "utf-8").digest("hex");
}

function getVnpayConfig() {
  return {
    tmnCode: process.env.VNPAY_TMN_CODE || "",
    hashSecret: process.env.VNPAY_HASH_SECRET || "",
    paymentUrl:
      process.env.VNPAY_URL ||
      (process.env.VNPAY_ENV === "production" ? VNPAY_PRODUCTION_URL : VNPAY_SANDBOX_URL),
  };
}

export function isVnpayMockMode() {
  return (
    process.env.VNPAY_MOCK === "true" ||
    !process.env.VNPAY_TMN_CODE ||
    !process.env.VNPAY_HASH_SECRET
  );
}

export function verifyVnpayCallback(query = {}) {
  const { hashSecret } = getVnpayConfig();
  const secureHash = query.vnp_SecureHash;
  if (!secureHash || !hashSecret) return false;

  const params = { ...query };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  const expected = signVnpayParams(params, hashSecret);
  return expected === secureHash;
}

export function isVnpayPaymentSuccess(query = {}) {
  return String(query.vnp_ResponseCode || "") === "00";
}

export function createVnpayPaymentUrl({
  orderId,
  amount,
  orderInfo,
  returnUrl,
  ipnUrl,
  ipAddr = "127.0.0.1",
}) {
  if (isVnpayMockMode()) {
    return {
      payUrl: `${returnUrl.split("?")[0]}?mock=1&orderId=${orderId}`,
      mock: true,
    };
  }

  const { tmnCode, hashSecret, paymentUrl } = getVnpayConfig();
  const now = new Date();
  const expireAt = new Date(now.getTime() + 15 * 60 * 1000);

  const params = sortVnpayParams({
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: amount * 100,
    vnp_CurrCode: "VND",
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: returnUrl,
    vnp_IpnUrl: ipnUrl,
    vnp_CreateDate: formatVnpayDate(now),
    vnp_ExpireDate: formatVnpayDate(expireAt),
    vnp_IpAddr: ipAddr,
  });

  const secureHash = signVnpayParams(params, hashSecret);
  const checkoutUrl = `${paymentUrl}?${querystring.stringify(
    { ...params, vnp_SecureHash: secureHash },
    { encode: false }
  )}`;

  return {
    payUrl: checkoutUrl,
    mock: false,
  };
}

export function buildVnpayIpnSuccess() {
  return { RspCode: "00", Message: "Confirm Success" };
}

export function buildVnpayIpnFailure(message = "Invalid checksum") {
  return { RspCode: "97", Message: message };
}
