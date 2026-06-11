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
    return "Password must include at least one letter and one number";
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

  if (!form.terms) errors.terms = "You must agree to the terms and conditions";

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
    errors.newPassword = "New password must differ from current password";
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

export function validateAdminCreateAccountForm(form) {
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

  if (form.phone?.trim()) {
    const phoneError = validatePhone(form.phone);
    if (phoneError) errors.phone = phoneError;
  }

  if (!form.role) errors.role = "Role is required";

  if (form.role === "doctor") {
    if (!form.specialtyId) errors.specialtyId = "Specialty is required";
    if (!form.departmentId) errors.departmentId = "Department is required";
    if (!form.licenseNo?.trim()) errors.licenseNo = "License number is required";
  }

  return errors;
}

export function validateAdminCreateClinicRoomForm(form) {
  const errors = {};

  if (!form.departmentId) {
    errors.departmentId = "Department is required";
  }

  const roomCode = form.roomCode?.trim().toUpperCase();
  if (!roomCode) {
    errors.roomCode = "Room code is required";
  } else if (!/^[A-Z0-9_-]{2,12}$/.test(roomCode)) {
    errors.roomCode = "Room code must be 2–12 characters (letters, numbers, hyphen, underscore)";
  }

  const name = form.name?.trim();
  if (!name) {
    errors.name = "Room name is required";
  } else if (name.length > 100) {
    errors.name = "Room name must be at most 100 characters";
  }

  const floor = form.floor?.trim() || "";
  if (floor.length > 20) {
    errors.floor = "Floor must be at most 20 characters";
  }

  const capacityNum = parseInt(form.capacity, 10);
  if (!capacityNum || capacityNum < 1 || capacityNum > 50) {
    errors.capacity = "Capacity must be between 1 and 50";
  }

  const equipmentNotes = form.equipmentNotes?.trim() || "";
  if (equipmentNotes.length > 500) {
    errors.equipmentNotes = "Equipment notes must be at most 500 characters";
  }

  return errors;
}

export function validateAdminCreateSpecialtyForm(form) {
  const errors = {};

  const code = form.code?.trim().toUpperCase();
  if (!code) {
    errors.code = "Code is required";
  } else if (!/^[A-Z0-9_-]{2,12}$/.test(code)) {
    errors.code = "Code must be 2–12 characters (letters, numbers, hyphen, underscore)";
  }

  const name = form.name?.trim();
  if (!name) {
    errors.name = "Name is required";
  } else if (name.length > 100) {
    errors.name = "Name must be at most 100 characters";
  }

  const description = form.description?.trim() || "";
  if (description.length > 500) {
    errors.description = "Description must be at most 500 characters";
  }

  return errors;
}

export function validateAdminEditPatientForm(form) {
  const errors = {};

  if (form.dateOfBirth) {
    const dob = new Date(form.dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      errors.dateOfBirth = "Invalid date of birth";
    }
  }

  if (form.gender && !["male", "female", "other"].includes(form.gender)) {
    errors.gender = "Invalid gender";
  }

  const address = form.address?.trim() || "";
  if (address.length > 300) {
    errors.address = "Address must be at most 300 characters";
  }

  const emergencyContactName = form.emergencyContactName?.trim() || "";
  if (emergencyContactName.length > 120) {
    errors.emergencyContactName = "Emergency contact name must be at most 120 characters";
  }

  const emergencyContactPhone = form.emergencyContactPhone?.trim() || "";
  if (emergencyContactPhone && !/^[\d\s+\-()]{8,20}$/.test(emergencyContactPhone)) {
    errors.emergencyContactPhone = "Invalid emergency contact phone number";
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
