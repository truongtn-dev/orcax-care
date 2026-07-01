import mongoose from "mongoose";

const medicalImageSchema = new mongoose.Schema(
  {
    encounterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Encounter",
      required: true,
      index: true,
    },
    patientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, default: "other", trim: true },
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, default: "", trim: true },
    mimeType: { type: String, default: "", trim: true },
    sizeBytes: { type: Number, default: 0, min: 0 },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

medicalImageSchema.index({ encounterId: 1, deletedAt: 1, createdAt: -1 });
medicalImageSchema.index({ patientUserId: 1, deletedAt: 1, createdAt: -1 });

export const MedicalImage = mongoose.model("MedicalImage", medicalImageSchema);
