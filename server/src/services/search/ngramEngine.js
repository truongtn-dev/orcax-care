/**
 * NGram Search Engine — character & word n-grams with overlap scoring.
 */

export function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function charNgrams(text, n) {
  const compact = normalizeText(text).replace(/\s/g, "");
  const grams = new Set();
  if (compact.length < n) {
    if (compact) grams.add(compact);
    return grams;
  }
  for (let i = 0; i <= compact.length - n; i++) {
    grams.add(compact.slice(i, i + n));
  }
  return grams;
}

export function wordNgrams(text, n) {
  const words = normalizeText(text).split(" ").filter(Boolean);
  const grams = new Set();
  if (words.length === 0) return grams;
  if (words.length < n) {
    grams.add(words.join(" "));
    return grams;
  }
  for (let i = 0; i <= words.length - n; i++) {
    grams.add(words.slice(i, i + n).join(" "));
  }
  return grams;
}

export function buildNGramProfile(text) {
  return {
    char2: charNgrams(text, 2),
    char3: charNgrams(text, 3),
    word1: wordNgrams(text, 1),
    word2: wordNgrams(text, 2),
  };
}

function overlapScore(querySet, docSet) {
  if (!querySet.size || !docSet.size) return 0;
  let hit = 0;
  for (const g of querySet) {
    if (docSet.has(g)) hit += 1;
  }
  return hit / (querySet.size + docSet.size - hit);
}

const FIELD_WEIGHTS = {
  fullName: 0.35,
  specialty: 0.25,
  department: 0.2,
  bio: 0.15,
  licenseNo: 0.05,
};

export function scoreDocument(profile, fieldProfiles) {
  let score = 0;
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const docField = fieldProfiles[field];
    if (!docField) continue;
    const fieldScore =
      overlapScore(profile.char2, docField.char2) * 0.25 +
      overlapScore(profile.char3, docField.char3) * 0.35 +
      overlapScore(profile.word1, docField.word1) * 0.25 +
      overlapScore(profile.word2, docField.word2) * 0.15;
    score += fieldScore * weight;
  }
  return score;
}

export function buildDoctorDocumentProfile(doctor) {
  const fullName = doctor.fullName || "";
  const specialty = doctor.specialty?.name || "";
  const department = doctor.department?.name || "";
  const bio = doctor.bio || "";
  const licenseNo = doctor.licenseNo || "";
  const combined = [fullName, specialty, department, bio, licenseNo].join(" ");

  return {
    combinedText: combined,
    fields: {
      fullName: buildNGramProfile(fullName),
      specialty: buildNGramProfile(specialty),
      department: buildNGramProfile(department),
      bio: buildNGramProfile(bio),
      licenseNo: buildNGramProfile(licenseNo),
    },
    profile: buildNGramProfile(combined),
  };
}

export function rankByNGram(doctors, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return doctors.map((doc) => ({ ...doc, _searchScore: 0 }));
  }

  const queryProfile = buildNGramProfile(normalizedQuery);

  return doctors
    .map((doc) => {
      const indexed = doc._ngram || buildDoctorDocumentProfile(doc);
      const score = scoreDocument(queryProfile, indexed.fields);
      const exactBoost = indexed.combinedText.includes(normalizedQuery) ? 0.25 : 0;
      const prefixBoost = (doc.fullName && normalizeText(doc.fullName).startsWith(normalizedQuery)) ? 0.15 : 0;
      return {
        ...doc,
        _searchScore: Math.min(1, score + exactBoost + prefixBoost),
      };
    })
    .sort((a, b) => b._searchScore - a._searchScore);
}
