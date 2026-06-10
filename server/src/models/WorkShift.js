import mongoose from "mongoose";

const workShiftSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "ClinicRoom" },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    maxPatients: { type: Number, required: true, min: 1 },
    slotDurationMin: { type: Number, required: true, min: 15 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

workShiftSchema.index({ doctorId: 1, dayOfWeek: 1, isActive: 1 });
workShiftSchema.index({ roomId: 1, dayOfWeek: 1 });

export const WorkShift = mongoose.model("WorkShift", workShiftSchema);
