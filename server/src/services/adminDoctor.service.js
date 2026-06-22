import mongoose from "mongoose";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";
import { Specialty } from "../models/Specialty.js";
import { User } from "../models/User.js";
import { WorkShift } from "../models/WorkShift.js";
import { Appointment } from "../models/Appointment.js";
import { invalidateSearchCache } from "./doctorSearch.service.js";
import {
  normalizeEmail,
  validatePhoneOptional,
  validateRequired,
} from "../utils/validation.js";
import { isMongoObjectId } from "../utils/doctorSlug.js";
import { parseConsultationFeeInput, resolveConsultationFee } from "../utils/consultationFee.js";

function mapDoctor(doctor) {
  const user = doctor.userId || {};
  const specialty = doctor.specialtyId || {};
  const department = doctor.departmentId || {};

  return {
    _id: doctor._id.toString(),
    userId: user._id?.toString() || "",
    userSlug: user.slug || "",
    email: user.email || "",
    fullName: user.fullName || "",
    phone: user.phone || "",
    accountIsActive: Boolean(user.isActive),
    specialtyId: specialty._id?.toString() || "",
    specialtyName: specialty.name || "",
    departmentId: department._id?.toString() || "",
    departmentName: department.name || "",
    specialty: specialty._id
      ? { _id: specialty._id.toString(), name: specialty.name || "", code: specialty.code || "" }
      : null,
    department: department._id ? { _id: department._id.toString(), name: department.name || "" } : null,
    licenseNo: doctor.licenseNo,
    consultationFee: resolveConsultationFee(doctor),
    bio: doctor.bio || "",
    photoUrl: doctor.photoUrl || "",
    slug: doctor.slug || "",
    isActive: doctor.isActive,
    createdAt: doctor.createdAt.toISOString(),
    updatedAt: doctor.updatedAt.toISOString(),
  };
}

