import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Patient } from "../models/Patient.js";
import { EmailVerificationToken } from "../models/EmailVerificationToken.js";
import { PasswordResetToken } from "../models/PasswordResetToken.js";
import { generateToken, validateEmail, validatePasswordStrength } from "../utils/validation.js";
import * as MailService from "./mail.service.js";

const JWT_SECRET = process.env.JWT_SECRET || "orcaxcare-dev-secret-change-me";
const RESEND_COOLDOWN_MS = 60 * 1000;

function issueJwt(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

export async function login(email, password) {
  const emailError = validateEmail(email);
  if (emailError) return { status: 400, body: { message: emailError } };
  if (!password) return { status: 400, body: { message: "Password is required" } };

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.isActive) {
    return { status: 401, body: { message: "Invalid email or password" } };
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return { status: 401, body: { message: "Invalid email or password" } };
  }

  if (user.role === "patient" && !user.isEmailVerified) {
    return { status: 403, body: { message: "Please verify your email before logging in" } };
  }

  user.lastLoginAt = new Date();
  await user.save();

  return {
    status: 200,
    body: {
      accessToken: issueJwt(user),
      tokenType: "Bearer",
      role: user.role,
      fullName: user.fullName,
    },
  };
}

export async function registerPatient({ email, password, fullName, phone }) {
  const emailError = validateEmail(email);
  if (emailError) return { status: 400, body: { message: emailError } };
  const pwdError = validatePasswordStrength(password);
  if (pwdError) return { status: 400, body: { message: pwdError } };
  if (!fullName?.trim()) return { status: 400, body: { message: "Full name is required" } };

  const normalizedEmail = email.toLowerCase().trim();
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) return { status: 409, body: { message: "Email already registered" } };

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    role: "patient",
    fullName: fullName.trim(),
    phone: phone?.trim() || "",
    isActive: true,
    isEmailVerified: false,
  });

  await Patient.create({ userId: user._id });

  const token = generateToken();
  await EmailVerificationToken.create({
    userId: user._id,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  user.lastVerificationSentAt = new Date();
  await user.save();
  await MailService.sendVerificationEmail(user, token);

  return {
    status: 201,
    body: { message: "Account created. Please check your email to activate your account." },
  };
}

export async function requestReset(email) {
  const normalizedEmail = email?.toLowerCase()?.trim();
  if (!normalizedEmail) return { status: 400, body: { message: "Email is required" } };

  const user = await User.findOne({ email: normalizedEmail, isActive: true });
  if (user) {
    const token = generateToken();
    await PasswordResetToken.create({
      userId: user._id,
      token,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    await MailService.sendResetPasswordEmail(user, token);
  }

  return {
    status: 200,
    body: { message: "If the email exists, a password reset link was sent." },
  };
}

export async function resetPassword(token, newPassword) {
  if (!token) return { status: 400, body: { message: "Token is required" } };
  const pwdError = validatePasswordStrength(newPassword);
  if (pwdError) return { status: 400, body: { message: pwdError } };

  const doc = await PasswordResetToken.findOne({
    token,
    expiresAt: { $gt: new Date() },
    usedAt: null,
  });
  if (!doc) return { status: 400, body: { message: "Invalid or expired reset link" } };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await User.updateOne(
    { _id: doc.userId },
    { $set: { passwordHash, passwordChangedAt: new Date() } }
  );
  doc.usedAt = new Date();
  await doc.save();

  return { status: 200, body: { message: "Password updated successfully. You can log in now." } };
}

export async function verifyEmail(token) {
  if (!token) return { status: 400, body: { message: "Token is required" } };

  const doc = await EmailVerificationToken.findOne({
    token,
    expiresAt: { $gt: new Date() },
    usedAt: null,
  });
  if (!doc) return { status: 400, body: { message: "Invalid or expired verification link" } };

  await User.updateOne({ _id: doc.userId }, { $set: { isEmailVerified: true } });
  doc.usedAt = new Date();
  await doc.save();

  return { status: 200, body: { message: "Email verified successfully. You can log in now." } };
}

export async function resendVerification(email) {
  const normalizedEmail = email?.toLowerCase()?.trim();
  if (!normalizedEmail) return { status: 400, body: { message: "Email is required" } };

  const user = await User.findOne({ email: normalizedEmail, isEmailVerified: false, isActive: true });
  if (user?.lastVerificationSentAt) {
    const elapsed = Date.now() - user.lastVerificationSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      return { status: 429, body: { message: "Please wait before requesting another verification email" } };
    }
  }

  if (user) {
    const token = generateToken();
    await EmailVerificationToken.create({
      userId: user._id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    user.lastVerificationSentAt = new Date();
    await user.save();
    await MailService.sendVerificationEmail(user, token);
  }

  return {
    status: 200,
    body: { message: "If the account is eligible, a verification email was sent." },
  };
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const pwdError = validatePasswordStrength(newPassword);
  if (pwdError) return { status: 400, body: { message: pwdError } };
  if (!currentPassword) return { status: 400, body: { message: "Current password is required" } };

  const user = await User.findById(userId);
  if (!user) return { status: 404, body: { message: "User not found" } };

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) return { status: 401, body: { message: "Current password is incorrect" } };

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordChangedAt = new Date();
  await user.save();

  return { status: 200, body: { message: "Password changed successfully" } };
}

export { JWT_SECRET };
