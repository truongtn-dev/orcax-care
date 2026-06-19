import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    unit: { type: String, default: "tablet", trim: true },
    price: { type: Number, default: 0, min: 0 },
    stockQty: { type: Number, default: 0, min: 0 },
    minStockLevel: { type: Number, default: 10, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

medicineSchema.index({ name: 1 });
medicineSchema.index({ isActive: 1, stockQty: 1 });

export const Medicine = mongoose.model("Medicine", medicineSchema);
