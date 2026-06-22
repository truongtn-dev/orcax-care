import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["patient", "doctor", "admin", "staff"], required: true },
    fullName: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
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

userSchema.pre("save", async function assignUserSlug() {
  if (!this.isModified("fullName") && this.slug) return;

  const { generateUniqueUserSlug } = await import("../utils/userSlug.js");
  this.slug = await generateUniqueUserSlug(this.fullName, this._id);
});

export const User = mongoose.model("User", userSchema);
