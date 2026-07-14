import mongoose from "mongoose";

const complaintReplySchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true,
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
  },
  { timestamps: true }
);

export const ComplaintReply = mongoose.model("ComplaintReply", complaintReplySchema);

const complaintSchema = new mongoose.Schema(
  {
    patientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ticketId: { type: String, required: true, unique: true, index: true },
    category: {
      type: String,
      enum: ["service", "billing", "doctor", "pharmacy", "technical", "other"],
      required: true,
    },
    ticketType: {
      type: String,
      enum: ["complaint", "feedback", "request"],
      required: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    attachmentUrl: { type: String, default: "", trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
    statusUpdatedAt: { type: Date, default: Date.now },
    replies: { type: [complaintReplySchema], default: [] },
  },
  { timestamps: true }
);

export const Complaint = mongoose.model("Complaint", complaintSchema);
