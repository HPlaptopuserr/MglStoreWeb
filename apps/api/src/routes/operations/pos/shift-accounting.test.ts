import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateExpectedCash,
  resolveSalePayments,
  summarizeShiftSales,
} from "./shift-accounting";

test("stored mixed payment breakdown preserves the cash component", () => {
  const payments = resolveSalePayments({
    grandTotal: 100_000,
    paymentMethod: "MIXED",
    paymentBreakdown: [
      { method: "CASH", amount: 35_000 },
      { method: "CARD", amount: 65_000 },
    ],
  });

  assert.deepEqual(payments, [
    { method: "CASH", amount: 35_000 },
    { method: "CARD", amount: 65_000 },
  ]);
});

test("legacy mixed sale derives cash after card, qpay, credit, and redeemed points", () => {
  const payments = resolveSalePayments({
    grandTotal: 120_000,
    redeemedPoints: 10_000,
    paymentMethod: "MIXED",
    cardPayments: [40_000],
    qpayPayments: [20_000],
    creditAmount: 15_000,
  });

  assert.deepEqual(payments, [
    { method: "CARD", amount: 40_000 },
    { method: "QPAY", amount: 20_000 },
    { method: "CREDIT", amount: 15_000 },
    { method: "CASH", amount: 35_000 },
  ]);
});

test("shift summary and expected drawer cash use payment-level amounts", () => {
  const summary = summarizeShiftSales([
    {
      grandTotal: 80_000,
      paymentMethod: "CASH",
      paymentBreakdown: [{ method: "CASH", amount: 80_000 }],
    },
    {
      grandTotal: 100_000,
      paymentMethod: "MIXED",
      paymentBreakdown: [
        { method: "CASH", amount: 30_000 },
        { method: "CARD", amount: 70_000 },
      ],
    },
  ]);

  assert.equal(summary.cashSales, 110_000);
  assert.equal(summary.cardSales, 70_000);
  assert.equal(summary.mixedSales, 100_000);
  assert.equal(
    calculateExpectedCash({
      openingCash: 50_000,
      cashSales: summary.cashSales,
      paidIn: 10_000,
      paidOut: 5_000,
    }),
    165_000,
  );
});
