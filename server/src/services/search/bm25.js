const K1 = 1.2;
const B = 0.75;

export function idf(term, index) {
  const n = index.getDf(term);
  const N = index.N;
  return Math.log(1 + (N - n + 0.5) / (n + 0.5));
}

export function bm25Score(queryTerms, docId, index) {
  const stats = index.getDocumentStats(docId);
  if (!stats || !queryTerms.length) return 0;

  const { termFreqs, docLength } = stats;
  let score = 0;

  for (const term of queryTerms) {
    const tf = termFreqs.get(term) || 0;
    if (tf <= 0) continue;

    const idfVal = idf(term, index);
    const denom = tf + K1 * (1 - B + B * (docLength / (index.avgdl || 1)));
    score += idfVal * ((tf * (K1 + 1)) / denom);
  }

  return score;
}

export function normalizeBm25Scores(scores) {
  const max = Math.max(...scores, 0.001);
  return scores.map((s) => s / max);
}
