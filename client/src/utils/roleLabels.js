const ROLE_LABELS = {
  admin: "Administrator",
  doctor: "Doctor",
  staff: "Staff",
  patient: "Patient",
};

export function formatRoleLabel(role) {
  return ROLE_LABELS[role] || role || "User";
}
