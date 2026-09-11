import assert from "node:assert/strict";
import test from "node:test";

import {
  fromPosStoredStockQuantity,
  normalizePosMeasureUnit,
  roundPosQuantity,
  toPosStoredStockQuantity,
} from "@mgl/types";

test("weighted POS quantities use kilograms in the UI and grams in integer stock", () => {
  assert.equal(toPosStoredStockQuantity(0.735, "kg"), 735);
  assert.equal(toPosStoredStockQuantity(12.35, "кг"), 12_350);
  assert.equal(fromPosStoredStockQuantity(735, "kg"), 0.735);
  assert.equal(fromPosStoredStockQuantity(12_350, "kg"), 12.35);
});

test("weighted POS quantities are rounded to one gram", () => {
  assert.equal(roundPosQuantity(0.7354, "kg"), 0.735);
  assert.equal(roundPosQuantity(0.7356, "kg"), 0.736);
});

test("piece products retain whole-number stock behavior", () => {
  assert.equal(normalizePosMeasureUnit(null), "pcs");
  assert.equal(toPosStoredStockQuantity(7, "pcs"), 7);
  assert.equal(fromPosStoredStockQuantity(7, "pcs"), 7);
});
