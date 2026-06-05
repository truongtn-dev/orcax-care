const ROLE_LABELS = {
  admin: "Quản trị viên",
  doctor: "Bác sĩ",
  staff: "Nhân viên",
  patient: "Bệnh nhân",
};

export function formatRoleLabel(role) {
  return ROLE_LABELS[role] || role || "Người dùng";
}
