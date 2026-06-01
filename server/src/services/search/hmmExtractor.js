/**
 * HMM-based query extractor — Viterbi decoding for NAME / SPECIALTY / DEPARTMENT / OTHER.
 */

import { normalizeText } from "./ngramEngine.js";

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

function emissionLogProb(token, state, dicts) {
  const { specialtyDict, departmentDict, nameTokens } = dicts;

  if (state === "SPECIALTY") {
    if (specialtyDict.has(token)) return log(0.92);
    if ([...specialtyDict.keys()].some((k) => k.includes(token) || token.includes(k))) return log(0.55);
    return log(0.02);
  }

  if (state === "DEPARTMENT") {
    if (departmentDict.has(token)) return log(0.9);
    if ([...departmentDict.keys()].some((k) => k.includes(token) || token.includes(k))) return log(0.5);
    return log(0.02);
  }

  if (state === "NAME") {
    if (nameTokens.has(token)) return log(0.88);
    if (/^(dr|bs|doctor|bacsi)$/.test(token)) return log(0.7);
    if (token.length >= 2 && !specialtyDict.has(token) && !departmentDict.has(token)) return log(0.45);
    return log(0.05);
  }

  // OTHER
  if (/^(dr|bs|doctor|bacsi|tim|mat|da)$/.test(token)) return log(0.4);
  if (specialtyDict.has(token) || departmentDict.has(token)) return log(0.08);
  return log(0.35);
}

// Transition log-probabilities (hand-tuned for medical search queries)
const TRANS = [
  [-1.2, -0.4, -0.8, -0.8, -1.0], // from START
  [-0.5, -0.3, -1.5, -1.5, -0.8], // from OTHER
  [-0.6, -0.2, -2.0, -2.0, -0.7], // from NAME
  [-0.5, -2.0, -0.2, -1.8, -0.6], // from SPECIALTY
  [-0.5, -2.0, -1.8, -0.2, -0.6], // from DEPARTMENT
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

function resolveEntity(text, dict) {
  if (!text) return null;
  const norm = normalizeText(text);
  if (dict.has(norm)) return dict.get(norm);

  let best = null;
  let bestScore = 0;
  for (const [key, value] of dict.entries()) {
    if (key.includes(norm) || norm.includes(key)) {
      const score = Math.min(key.length, norm.length) / Math.max(key.length, norm.length);
      if (score > bestScore) {
        bestScore = score;
        best = value;
      }
    }
  }
  return bestScore >= 0.45 ? best : null;
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
      tokens: [],
      labels: [],
      engine: "HMM",
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

  const specialtyMatch = resolveEntity(spans.specialtyText || spans.otherText, specialtyDict);
  const departmentMatch = resolveEntity(spans.departmentText || spans.otherText, departmentDict);

  let nameText = spans.nameText;
  if (!nameText && !specialtyMatch && !departmentMatch) {
    nameText = tokens.filter((t) => !/^(dr|bs|doctor|bacsi)$/.test(t)).join(" ");
  }

  return {
    nameText,
    specialtyId: specialtyMatch?.id || null,
    departmentId: departmentMatch?.id || null,
    specialtyName: specialtyMatch?.ref?.name || null,
    departmentName: departmentMatch?.ref?.name || null,
    tokens,
    labels,
    engine: "HMM+NGram",
  };
}
