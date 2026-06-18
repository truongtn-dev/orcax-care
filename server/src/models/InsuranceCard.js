import mongoose from "mongoose";

const insuranceCardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    providerName: { type: String, required: true, trim: true },
    policyNumber: { type: String, required: true, trim: true },
    holderName: { type: String, required: true, trim: true },
    coverageType: { type: String, default: "", trim: true },
    coveragePercent: { type: Number, default: 0, min: 0, max: 100 },
    validFrom: { type: Date, default: null },
    validTo: { type: Date, default: null },
    isPrimary: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

insuranceCardSchema.index({ userId: 1, isActive: 1 });
insuranceCardSchema.index({ userId: 1, policyNumber: 1 }, { unique: true });

export const InsuranceCard = mongoose.model("InsuranceCard", insuranceCardSchema);
