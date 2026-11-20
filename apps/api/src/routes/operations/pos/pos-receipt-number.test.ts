import assert from "node:assert/strict";
import { test } from "node:test";
import { generatePosReceiptNumber } from "./pos-receipt-number";

test("receipts remain distinct for simultaneous checkouts and repeating timestamp suffixes", () => {
  const first = new Date("2026-11-20T08:00:00.123Z");
  const repeatedSuffix = new Date(first.getTime() + 1_000_000);
  const receipts = [
    ...Array.from({ length: 100 }, () => generatePosReceiptNumber(first)),
    generatePosReceiptNumber(repeatedSuffix),
  ];
  assert.equal(new Set(receipts).size, receipts.length);
  for (const receipt of receipts) assert.match(receipt, /^POS-20261120-[A-F0-9]{32}$/);
});
