import mongoose from "mongoose";

const clinicRoomSchema = new mongoose.Schema(
  {
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    roomCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    roomNumber: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String, required: true, trim: true },
    specialtyId: { type: mongoose.Schema.Types.ObjectId, ref: "Specialty" },
    floor: { type: String, default: "" },
    capacity: { type: Number, default: 1, min: 1 },
    equipmentNotes: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ["active", "maintenance", "inactive"], default: "active" },
  },
  { timestamps: true }
);

clinicRoomSchema.index({ departmentId: 1, isActive: 1 });

export const ClinicRoom = mongoose.model("ClinicRoom", clinicRoomSchema);
