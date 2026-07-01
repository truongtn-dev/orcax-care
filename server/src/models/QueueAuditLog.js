import mongoose from "mongoose";

const queueAuditLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QueueSession",
      required: true,
      index: true,
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QueueTicket",
      default: null,
    },
    action: {
      type: String,
      enum: [
        "open_session",
        "pause_session",
        "resume_session",
        "issue_ticket",
        "call_next",
        "recall",
        "mark_skipped",
        "close_session",
      ],
      required: true,
      index: true,
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export const QueueAuditLog = mongoose.model("QueueAuditLog", queueAuditLogSchema);
