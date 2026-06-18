export const WALLET_LIMITS = {
  minTopup: 10000,
  maxTopup: 50000000,
};

export const WALLET_AMOUNT_PRESETS = [50000, 100000, 200000, 500000];

export const WALLET_PAYMENT_METHODS = [
  {
    id: "payos",
    label: "PayOS",
    hint: "Scan VietQR in your banking app",
    theme: "payos",
  },
  {
    id: "sepay",
    label: "SePay",
    hint: "Scan VietQR on the wallet checkout page",
    theme: "sepay",
  },
];

export const WALLET_PROVIDER_LABELS = {
  payos: "PayOS",
  sepay: "SePay",
};

export function formatWalletCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatWalletExpiry(expiredAt) {
  if (!expiredAt) return null;
  const date = new Date(Number(expiredAt) * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US");
}

export function isWalletQrImageSource(value) {
  return (
    typeof value === "string" &&
    (value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("data:image"))
  );
}

export function resolveCheckoutPath(checkoutUrl) {
  if (!checkoutUrl) return null;
  if (checkoutUrl.startsWith("/")) return checkoutUrl;
  try {
    const url = new URL(checkoutUrl, window.location.origin);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return checkoutUrl;
  }
}

export function getTransactionCheckoutPath(txn) {
  if (!txn || txn.type !== "topup" || txn.status !== "pending") return null;
  if (txn.provider === "payos" && txn.orderCode) {
    return `/patient/wallet/checkout/payos/${txn.orderCode}`;
  }
  if (txn.providerOrderId && txn.provider) {
    return `/patient/wallet/checkout/${txn.provider}/${txn.providerOrderId}`;
  }
  return null;
}

export const WALLET_TXN_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "topup", label: "Top-up" },
  { value: "deduct", label: "Payment" },
  { value: "refund", label: "Refund" },
];

export function formatWalletTransactionDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function computeWalletStats(transactions = []) {
  let totalTopup = 0;
  let totalSpent = 0;
  let pendingTopups = 0;

  for (const txn of transactions) {
    if (txn.type === "topup") {
      if (txn.status === "success") totalTopup += txn.amount;
      if (txn.status === "pending") pendingTopups += 1;
    }
    if (txn.type === "deduct" && txn.status === "success") {
      totalSpent += txn.amount;
    }
  }

  return { totalTopup, totalSpent, pendingTopups };
}

export function getWalletErrorMessage(err) {
  const status = err?.response?.status;
  const serverMessage = err?.response?.data?.message;

  if (status === 502 || status === 503) {
    return "Cannot reach the server. Run `npm run dev` in the server folder (port 5000), then tap Retry.";
  }
  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  if (serverMessage) return serverMessage;
  if (err?.message?.includes("Network Error")) {
    return "Network error. Check that the backend is running and try again.";
  }
  return err?.message || "Something went wrong. Please try again.";
}
