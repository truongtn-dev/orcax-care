import crypto from "crypto";

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function normalizeEmail(email) {
  return email?.toLowerCase()?.trim() || "";
}

export function validateRequired(value, label) {
  if (!String(value || "").trim()) return `${label} is required`;
  return null;
}

export function validatePhoneOptional(phone) {
  if (!phone) return null;
  if (!/^[0-9+\-\s()]{8,20}$/.test(phone.trim())) return "Invalid phone number";
  return null;
}

export function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must contain at least one letter and one number";
  }
  return null;
}

export function validateEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Invalid email address";
  }
  return null;
}
