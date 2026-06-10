import { ngramTextScore, toMatchPercent } from "./ngramEngine.js";
import { expansionTermsForDepartment, expansionTermsForSpecialty } from "./queryExpansion.js";
import { normalizeText } from "./textProcessing.js";

const DEFAULT_MIN_SCORE = 0.38;

function buildVariants(entry, expansionResolver) {
  const variants = new Set();
  const push = (value) => {
    const norm = normalizeText(value);
    if (norm) variants.add(norm);
  };

  push(entry.name);
  push(entry.code);
  push(entry.description);
  for (const term of expansionResolver(entry)) push(term);

  return [...variants];
}

function scoreAgainstVariants(query, variants) {
  let best = 0;
  let bestVariant = "";

  for (const variant of variants) {
    const score = ngramTextScore(query, variant);
    if (score > best) {
      best = score;
      bestVariant = variant;
    }
  }

  return { score: best, matchedVariant: bestVariant };
}

function rankCatalogEntries(query, entries, expansionResolver) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  return entries
    .map((entry) => {
      const variants = buildVariants(entry, expansionResolver);
      const { score, matchedVariant } = scoreAgainstVariants(normalizedQuery, variants);

      return {
        entry,
        score,
        matchPercent: toMatchPercent(score),
        matchedVariant,
        label: entry.name,
      };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function matchSpecialty(query, specialties, { minScore = DEFAULT_MIN_SCORE } = {}) {
  const ranked = rankCatalogEntries(query, specialties, expansionTermsForSpecialty);
  const best = ranked[0];
  if (!best || best.score < minScore) return null;

  return {
    id: best.entry._id?.toString(),
    name: best.entry.name,
    code: best.entry.code,
    score: best.score,
    matchPercent: best.matchPercent,
    matchedVariant: best.matchedVariant,
    ref: best.entry,
    alternatives: ranked.slice(1, 4).map((row) => ({
      name: row.entry.name,
      matchPercent: row.matchPercent,
    })),
  };
}

export function matchDepartment(query, departments, { minScore = DEFAULT_MIN_SCORE } = {}) {
  const ranked = rankCatalogEntries(query, departments, expansionTermsForDepartment);
  const best = ranked[0];
  if (!best || best.score < minScore) return null;

  return {
    id: best.entry._id?.toString(),
    name: best.entry.name,
    score: best.score,
    matchPercent: best.matchPercent,
    matchedVariant: best.matchedVariant,
    ref: best.entry,
    alternatives: ranked.slice(1, 4).map((row) => ({
      name: row.entry.name,
      matchPercent: row.matchPercent,
    })),
  };
}

export function resolveCatalogIntent(query, { specialties = [], departments = [] } = {}) {
  const specialtyMatch = matchSpecialty(query, specialties);
  const departmentMatch = matchDepartment(query, departments);

  if (!specialtyMatch && !departmentMatch) {
    return { specialty: null, department: null, primary: null };
  }

  if (!specialtyMatch) {
    return { specialty: null, department: departmentMatch, primary: departmentMatch };
  }
  if (!departmentMatch) {
    return { specialty: specialtyMatch, department: null, primary: specialtyMatch };
  }

  const primary = specialtyMatch.score >= departmentMatch.score ? specialtyMatch : departmentMatch;
  return { specialty: specialtyMatch, department: departmentMatch, primary };
}
