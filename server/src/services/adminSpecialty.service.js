import mongoose from "mongoose";
import { Specialty } from "../models/Specialty.js";
import { Doctor } from "../models/Doctor.js";
import { invalidateSearchCache } from "./doctorSearch.service.js";

function serializeSpecialty(specialty, doctorCount = 0) {
  return {
    _id: specialty._id.toString(),
    code: specialty.code,
    name: specialty.name,
    description: specialty.description || "",
    isActive: specialty.isActive,
    doctorCount,
    createdAt: specialty.createdAt,
    updatedAt: specialty.updatedAt,
  };
}

export async function listSpecialties({ q, isActive, page = 1, limit = 20 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const filter = {};

  if (isActive === "true") filter.isActive = true;
  if (isActive === "false") filter.isActive = false;

  const search = (q || "").trim();
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ code: regex }, { name: regex }, { description: regex }];
  }

  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Specialty.find(filter).sort({ name: 1 }).skip(skip).limit(limitNum).lean(),
    Specialty.countDocuments(filter),
  ]);

  const specialtyIds = items.map((item) => item._id);
  const doctorCounts = specialtyIds.length
    ? await Doctor.aggregate([
        { $match: { specialtyId: { $in: specialtyIds } } },
        { $group: { _id: "$specialtyId", count: { $sum: 1 } } },
      ])
    : [];

  const countMap = Object.fromEntries(doctorCounts.map((row) => [row._id.toString(), row.count]));

  return {
    items: items.map((specialty) =>
      serializeSpecialty(specialty, countMap[specialty._id.toString()] || 0)
    ),
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
}

export async function createSpecialty({ code, name, description, isActive }) {
  const codeVal = code?.trim().toUpperCase();
  if (!codeVal) return { status: 400, body: { message: "Code is required" } };
  if (!/^[A-Z0-9_-]{2,12}$/.test(codeVal)) {
    return {
      status: 400,
      body: { message: "Code must be 2–12 characters (letters, numbers, hyphen, underscore)" },
    };
  }

  const nameVal = name?.trim();
  if (!nameVal) return { status: 400, body: { message: "Name is required" } };
  if (nameVal.length > 100) {
    return { status: 400, body: { message: "Name must be at most 100 characters" } };
  }

  const descVal = description?.trim() || "";
  if (descVal.length > 500) {
    return { status: 400, body: { message: "Description must be at most 500 characters" } };
  }

  const [codeExists, nameExists] = await Promise.all([
    Specialty.findOne({ code: codeVal }),
    Specialty.findOne({ name: nameVal }),
  ]);

  if (codeExists) return { status: 409, body: { message: "Specialty code already exists" } };
  if (nameExists) return { status: 409, body: { message: "Specialty name already exists" } };

  const specialty = await Specialty.create({
    code: codeVal,
    name: nameVal,
    description: descVal,
    isActive: isActive !== false && isActive !== "false",
  });

  invalidateSearchCache();

  return {
    status: 201,
    body: {
      message: "Specialty created successfully",
      specialty: serializeSpecialty(specialty.toObject(), 0),
    },
  };
}

export async function deleteSpecialty(specialtyId) {
  if (!specialtyId || !mongoose.Types.ObjectId.isValid(specialtyId)) {
    return { status: 400, body: { message: "Invalid specialty id" } };
  }

  const specialty = await Specialty.findById(specialtyId);
  if (!specialty) return { status: 404, body: { message: "Specialty not found" } };

  const doctorCount = await Doctor.countDocuments({ specialtyId: specialty._id });
  if (doctorCount > 0) {
    return {
      status: 409,
      body: {
        message: `Cannot delete specialty. It is assigned to ${doctorCount} doctor(s).`,
        code: "SPECIALTY_IN_USE",
        doctorCount,
      },
    };
  }

  if (!specialty.isActive) {
    return {
      status: 200,
      body: {
        message: "Specialty is already inactive",
        specialty: serializeSpecialty(specialty.toObject(), 0),
      },
    };
  }

  specialty.isActive = false;
  await specialty.save();
  invalidateSearchCache();

  return {
    status: 200,
    body: {
      message: "Specialty deleted successfully",
      specialty: serializeSpecialty(specialty.toObject(), 0),
    },
  };
}

export async function getSpecialty(specialtyId) {
  if (!specialtyId || !mongoose.Types.ObjectId.isValid(specialtyId)) {
    return { status: 400, body: { message: "Invalid specialty id" } };
  }

  const specialty = await Specialty.findById(specialtyId).lean();
  if (!specialty) return { status: 404, body: { message: "Specialty not found" } };

  const [doctorCount, activeDoctorCount] = await Promise.all([
    Doctor.countDocuments({ specialtyId: specialty._id }),
    Doctor.countDocuments({ specialtyId: specialty._id, isActive: true }),
  ]);

  return {
    status: 200,
    body: {
      ...serializeSpecialty(specialty, doctorCount),
      activeDoctorCount,
    },
  };
}
