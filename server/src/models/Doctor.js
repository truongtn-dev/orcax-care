import mongoose from "mongoose";
import { generateUniqueDoctorSlug } from "../utils/doctorSlug.js";

const doctorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    specialtyId: { type: mongoose.Schema.Types.ObjectId, ref: "Specialty", required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    licenseNo: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    bio: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

doctorSchema.pre("save", async function assignSlug() {
  if (this.slug) return;

  const User = mongoose.model("User");
  const user = await User.findById(this.userId).select("fullName").lean();
  if (!user?.fullName) return;

  this.slug = await generateUniqueDoctorSlug(user.fullName, this._id);
});

doctorSchema.index({ specialtyId: 1, isActive: 1 });
doctorSchema.index({ departmentId: 1, isActive: 1 });

export const Doctor = mongoose.model("Doctor", doctorSchema);
