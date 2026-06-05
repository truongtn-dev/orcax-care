import mongoose from "mongoose";
import { Patient } from "../models/Patient.js";
import { User } from "../models/User.js";
import { validatePhoneOptional, validateRequired } from "../utils/validation.js";

const GENDERS = ["", "male", "female", "other"];
const PROFILE_GENDERS = ["male", "female", "other"];

function toPatientListItem(user, patient) {
  return {
    _id: user._id.toString(),
    userId: user._id.toString(),
    patientId: patient?._id?.toString() || "",
    fullName: user.fullName,
    email: user.email,
    phone: user.phone || "",
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    isLocked: user.isLocked,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    demographics: {
      dateOfBirth: patient?.dateOfBirth ? patient.dateOfBirth.toISOString().slice(0, 10) : "",
      gender: patient?.gender || "",
      address: patient?.address || "",
    },
  };
}

function toPatientDetail(user, patient) {
  return {
    _id: user._id.toString(),
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone || "",
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    isLocked: user.isLocked,
    lastLoginAt: user.lastLoginAt,
    passwordChangedAt: user.passwordChangedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: {
      dateOfBirth: patient?.dateOfBirth ? patient.dateOfBirth.toISOString().slice(0, 10) : "",
      gender: patient?.gender || "",
      address: patient?.address || "",
      emergencyContactName: patient?.emergencyContactName || "",
      emergencyContactPhone: patient?.emergencyContactPhone || "",
    },
  };
}

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

export async function listPatients(params = {}) {
  if ("isActive" in params) {
    return listPatientsByUserAccount(params);
  }
  return listPatientsByRecord(params);
}

async function listPatientsByUserAccount({ q, isActive, page = 1, limit = 20 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const filter = { role: "patient" };
  if (isActive === "true") filter.isActive = true;
  if (isActive === "false") filter.isActive = false;

  const search = (q || "").trim();
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
  }

  const skip = (pageNum - 1) * limitNum;
  const [users, total] = await Promise.all([
    User.find(filter)
      .select("fullName email phone isActive isEmailVerified isLocked createdAt lastLoginAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter),
  ]);

  const userIds = users.map((u) => u._id);
  const patients = userIds.length ? await Patient.find({ userId: { $in: userIds } }).lean() : [];
  const patientMap = new Map(patients.map((p) => [p.userId.toString(), p]));

  return {
    status: 200,
    body: {
      items: users.map((user) => toPatientListItem(user, patientMap.get(user._id.toString()))),
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

async function listPatientsByRecord({ q = "", activeOnly = false, page = 1, limit = 20 } = {}) {
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
  if (patient) {
    return { status: 200, body: mapPatient(patient) };
  }

  if (!id || !isValidObjectId(id)) {
    return { status: 400, body: { message: "Invalid patient id" } };
  }

  const user = await User.findById(id);
  if (!user) return { status: 404, body: { message: "Patient account not found" } };
  if (user.role !== "patient") {
    return { status: 400, body: { message: "This account is not a patient account" } };
  }

  let patientProfile = await Patient.findOne({ userId: user._id });
  if (!patientProfile) patientProfile = await Patient.create({ userId: user._id });

  return { status: 200, body: toPatientDetail(user, patientProfile) };
}

export async function updatePatient(id, dto) {
  const query = findPatient(id);
  const patient = query ? await query : null;

  if (!patient && isValidObjectId(id)) {
    const user = await User.findById(id);
    if (user && user.role === "patient") {
      return updatePatientByUserAccount(id, dto);
    }
  }

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

async function updatePatientByUserAccount(userId, payload) {
  const user = await User.findById(userId);
  if (!user) return { status: 404, body: { message: "Patient account not found" } };
  if (user.role !== "patient") {
    return { status: 400, body: { message: "This account is not a patient account" } };
  }

  let patient = await Patient.findOne({ userId: user._id });
  if (!patient) patient = await Patient.create({ userId: user._id });

  const gender = payload.gender?.trim() || "";
  if (gender && !PROFILE_GENDERS.includes(gender)) {
    return { status: 400, body: { message: "Invalid gender value" } };
  }

  if (payload.dateOfBirth) {
    const dob = new Date(payload.dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      return { status: 400, body: { message: "Invalid date of birth" } };
    }
    patient.dateOfBirth = dob;
  } else {
    patient.dateOfBirth = null;
  }

  const address = payload.address?.trim() || "";
  if (address.length > 300) {
    return { status: 400, body: { message: "Address must be at most 300 characters" } };
  }

  const emergencyContactName = payload.emergencyContactName?.trim() || "";
  if (emergencyContactName.length > 120) {
    return { status: 400, body: { message: "Emergency contact name must be at most 120 characters" } };
  }

  const emergencyContactPhone = payload.emergencyContactPhone?.trim() || "";
  if (emergencyContactPhone && !/^[\d\s+\-()]{8,20}$/.test(emergencyContactPhone)) {
    return { status: 400, body: { message: "Invalid emergency contact phone number" } };
  }

  patient.gender = gender;
  patient.address = address;
  patient.emergencyContactName = emergencyContactName;
  patient.emergencyContactPhone = emergencyContactPhone;
  await patient.save();

  return {
    status: 200,
    body: {
      message: "Patient details updated successfully.",
      patient: toPatientDetail(user, patient),
    },
  };
}
