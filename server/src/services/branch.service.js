import mongoose from "mongoose";
import { Branch } from "../models/Branch.js";

function serializeBranch(branch) {
  return {
    _id: branch._id.toString(),
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

export async function getBranchById(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, body: { message: "Invalid branch id." } };
  }

  const branch = await Branch.findOne({ _id: id, isActive: true }).lean();
  if (!branch) {
    return { status: 404, body: { message: "Branch not found." } };
  }

  return {
    status: 200,
    body: { branch: serializeBranch(branch) },
  };
}
