import mongoose from "mongoose";
import { Branch } from "../models/Branch.js";
import { User } from "../models/User.js";
import { getStaffProfile } from "./staffProfile.service.js";

function serializeStaffBranch(branch, { isBranchManager }) {
  return {
    _id: branch._id.toString(),
    slug: branch.slug || "",
    name: branch.name,
    address: branch.address || "",
    phone: branch.phone || "",
    workingHours: branch.workingHours || "",
    lat: branch.lat,
    lng: branch.lng,
    isActive: branch.isActive,
    isBranchManager,
  };
}

export async function getManagedBranch(userId) {
  const user = await User.findById(userId).select("role isActive fullName").lean();
  if (!user || user.role !== "staff" || !user.isActive) {
    return { status: 403, body: { message: "Staff access required." } };
  }

  const profile = await getStaffProfile(userId);
  if (!profile?.branchId) {
    return { status: 404, body: { message: "No branch has been assigned to your staff account." } };
  }

  const branch = await Branch.findOne({ _id: profile.branchId, isActive: true }).lean();
  if (!branch) {
    return { status: 404, body: { message: "Assigned branch is unavailable." } };
  }

  return {
    status: 200,
    body: {
      branch: serializeStaffBranch(branch, { isBranchManager: Boolean(profile.isBranchManager) }),
    },
  };
}

export async function updateManagedBranchOperations(userId, payload) {
  const user = await User.findById(userId).select("role isActive").lean();
  if (!user || user.role !== "staff" || !user.isActive) {
    return { status: 403, body: { message: "Staff access required." } };
  }

  const profile = await getStaffProfile(userId);
  if (!profile?.branchId || !profile.isBranchManager) {
    return { status: 403, body: { message: "Only the assigned branch manager can update clinic operations." } };
  }

  const branch = await Branch.findById(profile.branchId);
  if (!branch || !branch.isActive) {
    return { status: 404, body: { message: "Branch not found." } };
  }

  if ("phone" in payload) branch.phone = String(payload.phone || "").trim();
  if ("workingHours" in payload) branch.workingHours = String(payload.workingHours || "").trim();

  if (!("phone" in payload) && !("workingHours" in payload)) {
    return { status: 400, body: { message: "No updatable fields provided." } };
  }

  await branch.save();

  return {
    status: 200,
    body: {
      message: "Branch operations updated.",
      branch: serializeStaffBranch(branch.toObject(), { isBranchManager: true }),
    },
  };
}

export async function assertStaffBelongsToBranch(userId, branchId) {
  if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) return false;
  const profile = await getStaffProfile(userId);
  return profile?.branchId?.toString() === String(branchId);
}
