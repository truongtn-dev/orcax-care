import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["patient", "doctor", "admin", "staff"], required: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    lastVerificationSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
