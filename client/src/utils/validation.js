export function validateFullName(fullName) {
  const trimmed = fullName?.trim();
  if (!trimmed) return "Full name is required";
  if (trimmed.length < 2) return "Full name must be at least 2 characters";
  if (trimmed.length > 100) return "Full name is too long";
  if (!/^[\p{L}\s'.-]+$/u.test(trimmed)) return "Full name contains invalid characters";
  return null;
}

export function validatePhone(phone) {
  if (!phone?.trim()) return null;
  if (!/^[\d\s+\-()]{8,20}$/.test(phone.trim())) return "Invalid phone number (8–20 digits)";
  return null;
}

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

  const fullNameError = validateFullName(form.fullName);
  if (fullNameError) errors.fullName = fullNameError;

  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePasswordStrength(form.password);
  if (passwordError) errors.password = passwordError;

  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  const phoneError = validatePhone(form.phone);
  if (phoneError) errors.phone = phoneError;

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
  else if (form.currentPassword && form.newPassword === form.currentPassword) {
    errors.newPassword = "New password must be different from current password";
  }

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

/** Validate one field on blur — returns error string or null */
export function getFieldError(formType, fieldName, form) {
  const errors =
    formType === "login"
      ? validateLoginForm(form)
      : formType === "register"
        ? validateRegisterForm(form)
        : formType === "changePassword"
          ? validateChangePasswordForm(form)
          : formType === "resetPassword"
            ? validateResetPasswordForm(form)
            : formType === "forgotPassword"
              ? { email: validateEmail(form.email) }
              : {};

  const err = errors[fieldName];
  return err || null;
}
