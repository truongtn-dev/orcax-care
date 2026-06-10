import { matchDepartment, matchSpecialty } from "./catalogMatcher.js";
import { ngramTextScore } from "./ngramEngine.js";
import { normalizeText } from "./textProcessing.js";

const STATES = ["OTHER", "NAME", "SPECIALTY", "DEPARTMENT"];
const S = STATES.length;

const LOG_EPS = -12;

function log(x) {
  return x > 0 ? Math.log(x) : LOG_EPS;
}

function tokenizeQuery(query) {
  return normalizeText(query).split(" ").filter(Boolean);
}

function buildDictionary(entries) {
  const map = new Map();
  for (const entry of entries) {
    const key = normalizeText(entry.label);
    if (!key) continue;
    map.set(key, entry);
    for (const part of key.split(" ")) {
      if (part.length >= 3 && !map.has(part)) {
        map.set(part, entry);
      }
    }
  }
  return map;
}

function bestDictNgramScore(token, dict) {
  let best = 0;
  for (const key of dict.keys()) {
    best = Math.max(best, ngramTextScore(token, key));
  }
  return best;
}

function emissionLogProb(token, state, dicts) {
  const { specialtyDict, departmentDict, nameTokens } = dicts;

  if (state === "SPECIALTY") {
    if (specialtyDict.has(token)) return log(0.92);
    const best = bestDictNgramScore(token, specialtyDict);
    if (best >= 0.7) return log(0.82);
    if (best >= 0.45) return log(0.55);
    return log(0.02);
  }

  if (state === "DEPARTMENT") {
    if (departmentDict.has(token)) return log(0.9);
    const best = bestDictNgramScore(token, departmentDict);
    if (best >= 0.7) return log(0.8);
    if (best >= 0.45) return log(0.5);
    return log(0.02);
  }

  if (state === "NAME") {
    if (nameTokens.has(token)) return log(0.88);
    if (/^(dr|bs|doctor|bacsi)$/.test(token)) return log(0.7);
    if (token.length >= 2 && !specialtyDict.has(token) && !departmentDict.has(token)) return log(0.45);
    return log(0.05);
  }

  if (/^(dr|bs|doctor|bacsi|tim|mat|da)$/.test(token)) return log(0.4);
  if (specialtyDict.has(token) || departmentDict.has(token)) return log(0.08);
  return log(0.35);
}

const TRANS = [
  [-1.2, -0.4, -0.8, -0.8, -1.0],
  [-0.5, -0.3, -1.5, -1.5, -0.8],
  [-0.6, -0.2, -2.0, -2.0, -0.7],
  [-0.5, -2.0, -0.2, -1.8, -0.6],
  [-0.5, -2.0, -1.8, -0.2, -0.6],
];

function viterbi(tokens, dicts) {
  if (tokens.length === 0) return [];

  const T = tokens.length;
  const dp = Array.from({ length: T }, () => Array(S).fill(LOG_EPS));
  const back = Array.from({ length: T }, () => Array(S).fill(0));

  for (let st = 0; st < S; st++) {
    dp[0][st] = TRANS[0][st + 1] + emissionLogProb(tokens[0], STATES[st], dicts);
  }

  for (let t = 1; t < T; t++) {
    for (let st = 0; st < S; st++) {
      let best = LOG_EPS;
      let prev = 0;
      for (let p = 0; p < S; p++) {
        const score = dp[t - 1][p] + TRANS[p + 1][st + 1] + emissionLogProb(tokens[t], STATES[st], dicts);
        if (score > best) {
          best = score;
          prev = p;
        }
      }
      dp[t][st] = best;
      back[t][st] = prev;
    }
  }

  let lastState = 0;
  let bestFinal = dp[T - 1][0];
  for (let st = 1; st < S; st++) {
    if (dp[T - 1][st] > bestFinal) {
      bestFinal = dp[T - 1][st];
      lastState = st;
    }
  }

  const path = Array(T);
  path[T - 1] = lastState;
  for (let t = T - 1; t > 0; t--) {
    lastState = back[t][lastState];
    path[t - 1] = lastState;
  }

  return path.map((idx) => STATES[idx]);
}

function collectSpans(tokens, labels) {
  const spans = { NAME: [], SPECIALTY: [], DEPARTMENT: [], OTHER: [] };
  tokens.forEach((token, i) => {
    spans[labels[i]].push(token);
  });
  return {
    nameText: spans.NAME.join(" "),
    specialtyText: spans.SPECIALTY.join(" "),
    departmentText: spans.DEPARTMENT.join(" "),
    otherText: spans.OTHER.join(" "),
    tokens,
    labels,
  };
}

export function extractQueryEntities(query, { specialties = [], departments = [], doctorNames = [] } = {}) {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return {
      nameText: "",
      specialtyId: null,
      departmentId: null,
      specialtyName: null,
      departmentName: null,
      specialtyMatchPercent: null,
      departmentMatchPercent: null,
      tokens: [],
      labels: [],
      engine: "HMM+NGram+BM25",
    };
  }

  const specialtyDict = buildDictionary(
    specialties.map((s) => ({ id: s._id?.toString(), label: s.name, ref: s }))
  );
  const departmentDict = buildDictionary(
    departments.map((d) => ({ id: d._id?.toString(), label: d.name, ref: d }))
  );
  const nameTokens = new Set();
  for (const name of doctorNames) {
    for (const part of normalizeText(name).split(" ")) {
      if (part.length >= 2) nameTokens.add(part);
    }
  }

  const dicts = { specialtyDict, departmentDict, nameTokens };
  const labels = viterbi(tokens, dicts);
  const spans = collectSpans(tokens, labels);

  const spanSpecialty = matchSpecialty(spans.specialtyText, specialties, { minScore: 0.42 });
  const spanDepartment = matchDepartment(spans.departmentText, departments, { minScore: 0.42 });
  const fullSpecialty = matchSpecialty(query, specialties);
  const fullDepartment = matchDepartment(query, departments);

  const specialtyMatch =
    spanSpecialty && (!fullSpecialty || spanSpecialty.score >= fullSpecialty.score * 0.9)
      ? spanSpecialty
      : fullSpecialty;
  const departmentMatch =
    spanDepartment && (!fullDepartment || spanDepartment.score >= fullDepartment.score * 0.9)
      ? spanDepartment
      : fullDepartment;

  let nameText = spans.nameText;
  if (!nameText && !specialtyMatch && !departmentMatch) {
    nameText = tokens.filter((t) => !/^(dr|bs|doctor|bacsi)$/.test(t)).join(" ");
  }

  return {
    nameText,
    specialtyId: specialtyMatch?.id || null,
    departmentId: departmentMatch?.id || null,
    specialtyName: specialtyMatch?.name || null,
    departmentName: departmentMatch?.name || null,
    specialtyMatchPercent: specialtyMatch?.matchPercent ?? null,
    departmentMatchPercent: departmentMatch?.matchPercent ?? null,
    specialtyAlternatives: specialtyMatch?.alternatives || [],
    departmentAlternatives: departmentMatch?.alternatives || [],
    tokens,
    labels,
    engine: "HMM+NGram+BM25",
  };
}
