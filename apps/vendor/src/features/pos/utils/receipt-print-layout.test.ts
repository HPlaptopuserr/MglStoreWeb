import assert from "node:assert/strict";
import test from "node:test";
import { receiptPrintLayout } from "./receipt-print-layout";
import { createSalesHistoryDemo } from "./sales-history-demo";

test("print layout escapes data, preserves totals and formats local date", () => {
  const receipt = createSalesHistoryDemo(new Date("2026-09-29T04:00:00Z"))[0];
  receipt.lines[0].name = '<script>alert("test")</script>';
  receipt.paymentBreakdown = [
    {
      method: "CASH",
      amount: receipt.grandTotal,
      cash: { receivedAmount: 10000, changeAmount: 10000 - receipt.grandTotal },
    },
  ];
  const html = receiptPrintLayout(receipt);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("2026-09-29 09:30:00"));
  assert.ok(html.includes("grand-total"));
  assert.ok(html.includes("Авсан мөнгө"));
  assert.ok(html.includes("Хариулт"));
  assert.ok(html.includes("TEST-EBARIMT-1"));
});

test("thermal print uses fiscal tax including explicit zero without changing historical sale totals", () => {
  const receipt = createSalesHistoryDemo(new Date("2026-09-29T04:00:00Z"))[0];
  receipt.taxTotal = 1000;
  receipt.ebarimt = { status: "SUCCESS", totalVAT: 0, totalCityTax: 0 };
  assert.match(
    receiptPrintLayout(receipt),
    /<span>Татвар<\/span><strong>₮0<\/strong>/,
  );
  receipt.ebarimt = { status: "SUCCESS", totalVAT: 100, totalCityTax: 20 };
  assert.match(
    receiptPrintLayout(receipt),
    /<span>Татвар<\/span><strong>₮120<\/strong>/,
  );
  assert.equal(receipt.taxTotal, 1000);
});

test("product names use the full receipt width above compact quantity and amount rows", () => {
  const receipt = createSalesHistoryDemo(new Date("2026-11-24T04:00:00Z"))[0];
  receipt.lines[0].name = "Fuze tea зөгийн бал лийр 0.48л";
  const html = receiptPrintLayout(receipt);
  assert.match(
    html,
    /colspan="3" class="receipt-line-name">Fuze tea зөгийн бал лийр 0.48л<\/td>/,
  );
  assert.match(html, /class="receipt-line-values"/);
  assert.equal(
    (html.match(/class="receipt-line"/g) ?? []).length,
    receipt.lines.length,
  );
});
