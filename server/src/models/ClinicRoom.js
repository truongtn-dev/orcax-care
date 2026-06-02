import mongoose from "mongoose";

const clinicRoomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    specialtyId: { type: mongoose.Schema.Types.ObjectId, ref: "Specialty", required: true },
    status: { type: String, enum: ["active", "maintenance", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export const ClinicRoom = mongoose.model("ClinicRoom", clinicRoomSchema);
