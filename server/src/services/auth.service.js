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
  if (!password) return { status: 400, body: { message: "Mật khẩu là bắt buộc" } };

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return { status: 401, body: { message: "Email hoặc mật khẩu không đúng" } };
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return { status: 401, body: { message: "Email hoặc mật khẩu không đúng" } };
  }

  if (user.isLocked) {
    return {
      status: 403,
      body: { message: "Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.", code: "ACCOUNT_LOCKED" },
    };
  }

  if (user.role === "patient" && (!user.isActive || !user.isEmailVerified)) {
    return {
      status: 403,
      body: { message: "Vui lòng xác minh email trước khi đăng nhập", code: "EMAIL_NOT_VERIFIED" },
    };
  }

  if (!user.isActive) {
    return {
      status: 403,
      body: { message: "Tài khoản chưa kích hoạt. Vui lòng liên hệ hỗ trợ.", code: "ACCOUNT_INACTIVE" },
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
  return { status: 200, body: { message: "Đăng xuất thành công" } };
}

export async function registerPatient({ email, password, fullName, phone }) {
  const emailError = validateEmail(email);
  if (emailError) return { status: 400, body: { message: emailError } };
  const pwdError = validatePasswordStrength(password);
  if (pwdError) return { status: 400, body: { message: pwdError } };
  if (!fullName?.trim()) return { status: 400, body: { message: "Họ và tên là bắt buộc" } };

  const normalizedEmail = email.toLowerCase().trim();
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) return { status: 409, body: { message: "Email đã được đăng ký" } };

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
    body: { message: "Tài khoản đã được tạo. Vui lòng kiểm tra email để kích hoạt tài khoản." },
  };
}

export async function requestReset(email) {
  const normalizedEmail = email?.toLowerCase()?.trim();
  if (!normalizedEmail) return { status: 400, body: { message: "Email là bắt buộc" } };

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
    body: { message: "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi." },
  };
}

export async function resetPassword(token, newPassword) {
  if (!token) return { status: 400, body: { message: "Token là bắt buộc" } };
  const pwdError = validatePasswordStrength(newPassword);
  if (pwdError) return { status: 400, body: { message: pwdError } };

  const doc = await PasswordResetToken.findOne({
    token,
    expiresAt: { $gt: new Date() },
    usedAt: null,
  });
  if (!doc) return { status: 400, body: { message: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" } };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await User.updateOne(
    { _id: doc.userId },
    { $set: { passwordHash, passwordChangedAt: new Date() } }
  );
  await revokeAllUserTokens(doc.userId);
  doc.usedAt = new Date();
  await doc.save();

  return { status: 200, body: { message: "Mật khẩu đã được cập nhật. Bạn có thể đăng nhập ngay." } };
}

export async function verifyEmail(token) {
  if (!token) return { status: 400, body: { message: "Token là bắt buộc" } };

  const doc = await EmailVerificationToken.findOne({ token });
  if (!doc) {
    return { status: 400, body: { message: "Liên kết xác minh không hợp lệ hoặc đã hết hạn" } };
  }

  const user = await User.findById(doc.userId);
  if (!user) {
    return { status: 400, body: { message: "Liên kết xác minh không hợp lệ hoặc đã hết hạn" } };
  }

  if (doc.usedAt || user.isEmailVerified) {
    if (user.isEmailVerified && user.isActive) {
      return { status: 200, body: { message: "Email đã được xác minh. Bạn có thể đăng nhập ngay." } };
    }
    return { status: 400, body: { message: "Liên kết xác minh không hợp lệ hoặc đã hết hạn" } };
  }

  if (doc.expiresAt <= new Date()) {
    return { status: 400, body: { message: "Liên kết xác minh không hợp lệ hoặc đã hết hạn" } };
  }

  user.isEmailVerified = true;
  user.isActive = true;
  await user.save();

  doc.usedAt = new Date();
  await doc.save();

  return { status: 200, body: { message: "Xác minh email thành công. Bạn có thể đăng nhập ngay." } };
}

export async function resendVerification(email) {
  const normalizedEmail = email?.toLowerCase()?.trim();
  if (!normalizedEmail) return { status: 400, body: { message: "Email là bắt buộc" } };

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
          message: "Vui lòng đợi trước khi yêu cầu gửi lại email xác minh",
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
    body: { message: "Nếu tài khoản đủ điều kiện, email xác minh đã được gửi." },
  };
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const pwdError = validatePasswordStrength(newPassword);
  if (pwdError) return { status: 400, body: { message: pwdError } };
  if (!currentPassword) return { status: 400, body: { message: "Mật khẩu hiện tại là bắt buộc" } };

  const user = await User.findById(userId);
  if (!user) return { status: 404, body: { message: "Không tìm thấy người dùng" } };

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) return { status: 401, body: { message: "Mật khẩu hiện tại không đúng" } };

  const sameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
  if (sameAsCurrent) {
    return { status: 400, body: { message: "Mật khẩu mới phải khác mật khẩu hiện tại" } };
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordChangedAt = new Date();
  await user.save();
  await revokeAllUserTokens(userId);

  return { status: 200, body: { message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." } };
}

export async function getMe(userId) {
  const user = await User.findById(userId).select("email role fullName isActive isLocked isEmailVerified");
  if (!user || !user.isActive || user.isLocked) {
    return { status: 403, body: { message: "Phiên đăng nhập không hợp lệ hoặc tài khoản không khả dụng" } };
  }
  if (user.role === "patient" && !user.isEmailVerified) {
    return { status: 403, body: { message: "Yêu cầu xác minh email" } };
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
