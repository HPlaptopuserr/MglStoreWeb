import assert from "node:assert/strict";
import { test } from "node:test";
import { calculatePosLineAmounts } from "../src/domain/pos-line-amounts";

test("weighted half cents round per payable line before the basket is summed", () => {
  const line = calculatePosLineAmounts({ unitPrice: 1.5, qty: 0.01 });
  assert.deepEqual(line, { subTotal: 0.02, discountTotal: 0, lineTotal: 0.02 });
  assert.equal(line.lineTotal * 2, 0.04);
});
test("unit discounts multiply by quantity and preserve rounded line arithmetic", () => {
  assert.deepEqual(calculatePosLineAmounts({ unitPrice: 1.5, qty: 0.01, discountAmount: 0.5 }), { subTotal: 0.02, discountTotal: 0.01, lineTotal: 0.01 });
  assert.deepEqual(calculatePosLineAmounts({ unitPrice: 100, qty: 3, discountAmount: 10 }), { subTotal: 300, discountTotal: 30, lineTotal: 270 });
});
