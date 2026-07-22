import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeMasterBarcode,
  normalizeMasterName,
} from "./master-product.service";

test("normalizes shared product names without losing Mongolian letters", () => {
  assert.equal(normalizeMasterName("  Coca-Cola  500 мл "), "coca cola 500 мл");
  assert.equal(normalizeMasterName("СҮҮ, 1Л"), "сүү 1л");
});

test("normalizes safe barcode values and rejects weak identifiers", () => {
  assert.equal(normalizeMasterBarcode("  8 801234 567890 "), "8801234567890");
  assert.equal(normalizeMasterBarcode("12"), null);
  assert.equal(normalizeMasterBarcode(null), null);
});
