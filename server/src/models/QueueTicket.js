import mongoose from "mongoose";

const queueTicketSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QueueSession",
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
    patientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    number: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["waiting", "called", "serving", "skipped", "done", "no-show"],
      default: "waiting",
      index: true,
    },
    calledAt: { type: Date, default: null },
    skippedAt: { type: Date, default: null },
    servedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

queueTicketSchema.index({ sessionId: 1, number: 1 }, { unique: true });
queueTicketSchema.index({ sessionId: 1, status: 1, number: 1 });

export const QueueTicket = mongoose.model("QueueTicket", queueTicketSchema);
