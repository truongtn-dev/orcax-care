import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema(
  {
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
    type: { type: String, enum: ["inbound", "outbound"], required: true },
    quantity: { type: Number, required: true, min: 1 },
    batchNo: { type: String, default: "", trim: true },
    expiryDate: { type: Date, default: null },
    supplierRef: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

stockMovementSchema.index({ medicineId: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });

export const StockMovement = mongoose.model("StockMovement", stockMovementSchema);
