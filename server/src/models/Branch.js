import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    address: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    workingHours: { type: String, default: "Mon–Fri 8:00–17:00", trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    managerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

branchSchema.pre("save", async function () {
  if (this.isModified("name") || !this.slug) {
    const { generateUniqueBranchSlug } = await import("../utils/branchSlug.js");
    this.slug = await generateUniqueBranchSlug(this.name, this._id);
  }
});

branchSchema.index({ isActive: 1, name: 1 });

export const Branch = mongoose.model("Branch", branchSchema);
