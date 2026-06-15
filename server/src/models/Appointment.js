import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AppointmentSlot",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "checked_in", "completed", "cancelled"],
      default: "scheduled",
      index: true,
    },
    reason: { type: String, default: "", trim: true },
    referenceCode: { type: String, required: true, trim: true, unique: true },
  },
  { timestamps: true }
);

appointmentSchema.index({ patientUserId: 1, status: 1, createdAt: -1 });
appointmentSchema.index({ doctorId: 1, status: 1 });

export const Appointment = mongoose.model("Appointment", appointmentSchema);
