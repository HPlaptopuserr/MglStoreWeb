import assert from "node:assert/strict";
import test from "node:test";
import { normalizeQPayPaymentCheckResponse } from "./qpay";

test("QuickQR payment check recognizes QPay PAID rows", () => {
  const result = normalizeQPayPaymentCheckResponse({
    invoice_status: "PAID",
    payments: [
      {
        payment_id: "payment-1",
        payment_status: "PAID",
        payment_amount: "12500",
        transaction_id: "transaction-1",
      },
    ],
  });

  assert.deepEqual(result, {
    count: 1,
    paid_amount: 12_500,
    rows: [
      {
        payment_id: "payment-1",
        payment_status: "PAID",
        payment_amount: 12_500,
        transaction_id: "transaction-1",
      },
    ],
  });
});

test("QuickQR payment check keeps SUCCESS support", () => {
  const result = normalizeQPayPaymentCheckResponse({
    payments: [
      { id: "payment-2", status: "SUCCESS", amount: 5000 },
      { id: "payment-pending", status: "PENDING", amount: 5000 },
    ],
  });

  assert.equal(result.count, 1);
  assert.equal(result.paid_amount, 5000);
  assert.equal(result.rows[0]?.payment_id, "payment-2");
});

test("payment check accepts standard rows and rejects failed/refunded rows", () => {
  const result = normalizeQPayPaymentCheckResponse({
    rows: [
      {
        payment_id: "payment-3",
        payment_status: "PAID",
        payment_amount: 9900,
      },
      {
        payment_id: "payment-failed",
        payment_status: "FAILED",
        payment_amount: 9900,
      },
      {
        payment_id: "payment-refunded",
        payment_status: "REFUNDED",
        payment_amount: 9900,
      },
    ],
  });

  assert.equal(result.count, 1);
  assert.equal(result.paid_amount, 9900);
  assert.equal(result.rows[0]?.payment_id, "payment-3");
});

test("payment check preserves the provider paid total for verification", () => {
  const result = normalizeQPayPaymentCheckResponse({
    paid_amount: 0,
    rows: [
      {
        payment_id: "payment-4",
        payment_status: "PAID",
        payment_amount: 9900,
      },
    ],
  });

  assert.equal(result.paid_amount, 0);
});
