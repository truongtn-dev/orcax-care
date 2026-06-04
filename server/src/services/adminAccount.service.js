import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { User } from "../models/User.js";
import {
  normalizeEmail,
  validateEmail,
  validatePhoneOptional,
  validateRequired,
} from "../utils/validation.js";

function mapAccount(user, { patientId = null, doctorId = null } = {}) {
  return {
    _id: user._id.toString(),
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

export async function getAccount(userId) {
  const user = await User.findById(userId);
  if (!user) return { status: 404, body: { message: "Không tìm thấy tài khoản" } };

  const linkedIds = await getLinkedProfileIds(user);
  return { status: 200, body: mapAccount(user, linkedIds) };
}

export async function updateAccount(userId, dto) {
  const user = await User.findById(userId);
  if (!user) return { status: 404, body: { message: "Không tìm thấy tài khoản" } };

  const nextEmail = normalizeEmail(dto.email ?? user.email);
  const emailError = validateEmail(nextEmail);
  if (emailError) return { status: 400, body: { message: emailError } };

  const nextFullName = String(dto.fullName ?? user.fullName).trim();
  const fullNameError = validateRequired(nextFullName, "Họ và tên");
  if (fullNameError) return { status: 400, body: { message: fullNameError } };

  const phone = String(dto.phone ?? "").trim();
  const phoneError = validatePhoneOptional(phone);
  if (phoneError) return { status: 400, body: { message: phoneError } };

  const duplicate = await User.findOne({ email: nextEmail, _id: { $ne: user._id } }).lean();
  if (duplicate) return { status: 409, body: { message: "Email đã được sử dụng" } };

  user.email = nextEmail;
  user.fullName = nextFullName;
  user.phone = phone;
  if (typeof dto.isActive === "boolean") user.isActive = dto.isActive;
  await user.save();

  const linkedIds = await getLinkedProfileIds(user);
  return { status: 200, body: mapAccount(user, linkedIds) };
}
