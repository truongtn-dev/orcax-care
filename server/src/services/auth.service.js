import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Patient } from "../models/Patient.js";
import { EmailVerificationToken } from "../models/EmailVerificationToken.js";
import { PasswordResetToken } from "../models/PasswordResetToken.js";
import { generateToken, validateEmail, validatePasswordStrength } from "../utils/validation.js";
import * as MailService from "./mail.service.js";
import {
  issueAuthToken,
  revokeAllUserTokens,
  revokeAuthToken,
  REMEMBER_ME_MS,
  SESSION_MS,
} from "./token.service.js";

const RESEND_COOLDOWN_MS = 60 * 1000;

function formatExpiresIn(ms) {
  if (ms >= 24 * 60 * 60 * 1000) return `${Math.round(ms / (24 * 60 * 60 * 1000))}d`;
  return `${Math.round(ms / (60 * 60 * 1000))}h`;
}

export async function login(email, password, rememberMe = false) {
  const emailError = validateEmail(email);
  if (emailError) return { status: 400, body: { message: emailError } };
  if (!password) return { status: 400, body: { message: "Password is required" } };

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return { status: 401, body: { message: "Incorrect email or password" } };
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return { status: 401, body: { message: "Incorrect email or password" } };
  }

  if (user.isLocked) {
    return {
      status: 403,
      body: { message: "Account is locked. Please contact support.", code: "ACCOUNT_LOCKED" },
    };
  }

  if (user.role === "patient" && (!user.isActive || !user.isEmailVerified)) {
    return {
      status: 403,
      body: { message: "Please verify your email before signing in", code: "EMAIL_NOT_VERIFIED" },
    };
  }

  if (!user.isActive) {
    return {
      status: 403,
      body: { message: "Account is not activated. Please contact support.", code: "ACCOUNT_INACTIVE" },
    };
  }

  user.lastLoginAt = new Date();
  await user.save();

  const session = await issueAuthToken(user._id, rememberMe);

  return {
    status: 200,
    body: {
      accessToken: session.plainToken,
      tokenType: session.tokenType,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
      expiresIn: formatExpiresIn(session.expiresInMs),
    },
  };
}

export async function logout(accessToken) {
  await revokeAuthToken(accessToken);
  return { status: 200, body: { message: "Signed out successfully" } };
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
    isActive: false,
    isEmailVerified: false,
    isLocked: false,
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

  const user = await User.findOne({ email: normalizedEmail, isLocked: false });
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
    body: { message: "If the email exists, a password reset link has been sent." },
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
  if (!doc) return { status: 400, body: { message: "Password reset link is invalid or has expired" } };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await User.updateOne(
    { _id: doc.userId },
    { $set: { passwordHash, passwordChangedAt: new Date() } }
  );
  await revokeAllUserTokens(doc.userId);
  doc.usedAt = new Date();
  await doc.save();

  return { status: 200, body: { message: "Password updated. You can sign in now." } };
}

export async function verifyEmail(token) {
  if (!token) return { status: 400, body: { message: "Token is required" } };

  const doc = await EmailVerificationToken.findOne({ token });
  if (!doc) {
    return { status: 400, body: { message: "Verification link is invalid or has expired" } };
  }

  const user = await User.findById(doc.userId);
  if (!user) {
    return { status: 400, body: { message: "Verification link is invalid or has expired" } };
  }

  if (doc.usedAt || user.isEmailVerified) {
    if (user.isEmailVerified && user.isActive) {
      return { status: 200, body: { message: "Email already verified. You can sign in now." } };
    }
    return { status: 400, body: { message: "Verification link is invalid or has expired" } };
  }

  if (doc.expiresAt <= new Date()) {
    return { status: 400, body: { message: "Verification link is invalid or has expired" } };
  }

  user.isEmailVerified = true;
  user.isActive = true;
  await user.save();

  doc.usedAt = new Date();
  await doc.save();

  return { status: 200, body: { message: "Email verified successfully. You can sign in now." } };
}

export async function resendVerification(email) {
  const normalizedEmail = email?.toLowerCase()?.trim();
  if (!normalizedEmail) return { status: 400, body: { message: "Email is required" } };

  const user = await User.findOne({
    email: normalizedEmail,
    isEmailVerified: false,
    isLocked: false,
  });

  if (user?.lastVerificationSentAt) {
    const elapsed = Date.now() - user.lastVerificationSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        status: 429,
        body: {
          message: "Please wait before requesting another verification email",
          retryAfterSec,
        },
      };
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
    body: { message: "If the account is eligible, a verification email has been sent." },
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

  const sameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
  if (sameAsCurrent) {
    return { status: 400, body: { message: "New password must differ from the current password" } };
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordChangedAt = new Date();
  await user.save();
  await revokeAllUserTokens(userId);

  return { status: 200, body: { message: "Password changed successfully. Please sign in again." } };
}

export async function getMe(userId) {
  const user = await User.findById(userId).select("email role fullName isActive isLocked isEmailVerified");
  if (!user || !user.isActive || user.isLocked) {
    return { status: 403, body: { message: "Invalid session or account unavailable" } };
  }
  if (user.role === "patient" && !user.isEmailVerified) {
    return { status: 403, body: { message: "Email verification required" } };
  }
  return {
    status: 200,
    body: {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
  };
}

export { SESSION_MS, REMEMBER_ME_MS };
