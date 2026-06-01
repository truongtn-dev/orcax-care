import mongoose from "mongoose";
import { Specialty } from "../models/Specialty.js";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";

export async function listSpecialties() {
  return Specialty.find({ isActive: true }).sort({ name: 1 }).lean();
}

export async function listDepartments() {
  return Department.find({ isActive: true }).sort({ name: 1 }).lean();
}

export async function searchDoctors({ name, specialtyId, departmentId, page = 1, limit = 12 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const skip = (pageNum - 1) * limitNum;

  const matchStage = { isActive: true };
  if (specialtyId && mongoose.Types.ObjectId.isValid(specialtyId)) {
    matchStage.specialtyId = new mongoose.Types.ObjectId(specialtyId);
  }
  if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
    matchStage.departmentId = new mongoose.Types.ObjectId(departmentId);
  }

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    { $match: { "user.isActive": true } },
  ];

  if (name?.trim()) {
    pipeline.push({
      $match: { "user.fullName": { $regex: name.trim(), $options: "i" } },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: "specialties",
        localField: "specialtyId",
        foreignField: "_id",
        as: "specialty",
      },
    },
    { $unwind: "$specialty" },
    {
      $lookup: {
        from: "departments",
        localField: "departmentId",
        foreignField: "_id",
        as: "department",
      },
    },
    { $unwind: "$department" },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: limitNum },
          {
            $project: {
              _id: 1,
              bio: 1,
              photoUrl: 1,
              licenseNo: 1,
              fullName: "$user.fullName",
              email: "$user.email",
              phone: "$user.phone",
              specialty: { _id: "$specialty._id", name: "$specialty.name", code: "$specialty.code" },
              department: { _id: "$department._id", name: "$department.name" },
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    }
  );

  const [result] = await Doctor.aggregate(pipeline);
  const total = result?.total?.[0]?.count || 0;

  return {
    items: result?.items || [],
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
}
