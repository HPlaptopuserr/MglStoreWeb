import assert from "node:assert/strict";
import test from "node:test";
import { classifyReceiptSearch } from "./receipt-product-search";

test("numeric barcode remains a string with its leading zeros", () => {
  assert.equal(classifyReceiptSearch(" 0012345678905 "), "barcode");
});

test("internal SKUs and names choose the correct registration field", () => {
  assert.equal(classifyReceiptSearch("WMS-ABC123"), "sku");
  assert.equal(classifyReceiptSearch("rice_25"), "sku");
  assert.equal(classifyReceiptSearch("Гэрийн боорцог"), "name");
  assert.equal(classifyReceiptSearch("Milk 1L"), "name");
  assert.equal(classifyReceiptSearch(""), "name");
});
