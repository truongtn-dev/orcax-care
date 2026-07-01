import mongoose from "mongoose";

const queueSessionSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClinicRoom",
      required: true,
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["open", "paused", "closed"],
      default: "open",
      index: true,
    },
    currentNumber: { type: Number, default: 0, min: 0 },
    lastNumber: { type: Number, default: 0, min: 0 },
    lastSkippedTicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QueueTicket",
      default: null,
    },
    openedAt: { type: Date, default: Date.now },
    pausedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

queueSessionSchema.index({ roomId: 1, date: 1, status: 1 });
queueSessionSchema.index({ doctorId: 1, date: 1, status: 1 });

export const QueueSession = mongoose.model("QueueSession", queueSessionSchema);
