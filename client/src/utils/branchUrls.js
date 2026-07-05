const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export function isMongoObjectId(value) {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

export function getBranchPath(branchOrSlug) {
  if (!branchOrSlug) return "/branches";

  if (typeof branchOrSlug === "string") {
    return `/branches/${branchOrSlug}`;
  }

  const slug = branchOrSlug.slug;
  const id = branchOrSlug._id;
  return `/branches/${slug || id}`;
}
