import assert from "node:assert/strict";
import test from "node:test";
import { verifiedQPayPaymentId } from "./qpay-payment-verification";
const row = (amount: number, status = "PAID", id = "payment-1") => ({ payment_id: id, payment_status: status, payment_amount: amount, transaction_id: "tx" });
for (const [name, rows, total, expected] of [
  ["full payment", [row(100)], 100, "payment-1"],
  ["partial payment", [row(50)], 50, null],
  ["failed payment", [row(100, "FAILED")], 100, null],
  ["overpayment requires reconciliation", [row(101)], 101, null],
  ["inconsistent provider total", [row(100)], 0, null],
  ["duplicate payment rows", [row(50), row(50)], 100, null],
  ["split successful payments", [row(40), row(60, "SUCCESS", "payment-2")], 100, "payment-1"],
  ["invalid amount", [row(NaN)], 100, null],
] as const) {
  test(name, () => assert.equal(verifiedQPayPaymentId({ count: rows.length, rows: [...rows], paid_amount: total }, 100), expected));
}
