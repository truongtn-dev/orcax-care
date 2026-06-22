import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DEFAULT_CONSULTATION_FEE_VND } from "../config/booking.js";
import {
  parseConsultationFeeInput,
  resolveConsultationFee,
  MAX_CONSULTATION_FEE_VND,
} from "../utils/consultationFee.js";

describe("consultation fee utilities", () => {
  test("resolveConsultationFee uses doctor fee when set", () => {
    assert.equal(resolveConsultationFee({ consultationFee: 250000 }), 250000);
  });

  test("resolveConsultationFee falls back to default when missing", () => {
    assert.equal(resolveConsultationFee({}), DEFAULT_CONSULTATION_FEE_VND);
    assert.equal(resolveConsultationFee(null), DEFAULT_CONSULTATION_FEE_VND);
  });

  test("parseConsultationFeeInput validates and normalizes", () => {
    assert.deepEqual(parseConsultationFeeInput("250,000"), { value: 250000 });
    assert.deepEqual(parseConsultationFeeInput(""), { value: DEFAULT_CONSULTATION_FEE_VND });
    assert.deepEqual(parseConsultationFeeInput(0), { value: 0 });
    assert.ok(parseConsultationFeeInput(MAX_CONSULTATION_FEE_VND + 1).error);
  });
});
