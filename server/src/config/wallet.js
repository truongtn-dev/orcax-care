export function getWalletLimits() {
  const minTopup = parseInt(process.env.WALLET_MIN_TOPUP || "10000", 10);
  const maxTopup = parseInt(process.env.WALLET_MAX_TOPUP || "50000000", 10);
  return {
    minTopup: Number.isFinite(minTopup) ? minTopup : 10000,
    maxTopup: Number.isFinite(maxTopup) ? maxTopup : 50000000,
  };
}

export function getClientOrigin() {
  return (process.env.CLIENT_ORIGIN || "http://localhost:5173").replace(/\/$/, "");
}

export function getApiPublicOrigin(req) {
  if (process.env.API_PUBLIC_ORIGIN) {
    return process.env.API_PUBLIC_ORIGIN.replace(/\/$/, "");
  }
  const protocol = req?.headers?.["x-forwarded-proto"] || req?.protocol || "http";
  const host = req?.headers?.["x-forwarded-host"] || req?.get?.("host") || "localhost:5000";
  return `${protocol}://${host}`;
}
