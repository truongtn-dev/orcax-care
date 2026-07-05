import mongoose from "mongoose";
import { Branch } from "../models/Branch.js";
import { isMongoObjectId } from "../utils/branchSlug.js";

function serializeBranch(branch) {
  return {
    _id: branch._id.toString(),
    slug: branch.slug || "",
    name: branch.name,
    address: branch.address || "",
    phone: branch.phone || "",
    workingHours: branch.workingHours || "",
    lat: branch.lat,
    lng: branch.lng,
  };
}

export async function listActiveBranches() {
  const items = await Branch.find({ isActive: true }).sort({ name: 1 }).lean();
  return {
    status: 200,
    body: { items: items.map(serializeBranch) },
  };
}

export async function getBranchByIdentifier(identifier) {
  const key = String(identifier || "").trim();
  if (!key) {
    return { status: 400, body: { message: "Invalid branch identifier." } };
  }

  let branch = null;
  if (isMongoObjectId(key)) {
    branch = await Branch.findOne({ _id: key, isActive: true }).lean();
  }
  if (!branch) {
    branch = await Branch.findOne({ slug: key.toLowerCase(), isActive: true }).lean();
  }
  if (!branch) {
    return { status: 404, body: { message: "Branch not found." } };
  }

  return {
    status: 200,
    body: { branch: serializeBranch(branch) },
  };
}

// Backward-compatible alias
export async function getBranchById(id) {
  return getBranchByIdentifier(id);
}
