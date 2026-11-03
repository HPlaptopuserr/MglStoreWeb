import test from "node:test";
import assert from "node:assert/strict";
import {
  editReceiptLine,
  initialReceiptLine,
  isReceiptLineValid,
  markupPrice,
  receiptMoney,
} from "./transfer-receipt-model";
import type { TransferLine } from "./transfer-types";
const row: TransferLine = {
  id: "row",
  name: "Бараа",
  sku: "SKU",
  barcode: "1234",
  quantity: 20,
  unitCost: "1000",
  salePrice: null,
  targetProductId: null,
  matches: [],
};
test("receipt starts with sent count but still needs explicit row confirmation", () => {
  const line = initialReceiptLine(row);
  assert.equal(line.quantity, "20");
  assert.equal(line.confirmed, false);
  assert.equal(line.salePrice, "1000");
  assert.equal(isReceiptLineValid(row, line), true);
  assert.equal(isReceiptLineValid(row, { ...line, quantity: "19" }), false);
  assert.equal(isReceiptLineValid(row, { ...line, salePrice: "" }), false);
});
test("markup is based on sender selling price, rounds cents and handles invalid inputs", () => {
  for (const percent of [10, 20, 30, 40])
    assert.equal(markupPrice("1000", percent), String(1000 + percent * 10));
  assert.equal(markupPrice("19.99", 10), "21.99");
  assert.equal(markupPrice(0, 20), "0");
  assert.equal(markupPrice(null, 20), "");
  assert.equal(markupPrice(100, -10), "");
  assert.equal(markupPrice(100, NaN), "");
  assert.equal(markupPrice(1e12, 10), "");
});
test("editing a confirmed quantity, price or product requires confirmation again", () => {
  const confirmed = { ...initialReceiptLine(row), confirmed: true };
  for (const change of [
    { quantity: "19" },
    { salePrice: "1200" },
    { targetProductId: "existing" },
  ])
    assert.equal(editReceiptLine(confirmed, change).confirmed, false);
});

test("missing API prices never render NaN or become zero-priced receipts", () => {
  for (const value of [undefined, null, "", "invalid", NaN]) {
    assert.equal(receiptMoney(value), "—");
    assert.equal(markupPrice(value, 20), "");
  }
});
