import { normalizeText } from "./textProcessing.js";

export const SPECIALTY_EXPANSION_BY_CODE = {
  PED: ["nhi khoa", "tre em", "thieu nhi", "em be", "con nho", "suc khoe tre", "nhi", "pediatric", "children"],
  CARD: ["tim mach", "tim", "heart", "cardio", "cardiology"],
  DERM: ["da lieu", "da", "skin", "dermatology"],
  NEUR: ["than kinh", "nao", "neurology", "brain"],
  ORTH: ["co xuong", "xuong khop", "orthopedic", "orthopedics", "joint"],
  PHAR: ["duoc", "thuoc", "pharmacy", "phamarcy", "nha thuoc"],
};

export const DEPARTMENT_EXPANSION_BY_NAME = {
  "Internal Medicine": ["noi khoa", "internal medical", "internal medicine", "noi"],
  Surgery: ["ngoai khoa", "phau thuat", "surgery", "surgical"],
  "Pediatrics Ward": ["khoa nhi", "nhi", "pediatrics ward", "pediatric ward"],
  Pharmacy: ["nha thuoc", "duoc", "pharmacy", "phamarcy"],
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
