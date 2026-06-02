import mongoose from "mongoose";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";
import { Specialty } from "../models/Specialty.js";
import { invalidateSearchCache } from "./doctorSearch.service.js";
import { validatePhoneOptional, validateRequired } from "../utils/validation.js";

function mapSpecialty(specialty) {
  return {
    _id: specialty._id.toString(),
    code: specialty.code,
    name: specialty.name,
    description: specialty.description || "",
    isActive: specialty.isActive,
    createdAt: specialty.createdAt.toISOString(),
    updatedAt: specialty.updatedAt.toISOString(),
  };
}

function mapDepartment(department) {
  return {
    _id: department._id.toString(),
    name: department.name,
    location: department.location || "",
    phone: department.phone || "",
    isActive: department.isActive,
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString(),
  };
}

export async function listSpecialties({ activeOnly = true } = {}) {
  const filter = activeOnly ? { isActive: true } : {};
  const specialties = await Specialty.find(filter).sort({ name: 1 }).lean();
  return {
    status: 200,
    body: { items: specialties.map(mapSpecialty) },
  };
}

export async function createDepartment(dto) {
  const name = String(dto.name || "").trim();
  const location = String(dto.location || "").trim();
  const phone = String(dto.phone || "").trim();

  const nameError = validateRequired(name, "Tên khoa/phòng ban");
  if (nameError) return { status: 400, body: { message: nameError } };
  const locationError = validateRequired(location, "Vị trí");
  if (locationError) return { status: 400, body: { message: locationError } };
  const phoneRequiredError = validateRequired(phone, "Số điện thoại");
  if (phoneRequiredError) return { status: 400, body: { message: phoneRequiredError } };
  const phoneError = validatePhoneOptional(phone);
  if (phoneError) return { status: 400, body: { message: phoneError } };

  const duplicate = await Department.findOne({ name }).lean();
  if (duplicate) return { status: 409, body: { message: "Khoa/phòng ban đã tồn tại" } };

  const department = await Department.create({
    name,
    location,
    phone,
    isActive: typeof dto.isActive === "boolean" ? dto.isActive : true,
  });
  invalidateSearchCache();

  return { status: 201, body: mapDepartment(department) };
}

export async function getDepartmentDetail(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: 404, body: { message: "Không tìm thấy khoa/phòng ban" } };
  }

  const department = await Department.findById(id);
  if (!department) return { status: 404, body: { message: "Không tìm thấy khoa/phòng ban" } };

  const doctors = await Doctor.find({ departmentId: department._id })
    .populate("userId", "fullName isActive")
    .populate("specialtyId", "name")
    .sort({ createdAt: 1 })
    .lean();

  const mappedDoctors = doctors
    .map((doctor) => {
      const doctorActive = Boolean(doctor.isActive && doctor.userId?.isActive);
      return {
        _id: doctor._id.toString(),
        fullName: doctor.userId?.fullName || "Chưa rõ bác sĩ",
        specialtyName: doctor.specialtyId?.name || "",
        isActive: doctorActive,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return {
    status: 200,
    body: {
      department: mapDepartment(department),
      summary: {
        activeDoctors: mappedDoctors.filter((doctor) => doctor.isActive).length,
        totalDoctors: mappedDoctors.length,
      },
      doctors: mappedDoctors,
    },
  };
}
