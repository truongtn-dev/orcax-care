export { isMongoObjectId } from "./doctorUrls.js";

function recordKey(recordOrSlug) {
  if (!recordOrSlug) return "";
  if (typeof recordOrSlug === "string") return recordOrSlug;
  return recordOrSlug.slug || recordOrSlug._id || "";
}

/** Prefer SEO slug for admin API calls when available. */
export function getAdminRecordApiKey(recordOrSlug) {
  return recordKey(recordOrSlug);
}

export function getAdminDoctorPath(doctorOrSlug) {
  const key = recordKey(doctorOrSlug);
  return key ? `/admin/doctors/${key}` : "/admin/doctors";
}

export function getAdminAccountPath(accountOrSlug) {
  const key = recordKey(accountOrSlug);
  return key ? `/admin/account/${key}` : "/admin/account";
}

export function getAdminPatientPath(patientOrSlug) {
  const key = recordKey(patientOrSlug);
  return key ? `/admin/patients/${key}` : "/admin/patients";
}

export function getAdminPatientEditPath(patientOrSlug) {
  const key = recordKey(patientOrSlug);
  return key ? `/admin/patients?edit=${encodeURIComponent(key)}` : "/admin/patients";
}

export function getAdminDoctorEditPath(doctorOrSlug) {
  const key = recordKey(doctorOrSlug);
  return key ? `/admin/doctors?edit=${encodeURIComponent(key)}` : "/admin/doctors";
}

export function getAdminAccountEditPath(accountOrSlug) {
  const key = recordKey(accountOrSlug);
  return key ? `/admin/account?edit=${encodeURIComponent(key)}` : "/admin/account";
}

export function getStaffEditPath(staffOrSlug) {
  const key = recordKey(staffOrSlug);
  return key ? `/admin/staff?edit=${encodeURIComponent(key)}` : "/admin/staff";
}

export function getStaffDetailPath(staffOrSlug) {
  return getAdminAccountPath(staffOrSlug);
}
