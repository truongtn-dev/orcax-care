import mongoose from "mongoose";

export function isMongoObjectId(value) {
  return (
    typeof value === "string" &&
    /^[a-f0-9]{24}$/i.test(value) &&
    mongoose.Types.ObjectId.isValid(value)
  );
}

export function slugifyDoctorName(fullName) {
  let value = String(fullName || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!value) value = "doctor";
  return value.slice(0, 80);
}

async function getDoctorModel() {
  const { Doctor } = await import("../models/Doctor.js");
  return Doctor;
}

export async function generateUniqueDoctorSlug(fullName, excludeDoctorId = null) {
  const Doctor = await getDoctorModel();
  const base = slugifyDoctorName(fullName);
  let slug = base;
  let counter = 2;

  while (true) {
    const query = { slug };
    if (excludeDoctorId) {
      query._id = { $ne: excludeDoctorId };
    }

    const existing = await Doctor.findOne(query).select("_id").lean();
    if (!existing) return slug;

    slug = `${base}-${counter}`;
    counter += 1;
  }
}

export async function ensureAllDoctorSlugs() {
  const Doctor = await getDoctorModel();
  const { User } = await import("../models/User.js");

  const doctors = await Doctor.find({
    $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
  })
    .select("_id userId")
    .lean();

  for (const doctor of doctors) {
    const user = await User.findById(doctor.userId).select("fullName").lean();
    if (!user?.fullName) continue;

    const slug = await generateUniqueDoctorSlug(user.fullName, doctor._id);
    await Doctor.updateOne({ _id: doctor._id }, { $set: { slug } });
  }
}
