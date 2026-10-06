import test from "node:test";
import assert from "node:assert/strict";
import { barcodeIndex, parseCount, storedQuantity } from "./stocktake-model";
import type { StocktakeLineDto } from "@mgl/types";
test("physical counts preserve grams, reject fractional pieces and display signed variance", () => {
  assert.equal(parseCount("1.125", "кг"), 1125);
  assert.equal(parseCount("0", "pcs"), 0);
  assert.equal(parseCount("", "pcs"), null);
  assert.throws(() => parseCount("1.2", "pcs"));
  assert.throws(() => parseCount("1.0001", "kg"));
  assert.throws(() => parseCount("-1", "kg"));
  assert.equal(storedQuantity(-1250, "kg"), -1.25);
});
test("scanner indexes aliases without silently selecting ambiguous products", () => {
  const row: StocktakeLineDto = {
    id: "1",
    productId: "p1",
    name: "One",
    barcode: "00123",
    barcodeAliases: ["00123", "alias"],
    unit: "pcs",
    counted: null,
    expected: 3,
    note: "",
    countedAt: null,
    countedById: null,
  };
  const index = barcodeIndex([
    row,
    {
      ...row,
      id: "2",
      productId: "p2",
      barcode: "002",
      barcodeAliases: ["alias"],
    },
  ]);
  assert.equal(index.get("00123")?.length, 1);
  assert.equal(index.get("alias")?.length, 2);
  assert.equal(index.get("123"), undefined);
});
