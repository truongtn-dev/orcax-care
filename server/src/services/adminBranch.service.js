import mongoose from "mongoose";
import { Branch } from "../models/Branch.js";
import { User } from "../models/User.js";
import { generateUniqueBranchSlug } from "../utils/branchSlug.js";
import { listStaffOptions, syncBranchManager } from "./staffProfile.service.js";

function serializeManager(user) {
  if (!user) return null;
  return {
    _id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone || "",
  };
}

function serializeAdminBranch(branch, managerUser) {
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
    manager: serializeManager(managerUser),
    managerUserId: branch.managerUserId?.toString() || "",
    createdAt: branch.createdAt?.toISOString?.() || branch.createdAt,
    updatedAt: branch.updatedAt?.toISOString?.() || branch.updatedAt,
  };
}

function validateCoordinates(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
    return "Latitude must be between -90 and 90.";
  }
  if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
    return "Longitude must be between -180 and 180.";
  }
  return null;
}

async function populateManagers(branches) {
  const managerIds = [...new Set(branches.map((b) => b.managerUserId?.toString()).filter(Boolean))];
  const managers = managerIds.length
    ? await User.find({ _id: { $in: managerIds } }).select("fullName email phone").lean()
    : [];
  const managerMap = new Map(managers.map((user) => [user._id.toString(), user]));
  return branches.map((branch) =>
    serializeAdminBranch(branch, managerMap.get(branch.managerUserId?.toString() || ""))
  );
}

export async function listBranchesAdmin({ q, isActive, page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const filter = {};

  if (isActive === "true") filter.isActive = true;
  if (isActive === "false") filter.isActive = false;

  const search = (q || "").trim();
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: regex }, { address: regex }, { phone: regex }, { slug: regex }];
  }

  const skip = (pageNum - 1) * limitNum;
  const [items, total] = await Promise.all([
    Branch.find(filter).sort({ name: 1 }).skip(skip).limit(limitNum).lean(),
    Branch.countDocuments(filter),
  ]);

  return {
    status: 200,
    body: {
      items: await populateManagers(items),
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

export async function getBranchAdmin(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, body: { message: "Invalid branch id." } };
  }

  const branch = await Branch.findById(id).lean();
  if (!branch) return { status: 404, body: { message: "Branch not found." } };

  const managerUser = branch.managerUserId
    ? await User.findById(branch.managerUserId).select("fullName email phone").lean()
    : null;

  return {
    status: 200,
    body: { branch: serializeAdminBranch(branch, managerUser) },
  };
}

export async function createBranchAdmin(payload) {
  const name = String(payload.name || "").trim();
  if (!name) return { status: 400, body: { message: "Branch name is required." } };

  const coordError = validateCoordinates(payload.lat, payload.lng);
  if (coordError) return { status: 400, body: { message: coordError } };

  const slug = payload.slug?.trim()
    ? await generateUniqueBranchSlug(payload.slug, null)
    : await generateUniqueBranchSlug(name, null);

  const branch = await Branch.create({
    name,
    slug,
    address: String(payload.address || "").trim(),
    phone: String(payload.phone || "").trim(),
    workingHours: String(payload.workingHours || "Mon–Fri 8:00–17:00").trim(),
    lat: Number(payload.lat),
    lng: Number(payload.lng),
    isActive: payload.isActive !== false,
  });

  if (payload.managerUserId) {
    const sync = await syncBranchManager(branch._id, payload.managerUserId);
    if (!sync.ok) {
      await Branch.deleteOne({ _id: branch._id });
      return { status: 400, body: { message: sync.message } };
    }
  }

  return getBranchAdmin(branch._id);
}

export async function updateBranchAdmin(id, payload) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, body: { message: "Invalid branch id." } };
  }

  const branch = await Branch.findById(id);
  if (!branch) return { status: 404, body: { message: "Branch not found." } };

  if ("name" in payload) {
    const name = String(payload.name || "").trim();
    if (!name) return { status: 400, body: { message: "Branch name is required." } };
    branch.name = name;
  }

  if ("address" in payload) branch.address = String(payload.address || "").trim();
  if ("phone" in payload) branch.phone = String(payload.phone || "").trim();
  if ("workingHours" in payload) branch.workingHours = String(payload.workingHours || "").trim();

  if ("lat" in payload || "lng" in payload) {
    const coordError = validateCoordinates(
      "lat" in payload ? payload.lat : branch.lat,
      "lng" in payload ? payload.lng : branch.lng
    );
    if (coordError) return { status: 400, body: { message: coordError } };
    if ("lat" in payload) branch.lat = Number(payload.lat);
    if ("lng" in payload) branch.lng = Number(payload.lng);
  }

  if ("isActive" in payload) branch.isActive = Boolean(payload.isActive);

  if ("managerUserId" in payload) {
    const sync = await syncBranchManager(branch._id, payload.managerUserId || null);
    if (!sync.ok) return { status: 400, body: { message: sync.message } };
    branch.managerUserId = payload.managerUserId || null;
  }

  await branch.save();
  return getBranchAdmin(branch._id);
}

export async function listBranchStaffOptions() {
  const items = await listStaffOptions();
  return { status: 200, body: { items } };
}

export { listStaffOptions };
