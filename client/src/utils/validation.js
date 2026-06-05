export function validateFullName(fullName) {
  const trimmed = fullName?.trim();
  if (!trimmed) return "Họ và tên là bắt buộc";
  if (trimmed.length < 2) return "Họ và tên phải có ít nhất 2 ký tự";
  if (trimmed.length > 100) return "Họ và tên quá dài";
  if (!/^[\p{L}\s'.-]+$/u.test(trimmed)) return "Họ và tên chứa ký tự không hợp lệ";
  return null;
}

export function validatePhone(phone) {
  if (!phone?.trim()) return null;
  if (!/^[\d\s+\-()]{8,20}$/.test(phone.trim())) return "Số điện thoại không hợp lệ (8–20 chữ số)";
  return null;
}

export function validateEmail(email) {
  if (!email?.trim()) return "Email là bắt buộc";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Địa chỉ email không hợp lệ";
  return null;
}

export function validatePasswordStrength(password) {
  if (!password) return "Mật khẩu là bắt buộc";
  if (password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Mật khẩu phải có ít nhất một chữ cái và một chữ số";
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
    errors.confirmPassword = "Vui lòng xác nhận mật khẩu";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Mật khẩu không khớp";
  }

  const phoneError = validatePhone(form.phone);
  if (phoneError) errors.phone = phoneError;

  if (!form.terms) errors.terms = "Bạn phải đồng ý với điều khoản và điều kiện";

  return errors;
}

export function validateLoginForm(form) {
  const errors = {};
  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;
  if (!form.password) errors.password = "Mật khẩu là bắt buộc";
  return errors;
}

export function validateChangePasswordForm(form) {
  const errors = {};
  if (!form.currentPassword) errors.currentPassword = "Mật khẩu hiện tại là bắt buộc";

  const passwordError = validatePasswordStrength(form.newPassword);
  if (passwordError) errors.newPassword = passwordError;
  else if (form.currentPassword && form.newPassword === form.currentPassword) {
    errors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Vui lòng xác nhận mật khẩu mới";
  } else if (form.newPassword !== form.confirmPassword) {
    errors.confirmPassword = "Mật khẩu mới không khớp";
  }

  return errors;
}

export function validateResetPasswordForm(form) {
  const errors = {};
  const passwordError = validatePasswordStrength(form.newPassword);
  if (passwordError) errors.newPassword = passwordError;

  if (!form.confirmPassword) {
    errors.confirmPassword = "Vui lòng xác nhận mật khẩu mới";
  } else if (form.newPassword !== form.confirmPassword) {
    errors.confirmPassword = "Mật khẩu không khớp";
  }

  return errors;
}

export function validateAdminCreateAccountForm(form) {
  const errors = {};

  if (!form.fullName?.trim()) errors.fullName = "Họ và tên là bắt buộc";

  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePasswordStrength(form.password);
  if (passwordError) errors.password = passwordError;

  if (!form.confirmPassword) {
    errors.confirmPassword = "Vui lòng xác nhận mật khẩu";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Mật khẩu không khớp";
  }

  if (form.phone?.trim()) {
    const phoneError = validatePhone(form.phone);
    if (phoneError) errors.phone = phoneError;
  }

  if (!form.role) errors.role = "Vai trò là bắt buộc";

  if (form.role === "doctor") {
    if (!form.specialtyId) errors.specialtyId = "Chuyên khoa là bắt buộc";
    if (!form.departmentId) errors.departmentId = "Khoa/phòng ban là bắt buộc";
    if (!form.licenseNo?.trim()) errors.licenseNo = "Số giấy phép là bắt buộc";
  }

  return errors;
}

export function validateAdminCreateClinicRoomForm(form) {
  const errors = {};

  if (!form.departmentId) {
    errors.departmentId = "Khoa/phòng ban là bắt buộc";
  }

  const roomCode = form.roomCode?.trim().toUpperCase();
  if (!roomCode) {
    errors.roomCode = "Mã phòng là bắt buộc";
  } else if (!/^[A-Z0-9_-]{2,12}$/.test(roomCode)) {
    errors.roomCode = "Mã phòng phải có 2–12 ký tự (chữ, số, gạch ngang, gạch dưới)";
  }

  const name = form.name?.trim();
  if (!name) {
    errors.name = "Tên phòng là bắt buộc";
  } else if (name.length > 100) {
    errors.name = "Tên phòng tối đa 100 ký tự";
  }

  const floor = form.floor?.trim() || "";
  if (floor.length > 20) {
    errors.floor = "Tầng tối đa 20 ký tự";
  }

  const capacityNum = parseInt(form.capacity, 10);
  if (!capacityNum || capacityNum < 1 || capacityNum > 50) {
    errors.capacity = "Sức chứa phải từ 1 đến 50";
  }

  const equipmentNotes = form.equipmentNotes?.trim() || "";
  if (equipmentNotes.length > 500) {
    errors.equipmentNotes = "Ghi chú thiết bị tối đa 500 ký tự";
  }

  return errors;
}

export function validateAdminCreateSpecialtyForm(form) {
  const errors = {};

  const code = form.code?.trim().toUpperCase();
  if (!code) {
    errors.code = "Mã là bắt buộc";
  } else if (!/^[A-Z0-9_-]{2,12}$/.test(code)) {
    errors.code = "Mã phải có 2–12 ký tự (chữ, số, gạch ngang, gạch dưới)";
  }

  const name = form.name?.trim();
  if (!name) {
    errors.name = "Tên là bắt buộc";
  } else if (name.length > 100) {
    errors.name = "Tên tối đa 100 ký tự";
  }

  const description = form.description?.trim() || "";
  if (description.length > 500) {
    errors.description = "Mô tả tối đa 500 ký tự";
  }

  return errors;
}

export function validateAdminEditPatientForm(form) {
  const errors = {};

  if (form.dateOfBirth) {
    const dob = new Date(form.dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      errors.dateOfBirth = "Ngày sinh không hợp lệ";
    }
  }

  if (form.gender && !["male", "female", "other"].includes(form.gender)) {
    errors.gender = "Giới tính không hợp lệ";
  }

  const address = form.address?.trim() || "";
  if (address.length > 300) {
    errors.address = "Địa chỉ tối đa 300 ký tự";
  }

  const emergencyContactName = form.emergencyContactName?.trim() || "";
  if (emergencyContactName.length > 120) {
    errors.emergencyContactName = "Tên liên hệ khẩn cấp tối đa 120 ký tự";
  }

  const emergencyContactPhone = form.emergencyContactPhone?.trim() || "";
  if (emergencyContactPhone && !/^[\d\s+\-()]{8,20}$/.test(emergencyContactPhone)) {
    errors.emergencyContactPhone = "Số điện thoại liên hệ khẩn cấp không hợp lệ";
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
