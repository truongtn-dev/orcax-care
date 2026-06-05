import crypto from "crypto";

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function normalizeEmail(email) {
  return email?.toLowerCase()?.trim() || "";
}

export function validateRequired(value, label) {
  if (!String(value || "").trim()) return `${label} là bắt buộc`;
  return null;
}

export function validatePhoneOptional(phone) {
  if (!phone) return null;
  if (!/^[0-9+\-\s()]{8,20}$/.test(phone.trim())) return "Số điện thoại không hợp lệ";
  return null;
}

export function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return "Mật khẩu phải có ít nhất 8 ký tự";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Mật khẩu phải có ít nhất một chữ cái và một chữ số";
  }
  return null;
}

export function validateEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Địa chỉ email không hợp lệ";
  }
  return null;
}
