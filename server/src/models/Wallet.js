import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
    currency: { type: String, default: "VND", trim: true },
  },
  { timestamps: true }
);

export const Wallet = mongoose.model("Wallet", walletSchema);
