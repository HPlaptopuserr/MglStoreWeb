import assert from "node:assert/strict";
import test from "node:test";
import type { PosReceipt } from "@mgl/types";
import { formatReceipt } from "./format-receipt";

const receipt: PosReceipt = {
  id: "test",
  receiptNo: "TEST-001",
  branchName: "Branch",
  cashierName: "Cashier",
  paymentMethod: "MIXED",
  createdAt: "2026-09-28T00:00:00Z",
  lines: [],
  subTotal: 15500,
  taxTotal: 0,
  discountTotal: 0,
  grandTotal: 15500,
  paymentBreakdown: [
    { method: "CARD", amount: 10000 },
    {
      method: "CASH",
      amount: 5500,
      cash: { receivedAmount: 20000, changeAmount: 14500 },
    },
  ],
};
test("receipt and reprint show tender and change", () => {
  const text = formatReceipt(receipt);
  assert.match(text, /Бэлнээр тооцсон: ₮5,500/);
  assert.match(text, /Авсан мөнгө: ₮20,000/);
  assert.match(text, /Хариулт: ₮14,500/);
  assert.doesNotMatch(text, /Хөнгөлөлт: -₮0/);
  assert.equal(formatReceipt(JSON.parse(JSON.stringify(receipt))), text);
});
test("legacy receipts do not invent tender", () => {
  const text = formatReceipt({
    ...receipt,
    paymentBreakdown: [{ method: "CASH", amount: 15500 }],
  });
  assert.doesNotMatch(text, /Авсан мөнгө|Хариулт/);
});
test("receipt preserves minor units", () => {
  assert.match(
    formatReceipt({ ...receipt, grandTotal: 0.25 }),
    /НИЙТ ДҮН: ₮0.25/,
  );
});

test("successful non-VAT fiscal receipts print actual zero tax rather than the sale estimate", () => {
  const fiscalReceipt = { ...receipt, taxTotal: 1409.09, ebarimt: { status: "SUCCESS", totalVAT: 0, totalCityTax: 0 } };
  assert.match(formatReceipt(fiscalReceipt), /Татвар: ₮0\n/);
  assert.equal(fiscalReceipt.taxTotal, 1409.09);
  assert.match(formatReceipt({ ...fiscalReceipt, ebarimt: { status: "SUCCESS", totalVAT: 100, totalCityTax: 20 } }), /Татвар: ₮120\n/);
  assert.match(formatReceipt({ ...fiscalReceipt, ebarimt: { status: "FAILED", totalVAT: 0 } }), /Татвар: ₮1,409.09/);
});
