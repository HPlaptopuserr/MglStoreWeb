import assert from "node:assert/strict";
import test from "node:test";
import {
  parseBarcodeAliases,
  mergeBarcodeAliases,
} from "./product-barcode-aliases";
import {
  buildProductSearchWhere,
  scoreProductForSearch,
} from "./product-discovery.service";
test("preserves leading zeroes and rejects invalid barcodes", () => {
  assert.deepEqual(parseBarcodeAliases([" 00123 ", "00123"]), ["00123"]);
  for (const value of [null, [], [""], [123], ["12 34"], ["x".repeat(101)]])
    assert.equal(parseBarcodeAliases(value), null);
});
test("adding codes preserves primary and existing aliases and is idempotent", () => {
  assert.deepEqual(
    mergeBarcodeAliases("old", ["first"], ["new", "old", "new"]),
    ["first", "new"],
  );
  assert.deepEqual(mergeBarcodeAliases("old", ["first", "new"], ["new"]), [
    "first",
    "new",
  ]);
  assert.throws(() =>
    mergeBarcodeAliases(
      null,
      Array.from({ length: 20 }, (_, i) => String(i)),
      ["extra"],
    ),
  );
});
test("warehouse search includes exact alias lookup", () => {
  assert.ok(
    buildProductSearchWhere("001234").some(
      (clause) => "barcodeAliases" in clause,
    ),
  );
});

test("additional barcode matches the same product in POS search", () => {
  const product = {
    id: "pepsi",
    name: "Pepsi 0.33l",
    barcode: "001111",
    barcodeAliases: ["009999"],
  };
  assert.ok(scoreProductForSearch(product, "009999") > 0);
  assert.ok(scoreProductForSearch(product, "001111") > 0);
});
