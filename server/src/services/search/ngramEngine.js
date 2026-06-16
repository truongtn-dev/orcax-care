import { normalizeText } from "./textProcessing.js";

export const CHAR_NS = [2, 3, 4];
export const WORD_NS = [1, 2, 3];
const PADDING = "$";

const FIELD_WEIGHTS = {
  fullName: 0.35,
  specialty: 0.25,
  department: 0.2,
  bio: 0.15,
  licenseNo: 0.05,
};

function paddedCharSource(text) {
  const compact = normalizeText(text).replace(/\s/g, "");
  if (!compact) return "";
  return `${PADDING}${compact}${PADDING}`;
}

export function charNgrams(text, n) {
  const source = paddedCharSource(text);
  const grams = new Set();
  if (!source) return grams;
  if (source.length < n) {
    grams.add(source);
    return grams;
  }
  for (let i = 0; i <= source.length - n; i++) {
    grams.add(source.slice(i, i + n));
  }
  return grams;
}

export function wordNgrams(text, n) {
  const words = normalizeText(text).split(" ").filter(Boolean);
  const grams = new Set();
  if (!words.length) return grams;
  if (words.length < n) {
    grams.add(words.join(" "));
    return grams;
  }
  for (let i = 0; i <= words.length - n; i++) {
    grams.add(words.slice(i, i + n).join(" "));
  }
  return grams;
}

export function extractNGramTerms(text) {
  const terms = [];
  for (const n of CHAR_NS) {
    for (const gram of charNgrams(text, n)) {
      terms.push({ key: `c${n}:${gram}`, type: "char", n });
    }
  }
  for (const n of WORD_NS) {
    for (const gram of wordNgrams(text, n)) {
      terms.push({ key: `w${n}:${gram}`, type: "word", n });
    }
  }
  return terms;
}

export function buildNGramProfile(text) {
  return {
    char2: charNgrams(text, 2),
    char3: charNgrams(text, 3),
    char4: charNgrams(text, 4),
    word1: wordNgrams(text, 1),
    word2: wordNgrams(text, 2),
    word3: wordNgrams(text, 3),
  };
}

export function jaccardSimilarity(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function diceSimilarity(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection += 1;
  }
  return (2 * intersection) / (setA.size + setB.size);
}

export function qgramDistance(textA, textB, n = 3) {
  const gramsA = charNgrams(textA, n);
  const gramsB = charNgrams(textB, n);
  if (!gramsA.size && !gramsB.size) return 0;
  if (!gramsA.size || !gramsB.size) return Math.max(gramsA.size, gramsB.size);

  let intersection = 0;
  for (const gram of gramsA) {
    if (gramsB.has(gram)) intersection += 1;
  }
  return Math.max(gramsA.size, gramsB.size) - intersection;
}

export function qgramSimilarity(textA, textB, n = 3) {
  const gramsA = charNgrams(textA, n);
  const gramsB = charNgrams(textB, n);
  if (!gramsA.size || !gramsB.size) return 0;
  let intersection = 0;
  for (const gram of gramsA) {
    if (gramsB.has(gram)) intersection += 1;
  }
  return (2 * intersection) / (gramsA.size + gramsB.size);
}

function profileLayerWeights(profileA, profileB) {
  const compact = profileA.word1.size <= 2 && profileB.word1.size <= 2;
  if (compact) {
    return { char2: 0.3, char3: 0.35, char4: 0.2, word1: 0.15, word2: 0, word3: 0 };
  }
  return { char2: 0.1, char3: 0.25, char4: 0.15, word1: 0.2, word2: 0.2, word3: 0.1 };
}

export function ngramProfileScore(profileA, profileB) {
  const weights = profileLayerWeights(profileA, profileB);
  let score = 0;
  score += diceSimilarity(profileA.char2, profileB.char2) * weights.char2;
  score += diceSimilarity(profileA.char3, profileB.char3) * weights.char3;
  score += diceSimilarity(profileA.char4, profileB.char4) * weights.char4;
  score += jaccardSimilarity(profileA.word1, profileB.word1) * weights.word1;
  score += jaccardSimilarity(profileA.word2, profileB.word2) * weights.word2;
  score += jaccardSimilarity(profileA.word3, profileB.word3) * weights.word3;
  return score;
}

export function ngramTextScore(textA, textB) {
  const left = normalizeText(textA);
  const right = normalizeText(textB);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const profileScore = ngramProfileScore(buildNGramProfile(left), buildNGramProfile(right));
  const q3 = qgramSimilarity(left, right, 3);
  const q2 = qgramSimilarity(left, right, 2);
  const blended = profileScore * 0.55 + q3 * 0.3 + q2 * 0.15;

  if (left.includes(right) || right.includes(left)) {
    const shorter = Math.min(left.length, right.length);
    const longer = Math.max(left.length, right.length);
    return Math.max(blended, 0.72 + (shorter / longer) * 0.28);
  }

  return blended;
}

export function toMatchPercent(score) {
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}

export function buildTermFrequencyVector(text) {
  const vector = new Map();
  for (const { key } of extractNGramTerms(text)) {
    vector.set(key, (vector.get(key) || 0) + 1);
  }
  return vector;
}

export function cosineSimilarityVectors(vecA, vecB, weightFn = () => 1) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [key, tfA] of vecA) {
    const w = weightFn(key);
    const weightedA = tfA * w;
    normA += weightedA * weightedA;
    if (vecB.has(key)) {
      dot += weightedA * (vecB.get(key) * w);
    }
  }

  for (const [key, tfB] of vecB) {
    const w = weightFn(key);
    normB += (tfB * w) * (tfB * w);
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
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
    vectors: {
      fullName: buildTermFrequencyVector(fullName),
      specialty: buildTermFrequencyVector(specialty),
      department: buildTermFrequencyVector(department),
      bio: buildTermFrequencyVector(bio),
      licenseNo: buildTermFrequencyVector(licenseNo),
      combined: buildTermFrequencyVector(combined),
    },
  };
}

export function scoreDocumentNgrams(queryProfile, fieldProfiles) {
  let score = 0;
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const docField = fieldProfiles[field];
    if (!docField) continue;
    score += ngramProfileScore(queryProfile, docField) * weight;
  }
  return score;
}

export { FIELD_WEIGHTS };
