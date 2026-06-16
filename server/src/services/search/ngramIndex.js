import {
  FIELD_WEIGHTS,
  buildTermFrequencyVector,
  cosineSimilarityVectors,
  extractNGramTerms,
  ngramProfileScore,
  buildNGramProfile,
  scoreDocumentNgrams,
} from "./ngramEngine.js";
import { normalizeText } from "./textProcessing.js";

function doctorFields(doctor) {
  return {
    fullName: doctor.fullName || "",
    specialty: doctor.specialty?.name || "",
    department: doctor.department?.name || "",
    bio: doctor.bio || "",
    licenseNo: doctor.licenseNo || "",
  };
}

export class NGramInvertedIndex {
  constructor() {
    this.postings = new Map();
    this.df = new Map();
    this.docVectors = new Map();
    this.docProfiles = new Map();
    this.docLengths = new Map();
    this.N = 0;
    this.avgdl = 0;
  }

  idf(term) {
    const df = this.df.get(term) || 0;
    return Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
  }

  addTerms(docId, terms, fieldWeight = 1) {
    const vector = this.docVectors.get(docId) || new Map();
    let length = this.docLengths.get(docId) || 0;

    for (const { key } of terms) {
      vector.set(key, (vector.get(key) || 0) + fieldWeight);
      length += fieldWeight;
      if (!this.postings.has(key)) this.postings.set(key, new Map());
      const posting = this.postings.get(key);
      posting.set(docId, (posting.get(docId) || 0) + fieldWeight);
    }

    this.docVectors.set(docId, vector);
    this.docLengths.set(docId, length);
  }

  finalizeDocument(docId) {
    const vector = this.docVectors.get(docId);
    if (!vector) return;
    for (const key of vector.keys()) {
      this.df.set(key, (this.df.get(key) || 0) + 1);
    }
  }

  addDoctor(doctor) {
    const docId = String(doctor._id);
    const fields = doctorFields(doctor);
    const fieldProfiles = {};
    const mergedVector = new Map();

    for (const [field, text] of Object.entries(fields)) {
      const weight = FIELD_WEIGHTS[field] || 0.1;
      const terms = extractNGramTerms(text);
      this.addTerms(docId, terms, weight);
      fieldProfiles[field] = buildNGramProfile(text);

      const fieldVector = buildTermFrequencyVector(text);
      for (const [key, tf] of fieldVector) {
        mergedVector.set(key, (mergedVector.get(key) || 0) + tf * weight);
      }
    }

    this.finalizeDocument(docId);
    this.docProfiles.set(docId, fieldProfiles);
    this.docVectors.set(docId, mergedVector);
    this.N = this.docVectors.size;
    this.avgdl =
      [...this.docLengths.values()].reduce((sum, len) => sum + len, 0) / Math.max(1, this.N);
  }

  buildFromDoctors(doctors) {
    this.postings.clear();
    this.df.clear();
    this.docVectors.clear();
    this.docProfiles.clear();
    this.docLengths.clear();
    this.N = 0;
    this.avgdl = 0;

    for (const doctor of doctors) {
      this.addDoctor(doctor);
    }
    return this;
  }

  buildQueryVector(query) {
    const vector = new Map();
    for (const { key } of extractNGramTerms(query)) {
      vector.set(key, (vector.get(key) || 0) + 1);
    }
    return vector;
  }

  queryWeightFn(term) {
    return this.idf(term);
  }

  scoreCosine(query, docId) {
    const queryVector = this.buildQueryVector(query);
    const docVector = this.docVectors.get(String(docId));
    if (!queryVector.size || !docVector) return 0;
    return cosineSimilarityVectors(queryVector, docVector, (term) => this.queryWeightFn(term));
  }

  scoreProfile(query, docId) {
    const profiles = this.docProfiles.get(String(docId));
    if (!profiles) return 0;
    const queryProfile = buildNGramProfile(query);
    return scoreDocumentNgrams(queryProfile, profiles);
  }

  scoreQueryLikelihood(query, docId) {
    const queryVector = this.buildQueryVector(query);
    const docVector = this.docVectors.get(String(docId));
    if (!queryVector.size || !docVector) return 0;

    let logProb = 0;
    let matched = 0;
    const docLength = this.docLengths.get(String(docId)) || 1;

    for (const [term, qtf] of queryVector) {
      const tf = docVector.get(term) || 0;
      const idfVal = this.idf(term);
      const prob = (tf + 1) / (docLength + this.postings.size + 1);
      if (tf > 0) {
        matched += qtf;
        logProb += qtf * Math.log(prob) * (1 + idfVal);
      }
    }

    if (matched === 0) return 0;
    return 1 - Math.exp(logProb / matched);
  }

  scoreDocument(query, docId) {
    const cosine = this.scoreCosine(query, docId);
    const profile = this.scoreProfile(query, docId);
    const likelihood = this.scoreQueryLikelihood(query, docId);
    return cosine * 0.45 + profile * 0.35 + likelihood * 0.2;
  }

  retrieveCandidates(query, minShared = 1) {
    const queryVector = this.buildQueryVector(query);
    const counts = new Map();

    for (const term of queryVector.keys()) {
      const posting = this.postings.get(term);
      if (!posting) continue;
      for (const docId of posting.keys()) {
        counts.set(docId, (counts.get(docId) || 0) + 1);
      }
    }

    return [...counts.entries()]
      .filter(([, shared]) => shared >= minShared)
      .sort((a, b) => b[1] - a[1])
      .map(([docId]) => docId);
  }
}

export function buildNGramIndex(doctors) {
  return new NGramInvertedIndex().buildFromDoctors(doctors);
}

export function scoreDoctorNgrams(doctor, query, ngramIndex = null) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  if (ngramIndex) {
    return ngramIndex.scoreDocument(normalizedQuery, doctor._id);
  }

  const queryProfile = buildNGramProfile(normalizedQuery);
  const fields = {
    fullName: buildNGramProfile(doctor.fullName || ""),
    specialty: buildNGramProfile(doctor.specialty?.name || ""),
    department: buildNGramProfile(doctor.department?.name || ""),
    bio: buildNGramProfile(doctor.bio || ""),
    licenseNo: buildNGramProfile(doctor.licenseNo || ""),
  };

  let score = scoreDocumentNgrams(queryProfile, fields);
  const combined = [doctor.fullName, doctor.specialty?.name, doctor.department?.name, doctor.bio, doctor.licenseNo]
    .filter(Boolean)
    .join(" ");

  if (normalizeText(combined).includes(normalizedQuery)) {
    score = Math.min(1, score + 0.2);
  }
  if (doctor.fullName && normalizeText(doctor.fullName).startsWith(normalizedQuery)) {
    score = Math.min(1, score + 0.12);
  }

  return score;
}
