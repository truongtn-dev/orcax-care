import { PayOS } from "@payos/node";

export function isPayosMockMode() {
  return (
    process.env.PAYOS_MOCK === "true" ||
    !process.env.PAYOS_CLIENT_ID ||
    !process.env.PAYOS_API_KEY ||
    !process.env.PAYOS_CHECKSUM_KEY
  );
}

function getPayosClient() {
  return new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
  });
}

export async function createPayosPaymentLink({
  orderCode,
  amount,
  description,
  returnUrl,
  cancelUrl,
}) {
  if (isPayosMockMode()) {
    return {
      checkoutUrl: `${returnUrl.split("?")[0]}?mock=1&orderCode=${orderCode}`,
      paymentLinkId: `mock-${orderCode}`,
      mock: true,
    };
  }

  const payos = getPayosClient();
  const paymentLink = await payos.paymentRequests.create({
    orderCode,
    amount,
    description,
    returnUrl,
    cancelUrl,
  });

  return {
    checkoutUrl: paymentLink.checkoutUrl,
    paymentLinkId: String(paymentLink.paymentLinkId || ""),
    mock: false,
  };
}

export async function verifyPayosPayment(orderCode) {
  if (isPayosMockMode()) {
    return { paid: true, status: "PAID", mock: true };
  }

  const payos = getPayosClient();
  const payment = await payos.paymentRequests.get(Number(orderCode));
  const status = payment?.status || payment?.data?.status || "";
  return {
    paid: status === "PAID",
    status,
    mock: false,
  };
}
