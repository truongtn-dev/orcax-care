import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseInsuranceCardText, runInsuranceCardOcr } from "../services/insuranceCardOcr.service.js";

describe("Insurance card OCR text parsing", () => {
  test("extracts policy number from labeled Vietnamese card text", () => {
    const parsed = parseInsuranceCardText(`
      BAO VIET INSURANCE
      So the: BV-2026-889944
      Ho va ten: Nguyen Van A
      Hieu luc: 01/01/2026 - 31/12/2026
    `);

    assert.equal(parsed.policyNumber, "BV-2026-889944");
    assert.equal(parsed.holderName, "Nguyen Van A");
    assert.equal(parsed.providerName, "Bảo Việt");
    assert.equal(parsed.validFrom, "2026-01-01");
    assert.equal(parsed.validTo, "2026-12-31");
  });

  test("extracts policy number from English labels", () => {
    const parsed = parseInsuranceCardText(`
      Prudential Vietnam
      Policy No: PVD-77881234
      Policy holder: Tran Thi B
    `);

    assert.equal(parsed.policyNumber, "PVD-77881234");
    assert.equal(parsed.holderName, "Tran Thi B");
    assert.equal(parsed.providerName, "Prudential");
  });

  test("returns empty policy number when OCR text has no usable match", () => {
    const parsed = parseInsuranceCardText("blurry image with no numbers");
    assert.equal(parsed.policyNumber, "");
  });

  test("rejects invalid image data uri in live OCR mode", async () => {
    const previous = process.env.INSURANCE_OCR_STUB;
    process.env.INSURANCE_OCR_STUB = "false";
    try {
      const result = await runInsuranceCardOcr({ image: "not-an-image" });
      assert.equal(result.status, 400);
      assert.equal(result.body.message, "Only JPEG, PNG, WebP, or GIF images are allowed");
    } finally {
      if (previous === undefined) {
        delete process.env.INSURANCE_OCR_STUB;
      } else {
        process.env.INSURANCE_OCR_STUB = previous;
      }
    }
  });
});
