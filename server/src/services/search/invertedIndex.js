import { processQueryTerms, tokenize } from "./textProcessing.js";

const FIELD_WEIGHTS = {
  fullName: 3.5,
  specialty: 2.5,
  department: 2.0,
  bio: 1.5,
  licenseNo: 0.5,
};

function doctorFields(doctor) {
  return {
    fullName: doctor.fullName || "",
    specialty: doctor.specialty?.name || "",
    department: doctor.department?.name || "",
    bio: doctor.bio || "",
    licenseNo: doctor.licenseNo || "",
  };
}

export class InvertedIndex {
  constructor() {
    this.documents = new Map();
    this.df = new Map();
    this.N = 0;
    this.avgdl = 0;
  }

  addDoctor(doctor) {
    const docId = String(doctor._id);
    const fields = doctorFields(doctor);
    const termFreqs = new Map();
    let docLength = 0;

    for (const [field, text] of Object.entries(fields)) {
      const weight = FIELD_WEIGHTS[field] || 1;
      const tokens = tokenize(text, { removeStopWords: true }).map((t) => t);
      for (const token of tokens) {
        termFreqs.set(token, (termFreqs.get(token) || 0) + weight);
        docLength += weight;
      }
    }

    const seenTerms = new Set(termFreqs.keys());
    for (const term of seenTerms) {
      this.df.set(term, (this.df.get(term) || 0) + 1);
    }

    this.documents.set(docId, { doctor, termFreqs, docLength });
    this.N = this.documents.size;
    this.avgdl =
      [...this.documents.values()].reduce((sum, doc) => sum + doc.docLength, 0) / Math.max(1, this.N);
  }

  buildFromDoctors(doctors) {
    this.documents.clear();
    this.df.clear();
    this.N = 0;
    this.avgdl = 0;
    for (const doctor of doctors) {
      this.addDoctor(doctor);
    }
    return this;
  }

  getDocumentStats(docId) {
    return this.documents.get(String(docId));
  }

  getDf(term) {
    return this.df.get(term) || 0;
  }
}

export function buildInvertedIndex(doctors) {
  return new InvertedIndex().buildFromDoctors(doctors);
}

export function queryTermsFromText(text) {
  return processQueryTerms(text);
}
