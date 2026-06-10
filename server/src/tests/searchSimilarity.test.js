import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { bm25Score, idf } from "../services/search/bm25.js";
import { matchDepartment, matchSpecialty } from "../services/search/catalogMatcher.js";
import { buildInvertedIndex } from "../services/search/invertedIndex.js";
import { extractQueryEntities } from "../services/search/hmmExtractor.js";
import { charNgrams, ngramTextScore, qgramDistance, toMatchPercent } from "../services/search/ngramEngine.js";
import { buildNGramIndex } from "../services/search/ngramIndex.js";
import { expandQuery } from "../services/search/queryExpansion.js";
import { rankDoctors } from "../services/search/retrievalEngine.js";

const specialties = [
  { _id: "1", code: "PED", name: "Pediatrics", description: "Children's health" },
  { _id: "2", code: "CARD", name: "Cardiology", description: "Heart and cardiovascular system" },
  { _id: "3", code: "PHAR", name: "Pharmacy", description: "Medicines and dispensing" },
];

const departments = [
  { _id: "10", name: "Internal Medicine" },
  { _id: "11", name: "Pediatrics Ward" },
  { _id: "12", name: "Pharmacy" },
];

describe("search engine", () => {
  test("padded character q-grams include boundary markers", () => {
    const grams = charNgrams("pharmacy", 3);
    assert.ok(grams.has("$ph"));
    assert.ok(grams.has("cy$"));
  });

  test("q-gram distance is lower for typos than unrelated words", () => {
    const typoDistance = qgramDistance("phamarcy", "pharmacy", 3);
    const unrelatedDistance = qgramDistance("phamarcy", "cardiology", 3);
    assert.ok(typoDistance < unrelatedDistance);
  });

  test("N-gram inverted index scores closer document higher", () => {
    const doctors = [
      {
        _id: "a",
        fullName: "Dr. Nguyen Van An",
        specialty: { name: "Cardiology" },
        department: { name: "Internal Medicine" },
        bio: "Heart and cardiovascular specialist",
      },
      {
        _id: "b",
        fullName: "Dr. Le Minh Cuong",
        specialty: { name: "Pediatrics" },
        department: { name: "Pediatrics Ward" },
        bio: "Pediatrician",
      },
    ];

    const ngramIndex = buildNGramIndex(doctors);
    const heartScore = ngramIndex.scoreDocument("heart cardiology", "a");
    const pedScore = ngramIndex.scoreDocument("heart cardiology", "b");
    assert.ok(heartScore > pedScore);
    assert.ok(ngramIndex.retrieveCandidates("heart cardiology").includes("a"));
  });

  test("N-gram q-gram score is non-zero for near-miss phrases", () => {
    const score = ngramTextScore("internal medical", "Internal Medicine");
    assert.ok(score >= 0.4, `expected meaningful N-gram score, got ${score}`);
    assert.equal(toMatchPercent(score), Math.round(score * 100));
  });

  test("N-gram q-gram score detects single-word typos", () => {
    const score = ngramTextScore("phamarcy", "pharmacy");
    assert.ok(score >= 0.33, `expected typo N-gram score, got ${score}`);
  });

  test("query expansion maps nhi khoa to pediatrics terms", () => {
    const expanded = expandQuery("nhi khoa", { specialties, departments });
    assert.match(expanded, /pediatrics/);
  });

  test("unrelated query does not expand to pediatrics", () => {
    const expanded = expandQuery("do choi cho be", { specialties, departments });
    assert.doesNotMatch(expanded, /pediatrics/);
  });

  test("catalog matcher maps nhi khoa to Pediatrics", () => {
    const match = matchSpecialty("nhi khoa", specialties);
    assert.ok(match, "expected a specialty match");
    assert.equal(match.name, "Pediatrics");
    assert.ok(match.matchPercent >= 70, `expected >= 70%, got ${match.matchPercent}%`);
  });

  test("catalog matcher does not map do choi cho be to any specialty", () => {
    const match = matchSpecialty("do choi cho be", specialties);
    assert.equal(match, null);
  });

  test("catalog matcher maps internal medical to Internal Medicine department", () => {
    const match = matchDepartment("internal medical", departments);
    assert.ok(match, "expected a department match");
    assert.equal(match.name, "Internal Medicine");
    assert.ok(match.matchPercent >= 55, `expected >= 55%, got ${match.matchPercent}%`);
  });

  test("catalog matcher maps phamarcy to Pharmacy department", () => {
    const match = matchDepartment("phamarcy", departments);
    assert.ok(match, "expected a department match");
    assert.equal(match.name, "Pharmacy");
    assert.ok(match.matchPercent >= 55, `expected >= 55%, got ${match.matchPercent}%`);
  });

  test("inverted index + BM25 ranks cardiology doctor for heart query", () => {
    const doctors = [
      {
        _id: "a",
        fullName: "Dr. Nguyen Van An",
        specialty: { name: "Cardiology" },
        department: { name: "Internal Medicine" },
        bio: "Heart specialist",
      },
      {
        _id: "b",
        fullName: "Dr. Le Minh Cuong",
        specialty: { name: "Pediatrics" },
        department: { name: "Pediatrics Ward" },
        bio: "Pediatrician",
      },
    ];

    const index = buildInvertedIndex(doctors);
    assert.ok(idf("heart", index) > 0);
    const cardScore = bm25Score(["heart"], "a", index);
    const pedScore = bm25Score(["heart"], "b", index);
    assert.ok(cardScore > pedScore);
  });

  test("extractQueryEntities maps nhi khoa to Pediatrics", () => {
    const extracted = extractQueryEntities("nhi khoa", { specialties, departments, doctorNames: [] });
    assert.equal(extracted.specialtyName, "Pediatrics");
    assert.ok(extracted.specialtyMatchPercent >= 70);
  });

  test("rankDoctors orders pediatrics doctor for nhi khoa", () => {
    const doctors = [
      {
        _id: "1",
        fullName: "Dr. Le Minh Cuong",
        specialty: { name: "Pediatrics" },
        department: { name: "Pediatrics Ward" },
        bio: "Pediatrician",
      },
      {
        _id: "2",
        fullName: "Dr. Nguyen Van An",
        specialty: { name: "Cardiology" },
        department: { name: "Internal Medicine" },
        bio: "Heart specialist",
      },
    ];

    const ranked = rankDoctors(doctors, "nhi khoa", { specialties, departments });
    assert.equal(ranked[0].fullName, "Dr. Le Minh Cuong");
    assert.ok(ranked[0]._matchPercent > ranked[1]._matchPercent);
  });
});
