import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    workingHours: { type: String, default: "Mon–Fri 8:00–17:00", trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

branchSchema.index({ isActive: 1, name: 1 });

export const Branch = mongoose.model("Branch", branchSchema);
