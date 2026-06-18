const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export function isMongoObjectId(value) {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

export function getDoctorProfilePath(doctorOrSlug) {
  if (!doctorOrSlug) return "/search-doctors";

  if (typeof doctorOrSlug === "string") {
    return `/doctor/${doctorOrSlug}`;
  }

  const slug = doctorOrSlug.slug;
  const id = doctorOrSlug._id;
  return `/doctor/${slug || id}`;
}
