import { normalizeText } from "./textProcessing.js";

export const SPECIALTY_EXPANSION_BY_CODE = {
  PED: ["pediatric", "pediatrics", "children", "child", "kids", "infant"],
  CARD: ["heart", "cardio", "cardiovascular", "cardiology", "cardiac"],
  DERM: ["skin", "dermatology", "dermatologist", "dermatologic"],
  NEUR: ["brain", "neurology", "neurological", "nervous system", "nerve"],
  ORTH: ["bone", "bones", "joint", "joints", "orthopedic", "orthopedics", "musculoskeletal"],
  PHAR: ["pharmacy", "pharmaceutical", "phamarcy", "drug", "dispensing"],
};

export const DEPARTMENT_EXPANSION_BY_NAME = {
  "Internal Medicine": ["internal medical", "internal medicine", "internist", "general medicine"],
  Surgery: ["surgery", "surgical", "surgeon", "operating"],
  "Pediatrics Ward": ["pediatrics ward", "pediatric ward", "children ward"],
  Pharmacy: ["pharmacy", "phamarcy", "drugstore", "dispensary"],
};

export function expansionTermsForSpecialty(specialty) {
  const code = (specialty.code || "").toUpperCase();
  return SPECIALTY_EXPANSION_BY_CODE[code] || [];
}

export function expansionTermsForDepartment(department) {
  return DEPARTMENT_EXPANSION_BY_NAME[department.name] || [];
}

function aliasMatchesQuery(normalizedQuery, alias) {
  if (normalizedQuery === alias) return true;

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const aliasTokens = alias.split(" ").filter(Boolean);
  if (queryTokens.length < 2 || aliasTokens.length < 2) return false;

  return (
    queryTokens.length === aliasTokens.length &&
    queryTokens.every((token, index) => token === aliasTokens[index])
  );
}

export function expandQuery(query, { specialties = [], departments = [] } = {}) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return query;

  const expansions = new Set(normalizedQuery.split(" ").filter(Boolean));

  for (const specialty of specialties) {
    for (const term of expansionTermsForSpecialty(specialty)) {
      const norm = normalizeText(term);
      if (!norm || !aliasMatchesQuery(normalizedQuery, norm)) continue;
      expansions.add(normalizeText(specialty.name));
      expansions.add(normalizeText(specialty.code));
      expansions.add(norm);
    }
  }

  for (const department of departments) {
    for (const term of expansionTermsForDepartment(department)) {
      const norm = normalizeText(term);
      if (!norm || !aliasMatchesQuery(normalizedQuery, norm)) continue;
      expansions.add(normalizeText(department.name));
      expansions.add(norm);
    }
  }

  return [...expansions].join(" ");
}
