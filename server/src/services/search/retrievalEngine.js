import { bm25Score, normalizeBm25Scores } from "./bm25.js";
import { buildInvertedIndex, queryTermsFromText } from "./invertedIndex.js";
import { matchDepartment, matchSpecialty } from "./catalogMatcher.js";
import { toMatchPercent } from "./ngramEngine.js";
import { buildNGramIndex, scoreDoctorNgrams } from "./ngramIndex.js";
import { expandQuery } from "./queryExpansion.js";
import { normalizeText } from "./textProcessing.js";

const BM25_WEIGHT = 0.55;
const NGRAM_WEIGHT = 0.3;
const CATALOG_WEIGHT = 0.15;

export function rankDoctors(doctors, query, catalog = {}) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return doctors.map((doc) => ({ ...doc, _searchScore: 0, _matchPercent: 0 }));
  }

  const { specialties = [], departments = [] } = catalog;
  const expandedQuery = expandQuery(query, { specialties, departments });
  const queryTerms = queryTermsFromText(expandedQuery);
  const index = buildInvertedIndex(doctors);
  const ngramIndex = buildNGramIndex(doctors);

  const specialtyMatch = matchSpecialty(query, specialties);
  const departmentMatch = matchDepartment(query, departments);

  const bm25Raw = doctors.map((doc) => bm25Score(queryTerms, doc._id, index));
  const bm25Norm = normalizeBm25Scores(bm25Raw);

  return doctors
    .map((doc, i) => {
      const ngramScore = scoreDoctorNgrams(doc, expandedQuery, ngramIndex);
      let catalogBoost = 0;

      if (specialtyMatch && doc.specialty?.name === specialtyMatch.name) {
        catalogBoost = Math.max(catalogBoost, specialtyMatch.score);
      }
      if (departmentMatch && doc.department?.name === departmentMatch.name) {
        catalogBoost = Math.max(catalogBoost, departmentMatch.score);
      }

      const combined =
        bm25Norm[i] * BM25_WEIGHT +
        ngramScore * NGRAM_WEIGHT +
        catalogBoost * CATALOG_WEIGHT;

      const displayScore = Math.min(1, combined);
      const matchPercent = toMatchPercent(Math.max(ngramScore, catalogBoost, displayScore));

      return {
        ...doc,
        _searchScore: displayScore,
        _matchPercent: matchPercent,
      };
    })
    .sort((a, b) => b._searchScore - a._searchScore);
}
