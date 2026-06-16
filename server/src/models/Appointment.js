import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: "AppointmentSlot", required: true, unique: true },
    price: { type: Number, default: 150000 },
    status: {
      type: String,
      enum: ["booked", "completed", "cancelled"],
      default: "booked",
    },
    cancellationReason: { type: String, default: "" },
    refundAmount: { type: Number, default: 0 },
    rating: { type: Number, min: 1, max: 5, default: null },
    reviewComment: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

appointmentSchema.index({ patientId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, status: 1 });

export const Appointment = mongoose.model("Appointment", appointmentSchema);
