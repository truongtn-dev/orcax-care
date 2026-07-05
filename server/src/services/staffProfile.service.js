import mongoose from "mongoose";
import { Branch } from "../models/Branch.js";
import { StaffProfile } from "../models/StaffProfile.js";
import { User } from "../models/User.js";

export async function ensureStaffProfile(userId) {
  let profile = await StaffProfile.findOne({ userId });
  if (!profile) {
    profile = await StaffProfile.create({ userId });
  }
  return profile;
}

export async function assignStaffToBranch(userId, branchId, { isBranchManager = false } = {}) {
  const user = await User.findById(userId).select("role isActive").lean();
  if (!user || user.role !== "staff" || !user.isActive) {
    return { ok: false, message: "Manager must be an active staff account." };
  }

  const profile = await ensureStaffProfile(userId);
  profile.branchId = branchId;
  profile.isBranchManager = Boolean(isBranchManager);
  await profile.save();
  return { ok: true, profile };
}

export async function clearBranchManager(branchId, userId = null) {
  const filter = { branchId, isBranchManager: true };
  if (userId) filter.userId = userId;
  await StaffProfile.updateMany(filter, { $set: { isBranchManager: false } });
}

export async function getStaffProfile(userId) {
  return StaffProfile.findOne({ userId }).lean();
}

export async function listStaffOptions() {
  const staffUsers = await User.find({ role: "staff", isActive: true })
    .select("fullName email phone")
    .sort({ fullName: 1 })
    .lean();

  const userIds = staffUsers.map((user) => user._id);
  const profiles = userIds.length
    ? await StaffProfile.find({ userId: { $in: userIds } }).lean()
    : [];
  const profileMap = new Map(profiles.map((profile) => [profile.userId.toString(), profile]));

  return staffUsers.map((user) => {
    const profile = profileMap.get(user._id.toString());
    return {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || "",
      branchId: profile?.branchId?.toString() || "",
      isBranchManager: Boolean(profile?.isBranchManager),
    };
  });
}

export async function syncBranchManager(branchId, managerUserId) {
  const branch = await Branch.findById(branchId);
  if (!branch) return { ok: false, message: "Branch not found." };

  await clearBranchManager(branchId);

  if (!managerUserId) {
    branch.managerUserId = null;
    await branch.save();
    return { ok: true };
  }

  if (!mongoose.Types.ObjectId.isValid(managerUserId)) {
    return { ok: false, message: "Invalid branch manager." };
  }

  const otherManaged = await StaffProfile.findOne({
    userId: managerUserId,
    isBranchManager: true,
    branchId: { $ne: branchId },
  }).lean();
  if (otherManaged) {
    return { ok: false, message: "This staff member already manages another branch." };
  }

  const assigned = await assignStaffToBranch(managerUserId, branchId, { isBranchManager: true });
  if (!assigned.ok) return assigned;

  branch.managerUserId = managerUserId;
  await branch.save();
  return { ok: true };
}
