import { Wallet } from "../models/Wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";

export async function getOrCreateWallet(userId) {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId, balance: 0 });
  }
  return wallet;
}

function serializeTransaction(txn) {
  return {
    _id: txn._id.toString(),
    type: txn.type,
    amount: txn.amount,
    status: txn.status,
    provider: txn.provider,
    orderCode: txn.orderCode || null,
    providerOrderId: txn.providerOrderId || null,
    providerReferenceId: txn.providerReferenceId || "",
    description: txn.description,
    failureReason: txn.failureReason || "",
    balanceAfter: txn.balanceAfter,
    createdAt: txn.createdAt,
    updatedAt: txn.updatedAt,
  };
}

function buildTopupReceipt(txn) {
  return {
    orderCode: txn.orderCode || null,
    providerOrderId: txn.providerOrderId || null,
    referenceId: txn.providerReferenceId || txn.paymentLinkId || String(txn.orderCode || txn.providerOrderId || ""),
    amount: txn.amount,
    paidAt: txn.updatedAt,
    provider: txn.provider,
  };
}

async function findTopupTransaction(ref = {}) {
  const { orderCode, providerOrderId } = ref;
  if (providerOrderId) {
    return WalletTransaction.findOne({ providerOrderId: String(providerOrderId), type: "topup" });
  }
  if (orderCode) {
    return WalletTransaction.findOne({ orderCode: Number(orderCode), type: "topup" });
  }
  return null;
}

export async function getWalletOverview(userId, { limit = 10 } = {}) {
  const wallet = await getOrCreateWallet(userId);

  // Ledger reconciliation check
  const allSuccessfulTxns = await WalletTransaction.find({ userId, status: "success" }).lean();
  let ledgerSum = 0;
  for (const txn of allSuccessfulTxns) {
    if (txn.type === "topup" || txn.type === "refund") {
      ledgerSum += txn.amount;
    } else if (txn.type === "deduct") {
      ledgerSum -= txn.amount;
    }
  }

  if (wallet.balance !== ledgerSum) {
    console.warn(`Wallet balance discrepancy detected for user ${userId}. Wallet: ${wallet.balance}, Ledger: ${ledgerSum}. Reconciling...`);
    wallet.balance = ledgerSum;
    await wallet.save();
  }

  const transactions = await WalletTransaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(50, Math.max(1, parseInt(limit, 10) || 10)))
    .lean();

  return {
    balance: wallet.balance,
    currency: wallet.currency,
    transactions: transactions.map(serializeTransaction),
  };
}

export async function generateUniqueOrderCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderCode = Number(
      `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-12)
    );
    const exists = await WalletTransaction.exists({ orderCode });
    if (!exists) return orderCode;
  }
  throw new Error("Could not generate unique PayOS order code");
}

export async function generateUniqueProviderOrderId(prefix = "VNP") {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const providerOrderId = `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const exists = await WalletTransaction.exists({ providerOrderId });
    if (!exists) return providerOrderId;
  }
  throw new Error("Could not generate unique provider order id");
}

export async function completeTopupTransaction(ref, { providerReferenceId = "" } = {}) {
  const txn = await findTopupTransaction(
    typeof ref === "object" ? ref : { orderCode: ref }
  );
  if (!txn) {
    return { status: 404, body: { message: "Top-up transaction not found" } };
  }

  if (txn.status === "success") {
    const wallet = await Wallet.findOne({ userId: txn.userId });
    return {
      status: 200,
      body: {
        alreadyProcessed: true,
        transaction: serializeTransaction(txn),
        balance: wallet?.balance || 0,
      },
    };
  }

  if (txn.status === "cancelled" || txn.status === "failed") {
    return {
      status: 409,
      body: { message: "Top-up already closed", failureReason: txn.failureReason },
    };
  }

  const wallet = await getOrCreateWallet(txn.userId);
  wallet.balance += txn.amount;
  await wallet.save();

  txn.status = "success";
  txn.balanceAfter = wallet.balance;
  txn.failureReason = "";
  if (providerReferenceId) {
    txn.providerReferenceId = String(providerReferenceId);
  }
  await txn.save();

  return {
    status: 200,
    body: {
      transaction: serializeTransaction(txn),
      balance: wallet.balance,
      receipt: buildTopupReceipt(txn),
    },
  };
}

export async function markTopupCancelled(ref, reason = "Payment cancelled") {
  const txn = await findTopupTransaction(
    typeof ref === "object" ? ref : { orderCode: ref }
  );
  if (!txn) {
    return { status: 404, body: { message: "Top-up transaction not found" } };
  }
  if (txn.status === "success") {
    return { status: 409, body: { message: "Top-up already completed" } };
  }
  txn.status = "cancelled";
  txn.failureReason = reason;
  await txn.save();
  return { status: 200, body: { transaction: serializeTransaction(txn) } };
}

export async function markTopupFailed(ref, reason) {
  const txn = await findTopupTransaction(
    typeof ref === "object" ? ref : { orderCode: ref }
  );
  if (!txn) {
    return { status: 404, body: { message: "Top-up transaction not found" } };
  }
  if (txn.status === "success") {
    return { status: 409, body: { message: "Top-up already completed" } };
  }
  txn.status = "failed";
  txn.failureReason = reason || "Payment failed";
  await txn.save();
  return { status: 200, body: { transaction: serializeTransaction(txn) } };
}

export async function deductWalletBalance(userId, amount, description = "Booking payment") {
  const value = parseInt(amount, 10);
  if (!value || value < 1) {
    return { status: 400, body: { message: "Invalid deduction amount" } };
  }

  const wallet = await Wallet.findOneAndUpdate(
    { userId, balance: { $gte: value } },
    { $inc: { balance: -value } },
    { new: true }
  );

  if (!wallet) {
    const current = await Wallet.findOne({ userId }).lean();
    return {
      status: 409,
      body: {
        message: "Insufficient wallet balance",
        balance: current?.balance || 0,
        requiredAmount: value,
      },
    };
  }

  const txn = await WalletTransaction.create({
    userId,
    type: "deduct",
    amount: value,
    status: "success",
    provider: "internal",
    description,
    balanceAfter: wallet.balance,
  });

  return {
    status: 200,
    body: {
      balance: wallet.balance,
      transaction: serializeTransaction(txn),
    },
  };
}

export async function refundWalletBalance(userId, amount, description = "Appointment refund") {
  const value = parseInt(amount, 10);
  if (!value || value < 1) {
    return { status: 400, body: { message: "Invalid refund amount" } };
  }

  const wallet = await getOrCreateWallet(userId);
  wallet.balance += value;
  await wallet.save();

  const txn = await WalletTransaction.create({
    userId,
    type: "refund",
    amount: value,
    status: "success",
    provider: "internal",
    description,
    balanceAfter: wallet.balance,
  });

  return {
    status: 200,
    body: {
      balance: wallet.balance,
      transaction: serializeTransaction(txn),
    },
  };
}

export { serializeTransaction };
