import test from "node:test";
import assert from "node:assert/strict";
import {
  canCorrectReceipt,
  parseReceiptCorrection,
  receiptStoredQuantity,
} from "./receipt-correction.policy";
const valid = {
  version: 1,
  reason: "Invoice checked",
  supplierName: "Supplier",
  items: [{ id: "i", quantity: 3, unitCost: 100 }],
};
test("only owner of the receipt organization or platform admin may correct", () => {
  assert.equal(
    canCorrectReceipt(
      { role: "USER", orgRole: "OWNER", organizationId: "a" },
      "a",
    ),
    true,
  );
  for (const orgRole of ["CASHIER", "STAFF", "ADMIN", null])
    assert.equal(
      canCorrectReceipt({ role: "USER", orgRole, organizationId: "a" }, "a"),
      false,
    );
  assert.equal(
    canCorrectReceipt(
      { role: "USER", orgRole: "OWNER", organizationId: "b" },
      "a",
    ),
    false,
  );
});
test("correction rejects duplicate rows, missing reason, invalid money and stale price payload", () => {
  assert.equal(parseReceiptCorrection(valid).items[0]?.unitCost, 100);
  for (const input of [
    { ...valid, reason: "" },
    { ...valid, items: [...valid.items, ...valid.items] },
    { ...valid, items: [{ ...valid.items[0], unitCost: -1 }] },
    { ...valid, items: [{ ...valid.items[0], salePrice: 200 }] },
    { ...valid, items: [{ ...valid.items[0], unitCost: 1.234 }] },
  ])
    assert.throws(() => parseReceiptCorrection(input));
});
test("receipt quantities preserve weight precision and reject fractional pieces", () => {
  assert.equal(receiptStoredQuantity(1.125, "kg"), 1125);
  assert.throws(() => receiptStoredQuantity(1.5, "pcs"));
  assert.throws(() => receiptStoredQuantity(1.0001, "kg"));
});
