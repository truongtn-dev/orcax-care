import mongoose from "mongoose";

const staffProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    isBranchManager: { type: Boolean, default: false },
  },
  { timestamps: true }
);

staffProfileSchema.index({ branchId: 1, isBranchManager: 1 });

export const StaffProfile = mongoose.model("StaffProfile", staffProfileSchema);
