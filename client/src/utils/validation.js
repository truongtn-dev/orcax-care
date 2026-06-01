export function validateEmail(email) {
  if (!email?.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Invalid email address";
  return null;
}

export function validatePasswordStrength(password) {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must contain at least one letter and one number";
  }
  return null;
}

export function validateRegisterForm(form) {
  const errors = {};

  if (!form.fullName?.trim()) errors.fullName = "Full name is required";

  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePasswordStrength(form.password);
  if (passwordError) errors.password = passwordError;

  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  if (form.phone?.trim() && !/^[\d\s+\-()]{8,20}$/.test(form.phone.trim())) {
    errors.phone = "Invalid phone number";
  }

  if (!form.terms) errors.terms = "You must accept the terms and conditions";

  return errors;
}

export function validateLoginForm(form) {
  const errors = {};
  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;
  if (!form.password) errors.password = "Password is required";
  return errors;
}

export function validateChangePasswordForm(form) {
  const errors = {};
  if (!form.currentPassword) errors.currentPassword = "Current password is required";

  const passwordError = validatePasswordStrength(form.newPassword);
  if (passwordError) errors.newPassword = passwordError;

  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your new password";
  } else if (form.newPassword !== form.confirmPassword) {
    errors.confirmPassword = "New passwords do not match";
  }

  return errors;
}

export function validateResetPasswordForm(form) {
  const errors = {};
  const passwordError = validatePasswordStrength(form.newPassword);
  if (passwordError) errors.newPassword = passwordError;

  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your new password";
  } else if (form.newPassword !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
}

export function firstFormError(errors) {
  return Object.values(errors)[0] || null;
}
