import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { User } from "../models/User.js";
import { Specialty } from "../models/Specialty.js";
import { Department } from "../models/Department.js";
import {
  normalizeEmail,
  validateEmail,
  validatePasswordStrength,
  validatePhoneOptional,
  validateRequired,
} from "../utils/validation.js";
import { invalidateSearchCache } from "./doctorSearch.service.js";
import { findUserByIdentifier } from "../utils/userSlug.js";
import { parseConsultationFeeInput, resolveConsultationFee } from "../utils/consultationFee.js";

function mapAccount(user, { patientId = null, doctorId = null } = {}) {
  return {
    _id: user._id.toString(),
    slug: user.slug || "",
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    phone: user.phone || "",
    isActive: user.isActive,
    isLocked: user.isLocked,
    isEmailVerified: user.isEmailVerified,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    patientId: patientId ? patientId.toString() : null,
    doctorId: doctorId ? doctorId.toString() : null,
  };
}

async function getLinkedProfileIds(user) {
  const [patient, doctor] = await Promise.all([
    Patient.findOne({ userId: user._id }).select("_id").lean(),
    Doctor.findOne({ userId: user._id }).select("_id").lean(),
  ]);

  return {
    patientId: patient?._id || null,
    doctorId: doctor?._id || null,
  };
}

export async function listAccounts({ q, role, isActive, page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const filter = {};
  const allowedRoles = ["patient", "doctor", "admin", "staff"];

  if (role && allowedRoles.includes(role)) {
    filter.role = role;
  }

  if (isActive === "true") filter.isActive = true;
  if (isActive === "false") filter.isActive = false;

  const search = (q || "").trim();
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ email: regex }, { fullName: regex }, { phone: regex }];
  }

  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("email role fullName phone slug isActive isEmailVerified isLocked lastLoginAt createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter),
  ]);

  const userIds = items.map((user) => user._id);
  let patientByUser = {};
  let doctorByUser = {};

  if (userIds.length > 0) {
    const [patients, doctors] = await Promise.all([
      Patient.find({ userId: { $in: userIds } }).select("userId").lean(),
      Doctor.find({ userId: { $in: userIds } }).select("userId slug").lean(),
    ]);
    patientByUser = Object.fromEntries(patients.map((p) => [p.userId.toString(), p._id]));
    doctorByUser = Object.fromEntries(
      doctors.map((d) => [d.userId.toString(), { _id: d._id, slug: d.slug || "" }]),
    );
  }

  return {
    items: items.map((user) => {
      const id = user._id.toString();
      const doctorLink = doctorByUser[id];
      return {
        _id: id,
        slug: user.slug || "",
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone || "",
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        isLocked: user.isLocked,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        patientId: patientByUser[id]?.toString() ?? null,
        patientSlug: user.slug || "",
        doctorId: doctorLink?._id?.toString() ?? null,
        doctorSlug: doctorLink?.slug || "",
      };
    }),
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
}

export async function createAccount(payload) {
  const {
    email,
    password,
    fullName,
    phone,
    role,
    specialtyId,
    departmentId,
    licenseNo,
    bio,
    consultationFee,
  } = payload;

  const emailError = validateEmail(email);
  if (emailError) return { status: 400, body: { message: emailError } };

  const pwdError = validatePasswordStrength(password);
  if (pwdError) return { status: 400, body: { message: pwdError } };

  if (!fullName?.trim()) return { status: 400, body: { message: "Full name is required" } };

  const allowedRoles = ["patient", "doctor", "admin", "staff"];
  if (!role || !allowedRoles.includes(role)) {
    return { status: 400, body: { message: "Invalid role" } };
  }

  const phoneVal = phone?.trim() || "";
  const phoneError = validatePhoneOptional(phoneVal);
  if (phoneError) return { status: 400, body: { message: phoneError } };

  const normalizedEmail = normalizeEmail(email);
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) return { status: 409, body: { message: "Email already registered" } };

  if (role === "doctor") {
    if (!specialtyId || !mongoose.Types.ObjectId.isValid(specialtyId)) {
      return { status: 400, body: { message: "Valid specialty is required for doctor accounts" } };
    }
    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return { status: 400, body: { message: "Valid department is required for doctor accounts" } };
    }
    if (!licenseNo?.trim()) {
      return { status: 400, body: { message: "License number is required for doctor accounts" } };
    }

    const [specialty, department, licenseExists] = await Promise.all([
      Specialty.findById(specialtyId),
      Department.findById(departmentId),
      Doctor.findOne({ licenseNo: licenseNo.trim() }),
    ]);

    if (!specialty) return { status: 400, body: { message: "Specialty not found" } };
    if (!department) return { status: 400, body: { message: "Department not found" } };
    if (licenseExists) return { status: 409, body: { message: "License number already in use" } };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    role,
    fullName: fullName.trim(),
    phone: phoneVal,
    isActive: true,
    isEmailVerified: true,
    isLocked: false,
  });

  if (role === "patient") {
    await Patient.create({ userId: user._id });
  }

  if (role === "doctor") {
    const feeResult = parseConsultationFeeInput(consultationFee);
    if (feeResult.error) return { status: 400, body: { message: feeResult.error } };

    await Doctor.create({
      userId: user._id,
      specialtyId,
      departmentId,
      licenseNo: licenseNo.trim(),
      bio: bio?.trim()?.slice(0, 1000) || "",
      consultationFee: feeResult.value,
      isActive: true,
    });
    invalidateSearchCache();
  }

  const linkedIds = await getLinkedProfileIds(user);
  return {
    status: 201,
    body: {
      message: "Account created successfully",
      account: mapAccount(user, linkedIds),
    },
  };
}

