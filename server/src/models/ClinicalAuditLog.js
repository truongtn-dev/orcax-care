import mongoose from "mongoose";

const clinicalAuditLogSchema = new mongoose.Schema(
  {
    encounterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Encounter",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["update_diagnosis", "add_diagnosis", "remove_diagnosis"],
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

export const ClinicalAuditLog = mongoose.model("ClinicalAuditLog", clinicalAuditLogSchema);
