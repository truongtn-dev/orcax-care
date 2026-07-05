import mongoose from "mongoose";

export function slugifyBranchName(name) {
  let value = String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!value) value = "branch";
  return value.slice(0, 80);
}

async function getBranchModel() {
  const { Branch } = await import("../models/Branch.js");
  return Branch;
}

export async function generateUniqueBranchSlug(name, excludeBranchId = null) {
  const Branch = await getBranchModel();
  const base = slugifyBranchName(name);
  let slug = base;
  let counter = 2;

  while (true) {
    const query = { slug };
    if (excludeBranchId) {
      query._id = { $ne: excludeBranchId };
    }

    const existing = await Branch.findOne(query).select("_id").lean();
    if (!existing) return slug;

    slug = `${base}-${counter}`;
    counter += 1;
  }
}

export async function ensureAllBranchSlugs() {
  const Branch = await getBranchModel();
  const branches = await Branch.find({
    $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
  })
    .select("_id name")
    .lean();

  for (const branch of branches) {
    if (!branch.name) continue;
    const slug = await generateUniqueBranchSlug(branch.name, branch._id);
    await Branch.updateOne({ _id: branch._id }, { $set: { slug } });
  }
}

export function isMongoObjectId(value) {
  return (
    typeof value === "string" &&
    /^[a-f0-9]{24}$/i.test(value) &&
    mongoose.Types.ObjectId.isValid(value)
  );
}
