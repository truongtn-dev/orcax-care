import mongoose from "mongoose";
import { isMongoObjectId, slugifyDoctorName as slugifyPersonName } from "./doctorSlug.js";

export { slugifyPersonName };

async function getUserModel() {
  const { User } = await import("../models/User.js");
  return User;
}

export async function generateUniqueUserSlug(fullName, excludeUserId = null) {
  const User = await getUserModel();
  const base = slugifyPersonName(fullName);
  let slug = base;
  let counter = 2;

  while (true) {
    const query = { slug };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const existing = await User.findOne(query).select("_id").lean();
    if (!existing) return slug;

    slug = `${base}-${counter}`;
    counter += 1;
  }
}

export async function findUserByIdentifier(identifier) {
  if (!identifier) return null;

  const key = String(identifier).trim();
  const User = await getUserModel();

  if (isMongoObjectId(key) && mongoose.Types.ObjectId.isValid(key)) {
    return User.findById(key);
  }

  return User.findOne({ slug: key.toLowerCase() });
}

export async function ensureAllUserSlugs() {
  const User = await getUserModel();
  const users = await User.find({
    $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
  })
    .select("_id fullName")
    .lean();

  for (const user of users) {
    if (!user.fullName) continue;
    const slug = await generateUniqueUserSlug(user.fullName, user._id);
    await User.updateOne({ _id: user._id }, { $set: { slug } });
  }
}
