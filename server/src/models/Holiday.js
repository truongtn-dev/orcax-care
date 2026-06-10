import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

holidaySchema.index({ date: 1, isActive: 1 });

export const Holiday = mongoose.model("Holiday", holidaySchema);
