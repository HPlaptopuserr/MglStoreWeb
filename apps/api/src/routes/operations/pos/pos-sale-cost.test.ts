import assert from "node:assert/strict";
import test from "node:test";
import { resolvePosSaleLineCost } from "./pos-sale-cost.js";

test("uses the weighted cost of multiple receipt lots", () => {
  const result = resolvePosSaleLineCost({
    allocatedCost: 10 * 3_000 + 5 * 3_200,
    totalProductQuantity: 15,
    lineQuantity: 15,
    fallbackUnitCost: 2_900,
  });

  assert.equal(result.unitCost, 3_066.6666666666665);
  assert.equal(result.costTotal, 46_000);
});

test("uses the legacy product cost when lot cost is unknown", () => {
  assert.deepEqual(
    resolvePosSaleLineCost({
      allocatedCost: null,
      totalProductQuantity: 4,
      lineQuantity: 2,
      fallbackUnitCost: 2_900,
    }),
    { unitCost: 2_900, costTotal: 5_800 },
  );
});

test("keeps cost unknown when neither lot nor legacy cost exists", () => {
  assert.deepEqual(
    resolvePosSaleLineCost({
      allocatedCost: null,
      totalProductQuantity: 1,
      lineQuantity: 1,
      fallbackUnitCost: null,
    }),
    { unitCost: null, costTotal: null },
  );
});
