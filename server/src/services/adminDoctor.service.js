import mongoose from "mongoose";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";
import { Specialty } from "../models/Specialty.js";
import { User } from "../models/User.js";
import { invalidateSearchCache } from "./doctorSearch.service.js";
import {
  normalizeEmail,
  validatePhoneOptional,
  validateRequired,
} from "../utils/validation.js";

function mapDoctor(doctor) {
  const user = doctor.userId || {};
  const specialty = doctor.specialtyId || {};
  const department = doctor.departmentId || {};

  return {
    _id: doctor._id.toString(),
    userId: user._id?.toString() || "",
    email: user.email || "",
    fullName: user.fullName || "",
    phone: user.phone || "",
    accountIsActive: Boolean(user.isActive),
    specialtyId: specialty._id?.toString() || "",
    specialtyName: specialty.name || "",
    departmentId: department._id?.toString() || "",
    departmentName: department.name || "",
    licenseNo: doctor.licenseNo,
    bio: doctor.bio || "",
    photoUrl: doctor.photoUrl || "",
    isActive: doctor.isActive,
    createdAt: doctor.createdAt.toISOString(),
    updatedAt: doctor.updatedAt.toISOString(),
  };
}

function doctorPopulate(query) {
  return query
    .populate("userId", "email fullName phone isActive")
    .populate("specialtyId", "name code")
    .populate("departmentId", "name");
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function isTrue(value) {
  return value === true || value === "true";
}

async function requireReference(Model, id, label) {
  if (!isValidObjectId(id)) {
    return { error: { status: 400, body: { message: `${label} không hợp lệ` } } };
  }
  const record = await Model.findById(id).lean();
  if (!record) {
    return { error: { status: 404, body: { message: `Không tìm thấy ${label.toLowerCase()}` } } };
  }
  return { record };
}

export async function listDoctors({
  q = "",
  specialtyId = "",
  departmentId = "",
  activeOnly = false,
  page = 1,
  limit = 20,
} = {}) {
  const filter = {};
  if (isTrue(activeOnly)) filter.isActive = true;
  if (specialtyId && isValidObjectId(specialtyId)) filter.specialtyId = specialtyId;
  if (departmentId && isValidObjectId(departmentId)) filter.departmentId = departmentId;

  let doctors = await doctorPopulate(Doctor.find(filter).sort({ createdAt: 1 })).lean();

  const text = String(q || "").trim().toLowerCase();
  if (text) {
    doctors = doctors.filter((doctor) => {
      const user = doctor.userId || {};
      const specialty = doctor.specialtyId || {};
      const department = doctor.departmentId || {};
      return [user.fullName, user.email, doctor.licenseNo, specialty.name, department.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(text));
    });
  }

  doctors = doctors.sort((a, b) => {
    const left = a.userId?.fullName || "";
    const right = b.userId?.fullName || "";
    return left.localeCompare(right);
  });

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const total = doctors.length;
  const skip = (pageNum - 1) * limitNum;

  return {
    status: 200,
    body: {
      items: doctors.slice(skip, skip + limitNum).map(mapDoctor),
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

export async function getDoctor(id) {
  if (!isValidObjectId(id)) {
    return { status: 404, body: { message: "Không tìm thấy bác sĩ" } };
  }

  const doctor = await doctorPopulate(Doctor.findById(id)).lean();
  if (!doctor) return { status: 404, body: { message: "Không tìm thấy bác sĩ" } };

  return { status: 200, body: mapDoctor(doctor) };
}

export async function updateDoctor(id, dto) {
  if (!isValidObjectId(id)) {
    return { status: 404, body: { message: "Không tìm thấy bác sĩ" } };
  }

  const doctor = await Doctor.findById(id);
  if (!doctor) return { status: 404, body: { message: "Không tìm thấy bác sĩ" } };

  const user = await User.findById(doctor.userId);
  if (!user) return { status: 404, body: { message: "Không tìm thấy tài khoản bác sĩ" } };

  const email = normalizeEmail(dto.email || user.email);
  const fullName = String(dto.fullName || "").trim();
  const phone = String(dto.phone || "").trim();
  const licenseNo = String(dto.licenseNo || "").trim();
  const specialtyId = String(dto.specialtyId || "").trim();
  const departmentId = String(dto.departmentId || "").trim();

  const emailError = validateRequired(email, "Email");
  if (emailError) return { status: 400, body: { message: emailError } };
  const fullNameError = validateRequired(fullName, "Họ và tên");
  if (fullNameError) return { status: 400, body: { message: fullNameError } };
  const phoneError = validatePhoneOptional(phone);
  if (phoneError) return { status: 400, body: { message: phoneError } };
  const licenseError = validateRequired(licenseNo, "Số giấy phép");
  if (licenseError) return { status: 400, body: { message: licenseError } };

  const duplicateEmail = await User.findOne({ email, _id: { $ne: user._id } }).lean();
  if (duplicateEmail) return { status: 409, body: { message: "Email đã được sử dụng" } };

  const duplicateLicense = await Doctor.findOne({ licenseNo, _id: { $ne: doctor._id } }).lean();
  if (duplicateLicense) return { status: 409, body: { message: "Số giấy phép đã được sử dụng" } };

  const specialtyCheck = await requireReference(Specialty, specialtyId, "Chuyên khoa");
  if (specialtyCheck.error) return specialtyCheck.error;
  const departmentCheck = await requireReference(Department, departmentId, "Khoa/phòng ban");
  if (departmentCheck.error) return departmentCheck.error;

  const specialtyChanged = doctor.specialtyId.toString() !== specialtyId;
  const departmentChanged = doctor.departmentId.toString() !== departmentId;

  user.email = email;
  user.fullName = fullName;
  user.phone = phone;
  if (typeof dto.accountIsActive === "boolean") user.isActive = dto.accountIsActive;

  doctor.specialtyId = specialtyId;
  doctor.departmentId = departmentId;
  doctor.licenseNo = licenseNo;
  doctor.bio = String(dto.bio || "").trim().slice(0, 1000);
  doctor.photoUrl = String(dto.photoUrl || "").trim();
  if (typeof dto.isActive === "boolean") doctor.isActive = dto.isActive;

  await Promise.all([user.save(), doctor.save()]);
  if (specialtyChanged || departmentChanged || typeof dto.isActive === "boolean" || typeof dto.accountIsActive === "boolean") {
    invalidateSearchCache();
  }

  return getDoctor(doctor._id);
}
