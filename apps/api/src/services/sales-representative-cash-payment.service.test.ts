import assert from "node:assert/strict";
import test from "node:test";
import { PaymentStatus } from "@mgl/database";
import { validatePartialPaymentAmount } from "./sales-representative-cash-payment.service";

const payment = (paidAmount = 0) => ({
  id: "payment-1",
  status: PaymentStatus.PENDING,
  totalAmount: 30_000,
  paidAmount,
});

test("accepts a partial payment and keeps the remaining balance", () => {
  assert.deepEqual(validatePartialPaymentAmount(payment(), 20_000), {
    ok: true,
    amount: 20_000,
    outstandingBefore: 30_000,
    fullyPaid: false,
  });
});

test("accepts the exact outstanding amount as full settlement", () => {
  assert.deepEqual(validatePartialPaymentAmount(payment(20_000), 10_000), {
    ok: true,
    amount: 10_000,
    outstandingBefore: 10_000,
    fullyPaid: true,
  });
});

test("rejects overpayment, zero, fractions and an already paid invoice", () => {
  assert.equal(validatePartialPaymentAmount(payment(), 30_001).ok, false);
  assert.equal(validatePartialPaymentAmount(payment(), 0).ok, false);
  assert.equal(validatePartialPaymentAmount(payment(), 10.5).ok, false);
  assert.equal(
    validatePartialPaymentAmount(
      { ...payment(30_000), status: PaymentStatus.PAID },
      1,
    ).ok,
    false,
  );
});
