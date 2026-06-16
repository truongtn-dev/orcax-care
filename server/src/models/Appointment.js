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
      unique: true,
    },
    reason: { type: String, default: "", trim: true, maxlength: 500 },
    fee: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["confirmed", "completed", "cancelled"],
      default: "confirmed",
      index: true,
    },
    insuranceCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InsuranceCard",
      default: null,
    },
    rating: { type: Number, min: 1, max: 5, default: null },
    reviewComment: { type: String, default: "", trim: true, maxlength: 1000 },
    reviewedAt: { type: Date, default: null },
    cancellationReason: { type: String, default: "", trim: true, maxlength: 500 },
    refundAmount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

appointmentSchema.index({ patientUserId: 1, createdAt: -1 });
appointmentSchema.index({ doctorId: 1, createdAt: -1 });

export const Appointment = mongoose.model("Appointment", appointmentSchema);
