import mongoose from "mongoose";

const diagnosisSchema = new mongoose.Schema(
  {
    code: { type: String, default: "", trim: true, uppercase: true },
    text: { type: String, required: true, trim: true },
    note: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const vitalsSchema = new mongoose.Schema(
  {
    temperatureC: { type: Number, default: null },
    bloodPressure: { type: String, default: "", trim: true },
    pulse: { type: Number, default: null },
    respiratoryRate: { type: Number, default: null },
    weightKg: { type: Number, default: null },
    heightCm: { type: Number, default: null },
  },
  { _id: false }
);

const encounterSchema = new mongoose.Schema(
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
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true,
    },
    visitDate: { type: Date, required: true, index: true },
    chiefComplaint: { type: String, default: "", trim: true, maxlength: 1000 },
    clinicalNotes: { type: String, default: "", trim: true, maxlength: 10000 },
    vitals: { type: vitalsSchema, default: () => ({}) },
    diagnoses: { type: [diagnosisSchema], default: [] },
    status: { type: String, enum: ["draft", "signed"], default: "draft", index: true },
    signedOffAt: { type: Date, default: null },
    signedOffBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

encounterSchema.index({ patientUserId: 1, visitDate: -1 });
encounterSchema.index({ doctorId: 1, visitDate: -1 });

export const Encounter = mongoose.model("Encounter", encounterSchema);
