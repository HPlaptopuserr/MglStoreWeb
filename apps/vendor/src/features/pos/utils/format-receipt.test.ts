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
test("receipt and reprint keep payment amounts without redundant cash details", () => {
  const text = formatReceipt(receipt);
  assert.match(text, /Бэлэн мөнгө: ₮5,500/);
  assert.doesNotMatch(text, /Авсан мөнгө|Хариулт|Төлбөрийн задаргаа/);
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