function doctorPopulate(query) {
  return query
    .populate("userId", "email fullName phone isActive slug")
    .populate("specialtyId", "name code")
    .populate("departmentId", "name");
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function resolveDoctorQuery(identifier) {
  if (!identifier) return null;
  const key = String(identifier).trim();
  if (isValidObjectId(key) && isMongoObjectId(key)) {
    return doctorPopulate(Doctor.findById(key));
  }
  return doctorPopulate(Doctor.findOne({ slug: key.toLowerCase() }));
}

function isTrue(value) {
  return value === true || value === "true";
}

async function requireReference(Model, id, label) {
  if (!isValidObjectId(id)) {
    return { error: { status: 400, body: { message: `Invalid ${label.toLowerCase()}` } } };
  }
  const record = await Model.findById(id).lean();
  if (!record) {
    return { error: { status: 404, body: { message: `${label} not found` } } };
  }
  return { record };
}

export async function queryFilteredDoctors({
  q = "",
  name = "",
  specialtyId = "",
  departmentId = "",
  activeOnly = false,
  isActive = "",
} = {}) {
  const filter = {};
  const activeFilter = String(isActive || "").trim().toLowerCase();
  if (activeFilter && activeFilter !== "all") {
    filter.isActive = activeFilter === "true";
  } else if (isTrue(activeOnly)) {
    filter.isActive = true;
  }
  if (specialtyId && isValidObjectId(specialtyId)) filter.specialtyId = specialtyId;
  if (departmentId && isValidObjectId(departmentId)) filter.departmentId = departmentId;

  let doctors = await doctorPopulate(Doctor.find(filter).sort({ createdAt: 1 })).lean();

  const text = String(q || name || "").trim().toLowerCase();
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

  return doctors
    .sort((a, b) => (a.userId?.fullName || "").localeCompare(b.userId?.fullName || ""))
    .map(mapDoctor);
}

export async function listDoctors({
  q = "",
  name = "",
  specialtyId = "",
  departmentId = "",
  activeOnly = false,
  isActive = "",
  page = 1,
  limit = 20,
} = {}) {
  const doctors = await queryFilteredDoctors({ q, name, specialtyId, departmentId, activeOnly, isActive });

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const total = doctors.length;
  const skip = (pageNum - 1) * limitNum;

  return {
    status: 200,
    body: {
      items: doctors.slice(skip, skip + limitNum),
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

export async function getDoctor(identifier) {
  const query = resolveDoctorQuery(identifier);
  if (!query) return { status: 404, body: { message: "Doctor not found" } };

  const doctor = await query.lean();
  if (!doctor) return { status: 404, body: { message: "Doctor not found" } };

  return buildDoctorDetailResponse(doctor);
}

async function buildDoctorDetailResponse(doctor) {
  const [workShiftCount, upcomingAppointments] = await Promise.all([
    WorkShift.countDocuments({ doctorId: doctor._id }),
    Appointment.countDocuments({ doctorId: doctor._id, status: "confirmed" }),
  ]);

  return {
    status: 200,
    body: {
      ...mapDoctor(doctor),
      slug: doctor.slug || "",
      scheduleSummary: {
        workShiftCount,
        upcomingAppointments,
        note: "Weekly work-shift templates and confirmed visits are summarized here.",
      },
    },
  };
}

function refId(value) {
  if (!value) return null;
  return value._id ?? value;
}

export async function updateDoctor(identifier, dto) {
  const query = resolveDoctorQuery(identifier);
  if (!query) return { status: 404, body: { message: "Doctor not found" } };

  const doctor = await query;
  if (!doctor) return { status: 404, body: { message: "Doctor not found" } };

  const user = await User.findById(refId(doctor.userId));
  if (!user) return { status: 404, body: { message: "Doctor account not found" } };

  const email = normalizeEmail(dto.email || user.email);
  const fullName = String(dto.fullName || "").trim();
  const phone = String(dto.phone || "").trim();
  const licenseNo = String(dto.licenseNo || "").trim();
  const specialtyId = String(dto.specialtyId || "").trim();
  const departmentId = String(dto.departmentId || "").trim();

  const emailError = validateRequired(email, "Email");
  if (emailError) return { status: 400, body: { message: emailError } };
  const fullNameError = validateRequired(fullName, "Full name");
  if (fullNameError) return { status: 400, body: { message: fullNameError } };
  const phoneError = validatePhoneOptional(phone);
  if (phoneError) return { status: 400, body: { message: phoneError } };
  const licenseError = validateRequired(licenseNo, "License number");
  if (licenseError) return { status: 400, body: { message: licenseError } };

  const duplicateEmail = await User.findOne({ email, _id: { $ne: user._id } }).lean();
  if (duplicateEmail) return { status: 409, body: { message: "Email already in use" } };

  const duplicateLicense = await Doctor.findOne({ licenseNo, _id: { $ne: doctor._id } }).lean();
  if (duplicateLicense) return { status: 409, body: { message: "License number already in use" } };

  const specialtyCheck = await requireReference(Specialty, specialtyId, "Specialty");
  if (specialtyCheck.error) return specialtyCheck.error;
  const departmentCheck = await requireReference(Department, departmentId, "Department");
  if (departmentCheck.error) return departmentCheck.error;

  const specialtyChanged = String(refId(doctor.specialtyId)) !== specialtyId;
  const departmentChanged = String(refId(doctor.departmentId)) !== departmentId;

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

  if (dto.consultationFee !== undefined) {
    const feeResult = parseConsultationFeeInput(dto.consultationFee);
    if (feeResult.error) return { status: 400, body: { message: feeResult.error } };
    doctor.consultationFee = feeResult.value;
  }

  await Promise.all([user.save(), doctor.save()]);
  if (specialtyChanged || departmentChanged || typeof dto.isActive === "boolean" || typeof dto.accountIsActive === "boolean") {
    invalidateSearchCache();
  }

  return getDoctor(doctor._id);
}
