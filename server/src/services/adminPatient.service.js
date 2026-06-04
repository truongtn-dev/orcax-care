import mongoose from "mongoose";
import { Patient } from "../models/Patient.js";
import { User } from "../models/User.js";
import { validatePhoneOptional, validateRequired } from "../utils/validation.js";

const GENDERS = ["", "male", "female", "other"];

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function formatDate(date) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function mapPatient(patient) {
  const user = patient.userId || {};
  return {
    _id: patient._id.toString(),
    userId: user._id?.toString() || "",
    email: user.email || "",
    fullName: user.fullName || "",
    phone: user.phone || "",
    accountIsActive: Boolean(user.isActive),
    isEmailVerified: Boolean(user.isEmailVerified),
    isActive: patient.isActive,
    profile: {
      dateOfBirth: formatDate(patient.dateOfBirth),
      gender: patient.gender || "",
      address: patient.address || "",
      emergencyContactName: patient.emergencyContactName || "",
      emergencyContactPhone: patient.emergencyContactPhone || "",
      avatarUrl: patient.avatarUrl || "",
    },
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
  };
}

function populatePatient(query) {
  return query.populate("userId", "email fullName phone isActive isEmailVerified");
}

function findPatient(id) {
  if (!isValidObjectId(id)) return null;
  return populatePatient(Patient.findById(id));
}

export async function listPatients({ q = "", activeOnly = false, page = 1, limit = 20 } = {}) {
  const shouldFilterActive = activeOnly === true || activeOnly === "true";
  const patientFilter = {};
  if (shouldFilterActive) patientFilter.isActive = true;

  let patients = await populatePatient(Patient.find(patientFilter).sort({ createdAt: 1 })).lean();
  if (shouldFilterActive) {
    patients = patients.filter((patient) => patient.userId?.isActive === true);
  }

  const text = String(q || "").trim().toLowerCase();
  if (text) {
    patients = patients.filter((patient) => {
      const user = patient.userId || {};
      return [user.fullName, user.email, user.phone, patient.address, patient.emergencyContactName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(text));
    });
  }

  patients = patients.sort((a, b) => (a.userId?.fullName || "").localeCompare(b.userId?.fullName || ""));

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const total = patients.length;
  const skip = (pageNum - 1) * limitNum;

  return {
    status: 200,
    body: {
      items: patients.slice(skip, skip + limitNum).map(mapPatient),
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

export async function getPatient(id) {
  const query = findPatient(id);
  const patient = query ? await query.lean() : null;
  if (!patient) return { status: 404, body: { message: "Không tìm thấy hồ sơ bệnh nhân" } };
  return { status: 200, body: mapPatient(patient) };
}

export async function updatePatient(id, dto) {
  const query = findPatient(id);
  const patient = query ? await query : null;
  if (!patient) return { status: 404, body: { message: "Không tìm thấy hồ sơ bệnh nhân" } };

  const user = await User.findById(patient.userId._id);
  if (!user) return { status: 404, body: { message: "Không tìm thấy tài khoản bệnh nhân" } };

  const fullName = String(dto.fullName || "").trim();
  const fullNameError = validateRequired(fullName, "Họ và tên");
  if (fullNameError) return { status: 400, body: { message: fullNameError } };

  const phone = String(dto.phone || "").trim();
  const phoneError = validatePhoneOptional(phone);
  if (phoneError) return { status: 400, body: { message: phoneError } };

  const emergencyContactPhone = String(dto.emergencyContactPhone || "").trim();
  const emergencyPhoneError = validatePhoneOptional(emergencyContactPhone);
  if (emergencyPhoneError) return { status: 400, body: { message: emergencyPhoneError } };

  const gender = String(dto.gender || "").trim();
  if (!GENDERS.includes(gender)) {
    return { status: 400, body: { message: "Giới tính không hợp lệ" } };
  }

  if (dto.dateOfBirth) {
    const dob = new Date(dto.dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      return { status: 400, body: { message: "Ngày sinh không hợp lệ" } };
    }
    patient.dateOfBirth = dob;
  } else {
    patient.dateOfBirth = null;
  }

  user.fullName = fullName;
  user.phone = phone;
  if (typeof dto.accountIsActive === "boolean") user.isActive = dto.accountIsActive;

  patient.gender = gender;
  patient.address = String(dto.address || "").trim();
  patient.emergencyContactName = String(dto.emergencyContactName || "").trim();
  patient.emergencyContactPhone = emergencyContactPhone;
  patient.avatarUrl = String(dto.avatarUrl || "").trim();
  if (typeof dto.isActive === "boolean") patient.isActive = dto.isActive;

  await Promise.all([user.save(), patient.save()]);
  return getPatient(patient._id);
}
