import mongoose from "mongoose";

const prescriptionLineItemSchema = new mongoose.Schema(
  {
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
    medicineName: { type: String, required: true, trim: true },
    medicineCode: { type: String, required: true, trim: true, uppercase: true },
    unit: { type: String, default: "", trim: true },
    quantity: { type: Number, required: true, min: 1 },
    durationDays: { type: Number, default: 1, min: 1 },
    dosage: { type: String, default: "", trim: true },
    instructions: { type: String, default: "", trim: true },
    unitPrice: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, default: 0, min: 0 },
    stockSnapshot: { type: Number, default: 0, min: 0 },
    stockWarning: { type: Boolean, default: false },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
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
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    status: { type: String, enum: ["draft", "issued", "cancelled"], default: "draft", index: true },
    notes: { type: String, default: "", trim: true },
    lineItems: { type: [prescriptionLineItemSchema], default: [] },
    totalAmount: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    issuedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

prescriptionSchema.index({ encounterId: 1, createdAt: -1 });
prescriptionSchema.index({ patientUserId: 1, createdAt: -1 });

export const Prescription = mongoose.model("Prescription", prescriptionSchema);