export async function getAccount(identifier) {
  const userRef = await findUserByIdentifier(identifier);
  if (!userRef) return { status: 404, body: { message: "Account not found" } };

  const user = await User.findById(userRef._id)
    .select(
      "email role fullName phone slug isActive isEmailVerified isLocked lastLoginAt passwordChangedAt lastVerificationSentAt createdAt updatedAt",
    )
    .lean();

  if (!user) return { status: 404, body: { message: "Account not found" } };

  const linkedIds = await getLinkedProfileIds(user);
  const account = {
    ...mapAccount(user, linkedIds),
    passwordChangedAt: user.passwordChangedAt,
    lastVerificationSentAt: user.lastVerificationSentAt,
    updatedAt: user.updatedAt?.toISOString?.() || user.updatedAt,
    profile: {},
    patientSlug: user.role === "patient" ? user.slug || "" : "",
    doctorSlug: "",
  };

  if (user.role === "patient") {
    const patient = await Patient.findOne({ userId: user._id }).lean();
    if (patient) {
      account.profile = {
        dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString().slice(0, 10) : "",
        gender: patient.gender || "",
        address: patient.address || "",
        emergencyContactName: patient.emergencyContactName || "",
        emergencyContactPhone: patient.emergencyContactPhone || "",
        avatarUrl: patient.avatarUrl || "",
        isActive: patient.isActive,
      };
    }
  }

  if (user.role === "doctor") {
    const doctor = await Doctor.findOne({ userId: user._id })
      .populate("specialtyId", "name code")
      .populate("departmentId", "name")
      .lean();

    if (doctor) {
      account.doctorSlug = doctor.slug || "";
      account.profile = {
        bio: doctor.bio || "",
        licenseNo: doctor.licenseNo,
        consultationFee: resolveConsultationFee(doctor),
        photoUrl: doctor.photoUrl || "",
        isActive: doctor.isActive,
        specialty: doctor.specialtyId
          ? {
              _id: doctor.specialtyId._id.toString(),
              name: doctor.specialtyId.name,
              code: doctor.specialtyId.code,
            }
          : null,
        department: doctor.departmentId
          ? { _id: doctor.departmentId._id.toString(), name: doctor.departmentId.name }
          : null,
      };
    }
  }

  return { status: 200, body: account };
}

export async function updateAccount(identifier, dto) {
  const userRef = await findUserByIdentifier(identifier);
  if (!userRef) return { status: 404, body: { message: "Account not found" } };

  const user = await User.findById(userRef._id);
  if (!user) return { status: 404, body: { message: "Account not found" } };

  const nextEmail = normalizeEmail(dto.email ?? user.email);
  const emailError = validateEmail(nextEmail);
  if (emailError) return { status: 400, body: { message: emailError } };

  const nextFullName = String(dto.fullName ?? user.fullName).trim();
  const fullNameError = validateRequired(nextFullName, "Full name");
  if (fullNameError) return { status: 400, body: { message: fullNameError } };

  const phone = String(dto.phone ?? "").trim();
  const phoneError = validatePhoneOptional(phone);
  if (phoneError) return { status: 400, body: { message: phoneError } };

  const duplicate = await User.findOne({ email: nextEmail, _id: { $ne: user._id } }).lean();
  if (duplicate) return { status: 409, body: { message: "Email already in use" } };

  user.email = nextEmail;
  user.fullName = nextFullName;
  user.phone = phone;
  if (typeof dto.isActive === "boolean") user.isActive = dto.isActive;
  await user.save();

  const linkedIds = await getLinkedProfileIds(user);
  return { status: 200, body: mapAccount(user, linkedIds) };
}
