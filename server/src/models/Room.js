import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    name: { type: String, required: true, trim: true },
    floor: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roomSchema.index({ departmentId: 1, isActive: 1 });

export const Room = mongoose.model("Room", roomSchema);
