import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    specialtyId: { type: mongoose.Schema.Types.ObjectId, ref: "Specialty", required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    licenseNo: { type: String, required: true, unique: true, trim: true },
    bio: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

doctorSchema.index({ specialtyId: 1, isActive: 1 });
doctorSchema.index({ departmentId: 1, isActive: 1 });

export const Doctor = mongoose.model("Doctor", doctorSchema);
