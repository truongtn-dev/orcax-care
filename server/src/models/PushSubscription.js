import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, trim: true },
    keys: {
      p256dh: { type: String, default: "", trim: true },
      auth: { type: String, default: "", trim: true },
    },
    permission: {
      type: String,
      enum: ["default", "granted", "denied"],
      default: "default",
    },
    userAgent: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });
pushSubscriptionSchema.index({ userId: 1, isActive: 1, updatedAt: -1 });

export const PushSubscription = mongoose.model("PushSubscription", pushSubscriptionSchema);
