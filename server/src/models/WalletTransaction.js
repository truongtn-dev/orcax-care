import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["topup", "deduct", "refund"], required: true },
    amount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "cancelled"],
      default: "pending",
    },
    provider: { type: String, enum: ["payos", "internal"], default: "payos" },
    orderCode: { type: Number, unique: true, sparse: true },
    paymentLinkId: { type: String, default: "" },
    description: { type: String, default: "" },
    failureReason: { type: String, default: "" },
    balanceAfter: { type: Number, default: null },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1, provider: 1 });

export const WalletTransaction = mongoose.model("WalletTransaction", walletTransactionSchema);
