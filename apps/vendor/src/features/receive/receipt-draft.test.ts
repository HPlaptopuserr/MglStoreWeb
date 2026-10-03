import assert from "node:assert/strict";
import test from "node:test";
import { hasReceiptDraft, parseReceiptDraft, type ReceiptDraft } from "./receipt-draft";
const draft: ReceiptDraft = {
  selectedRegisterId: "register-1", supplierName: "Нийлүүлэгч", supplierRegisterNo: "00123",
  documentNo: "INV-1", note: "Ноорог", search: "", markup: "20",
  lines: [{ id: "lot-1", product: { id: "p1", name: "Задгай", stock: 0, unit: "kg", barcode: "001234" },
    quantity: 0.125, unitCost: "1234.56", salePrice: "1500", manualPrice: true, batchNumber: "B1", expiryDate: "2027-01-01" }],
};
test("refresh restores fractional weight, prices, lot metadata and supplier exactly", () => {
  assert.deepEqual(parseReceiptDraft(JSON.stringify({ version: 1, draft })), draft);
});
test("malformed and incompatible drafts do not restore", () => {
  assert.equal(parseReceiptDraft("broken"), null);
  assert.equal(parseReceiptDraft(JSON.stringify({ version: 2, draft })), null);
  assert.equal(parseReceiptDraft(JSON.stringify({ version: 1, draft: { ...draft, lines: [{ id: "bad" }] } })), null);
});
test("an empty receipt is removed but supplier-only and item drafts are retained", () => {
  assert.equal(hasReceiptDraft(draft), true);
  const blank = { ...draft, lines: [], supplierName: "", supplierRegisterNo: "", documentNo: "", note: "", search: "" };
  assert.equal(hasReceiptDraft(blank), false);
  assert.equal(hasReceiptDraft({ ...blank, supplierName: "Нийлүүлэгч" }), true);
});
