import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { calculateInsuranceFee, isInsuranceCardEligibleOnDate } from "../utils/insuranceFee.js";

describe("insurance fee (UC-7.3 bảo lãnh)", () => {
  const visitDate = new Date("2026-06-18T00:00:00");

  test("applies coverage percent as hospital guarantee discount", () => {
    const card = {
      isActive: true,
      coveragePercent: 30,
      validFrom: new Date("2026-01-01"),
      validTo: new Date("2026-12-31"),
    };

    const summary = calculateInsuranceFee(200000, card, visitDate);
    assert.equal(summary.baseFee, 200000);
    assert.equal(summary.coveragePercent, 30);
    assert.equal(summary.discountAmount, 60000);
    assert.equal(summary.finalFee, 140000);
    assert.equal(summary.eligible, true);
  });

  test("excludes expired cards on visit date (BR-16)", () => {
    const card = {
      isActive: true,
      coveragePercent: 50,
      validFrom: new Date("2025-01-01"),
      validTo: new Date("2026-01-01"),
    };

    assert.equal(isInsuranceCardEligibleOnDate(card, visitDate), false);
    const summary = calculateInsuranceFee(200000, card, visitDate);
    assert.equal(summary.finalFee, 200000);
    assert.equal(summary.discountAmount, 0);
    assert.equal(summary.eligible, false);
  });

  test("charges full fee when no card is selected", () => {
    const summary = calculateInsuranceFee(200000, null, visitDate);
    assert.equal(summary.finalFee, 200000);
    assert.equal(summary.discountAmount, 0);
  });
});
