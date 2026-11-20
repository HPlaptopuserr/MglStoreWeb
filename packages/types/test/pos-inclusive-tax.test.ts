import assert from "node:assert/strict";
import { test } from "node:test";
import { calculatePosInclusiveVat } from "../src/domain/pos-inclusive-tax";

test("VAT excludes the city tax portion of a tax-inclusive sale", () => {
  assert.deepEqual(calculatePosInclusiveVat([
    { totalAmount: 1111, totalCityTax: 11 },
  ], true, "VAT_ABLE"), { totalVAT: 100, itemVAT: [100] });
});

test("sub-receipt VAT rounds independently from its items", () => {
  assert.deepEqual(calculatePosInclusiveVat([
    { totalAmount: 0.06, totalCityTax: 0 },
    { totalAmount: 0.06, totalCityTax: 0 },
  ], true, "VAT_ABLE"), { totalVAT: 0.01, itemVAT: [0.01, 0.01] });
});

test("exempt, zero-rated and non-VAT receipts preserve zero VAT", () => {
  for (const type of ["VAT_FREE", "VAT_ZERO", "NOT_VAT"]) {
    assert.deepEqual(calculatePosInclusiveVat([{ totalAmount: 1100, totalCityTax: 0 }], true, type), { totalVAT: 0, itemVAT: [0] });
  }
  assert.deepEqual(calculatePosInclusiveVat([{ totalAmount: 1100, totalCityTax: 0 }], false, "VAT_ABLE"), { totalVAT: 0, itemVAT: [0] });
});

test("invalid city tax cannot create a negative VAT base", () => {
  assert.throws(() => calculatePosInclusiveVat([{ totalAmount: 10, totalCityTax: 11 }], true, "VAT_ABLE"));
});
