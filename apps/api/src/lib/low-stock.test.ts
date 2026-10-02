import assert from "node:assert/strict";
import test from "node:test";
import { isLowStock, normalizeLowStockThreshold } from "./low-stock";

test("low stock threshold defaults to five units", () => {
  assert.equal(normalizeLowStockThreshold(undefined, "pcs"), 5);
});

test("piece thresholds must be non-negative whole numbers", () => {
  assert.equal(normalizeLowStockThreshold(12, "pcs"), 12);
  assert.equal(normalizeLowStockThreshold(1.5, "pcs"), undefined);
  assert.equal(normalizeLowStockThreshold(-1, "pcs"), undefined);
});

test("kilogram thresholds support three decimal places", () => {
  assert.equal(normalizeLowStockThreshold(2.375, "kg"), 2.375);
  assert.equal(normalizeLowStockThreshold(2.3755, "kg"), undefined);
});

test("stock becomes low when it reaches the configured threshold", () => {
  assert.equal(isLowStock(6, 5), false);
  assert.equal(isLowStock(5, 5), true);
  assert.equal(isLowStock(0, 0), true);
});
