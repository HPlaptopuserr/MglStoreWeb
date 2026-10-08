import test from "node:test";
import assert from "node:assert/strict";
import {
  barcodeIndex,
  parseCount,
  storedQuantity,
  matchesStocktakeQuery,
  newProductSeed,
  stocktakeLineBarcode,
  stocktakeLineName,
} from "./stocktake-model";
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

test("unified search matches names, barcodes and aliases with the same rules", () => {
  const row: StocktakeLineDto = {
    id: "1",
    productId: "p",
    name: "Сүү",
    barcode: "00123",
    barcodeAliases: ["00999"],
    unit: "pcs",
    expected: 0,
    counted: null,
    note: "",
    countedAt: null,
    countedById: null,
  };
  assert.equal(matchesStocktakeQuery(row, " СҮҮ "), true);
  assert.equal(matchesStocktakeQuery(row, "00123"), true);
  assert.equal(matchesStocktakeQuery(row, "00999"), true);
  assert.equal(matchesStocktakeQuery(row, "талх"), false);
  assert.deepEqual(newProductSeed(" 00123 "), { name: "", barcode: "00123" });
  assert.deepEqual(newProductSeed(" Сүү "), { name: "Сүү", barcode: "" });
});

test("stocktake search uses the current catalog name, SKU and barcode", () => {
  const row: StocktakeLineDto = {
    id: "1",
    productId: "p",
    name: "CHB-MGL-001",
    barcode: "old-barcode",
    barcodeAliases: [],
    unit: "pcs",
    expected: 0,
    counted: null,
    note: "",
    countedAt: null,
    countedById: null,
    product: {
      name: "Монгол сүү 1 литр",
      sku: "SKU-MGL-001",
      barcode: "865000000001",
      barcodeAliases: ["865000000099"],
    },
  };

  assert.equal(matchesStocktakeQuery(row, "suu"), true);
  assert.equal(matchesStocktakeQuery(row, "SKU-MGL"), true);
  assert.equal(matchesStocktakeQuery(row, "865000000099"), true);
  assert.equal(stocktakeLineName(row), "Монгол сүү 1 литр");
  assert.equal(stocktakeLineBarcode(row), "865000000001");
});
