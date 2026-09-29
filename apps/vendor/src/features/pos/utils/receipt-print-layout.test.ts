import assert from "node:assert/strict";
import test from "node:test";
import { receiptPrintLayout } from "./receipt-print-layout";
import { createSalesHistoryDemo } from "./sales-history-demo";

test("print layout escapes data, preserves totals and formats local date", () => {
  const receipt = createSalesHistoryDemo(new Date("2026-09-29T04:00:00Z"))[0];
  receipt.lines[0].name = '<script>alert("test")</script>';
  receipt.paymentBreakdown = [{ method: "CASH", amount: receipt.grandTotal, cash: { receivedAmount: 10000, changeAmount: 10000 - receipt.grandTotal } }];
  const html = receiptPrintLayout(receipt);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("2026-09-29 09:30:00"));
  assert.ok(html.includes("grand-total"));
  assert.ok(html.includes("Авсан мөнгө"));
  assert.ok(html.includes("Хариулт"));
  assert.ok(html.includes("TEST-EBARIMT-1"));
});
