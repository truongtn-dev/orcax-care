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
