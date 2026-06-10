import mongoose from "mongoose";

const appointmentSlotSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    workShiftId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkShift", required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "ClinicRoom" },
    date: { type: Date, required: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["available", "booked", "blocked"],
      default: "available",
    },
  },
  { timestamps: true }
);

appointmentSlotSchema.index({ doctorId: 1, date: 1, startTime: 1 }, { unique: true });
appointmentSlotSchema.index({ workShiftId: 1, date: 1 });
appointmentSlotSchema.index({ status: 1, date: 1 });

export const AppointmentSlot = mongoose.model("AppointmentSlot", appointmentSlotSchema);
