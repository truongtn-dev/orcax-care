import mongoose from "mongoose";

const favoriteDoctorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  },
  { timestamps: true }
);

favoriteDoctorSchema.index({ userId: 1, doctorId: 1 }, { unique: true });
favoriteDoctorSchema.index({ userId: 1, createdAt: -1 });

export const FavoriteDoctor = mongoose.model("FavoriteDoctor", favoriteDoctorSchema);
