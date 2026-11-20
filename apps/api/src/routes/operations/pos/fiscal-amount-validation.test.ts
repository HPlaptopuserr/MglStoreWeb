import assert from "node:assert/strict";
import test from "node:test";
import { fiscalAmountError, fiscalIdentityConflict } from "./fiscal-amount-validation";

test("attachment retry cannot silently discard a different fiscal receipt", () => {
  const existing = { ebarimtBillId: "bill-1", ebarimtReceiptId: "receipt-1" };
  assert.equal(fiscalIdentityConflict({ billId: "bill-1", receiptId: "receipt-1" }, existing), false);
  assert.equal(fiscalIdentityConflict({ status: "FAILED" }, existing), false);
  assert.equal(fiscalIdentityConflict({ billId: "bill-2" }, existing), true);
  assert.equal(fiscalIdentityConflict({ receiptId: "receipt-2" }, existing), true);
});

test("fiscal totals accept non-VAT merchants and net cash plus split bank amounts", () => {
  assert.equal(fiscalAmountError({ totalAmount: "100.25", totalVAT: 0, totalCityTax: 0,
    payments: [{ paidAmount: 50 }, { paidAmount: 30 }, { paidAmount: 20.25 }] }, 100.25), null);
  assert.equal(fiscalAmountError({ totalAmount: 110, totalVAT: 10 }, 110), null);
  assert.equal(fiscalAmountError({ id: "legacy-without-totals" }, 110), null);
});

test("a different sale, tender including change, invalid money and extra tax cannot attach as success", () => {
  for (const payload of [
    { totalAmount: 101 }, { totalAmount: null }, { totalAmount: true },
    { totalAmount: "" }, { totalAmount: 100.001 }, { totalAmount: Infinity },
    { totalAmount: 100, totalVAT: 101 }, { totalAmount: 100, totalVAT: -1 },
    { totalAmount: 100, totalVAT: 80, totalCityTax: 30 },
    { totalAmount: 100, payments: [{ paidAmount: 120 }] },
    { totalAmount: 100, payments: [{ paidAmount: 90 }] },
    { totalAmount: 100, payments: {} }, { totalAmount: 100, payments: [null] },
  ]) assert.ok(fiscalAmountError(payload, 100), JSON.stringify(payload));
});
