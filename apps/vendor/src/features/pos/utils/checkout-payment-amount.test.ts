import assert from "node:assert/strict";
import test from "node:test";
import { checkoutPaymentAmount } from "./checkout-payment-amount";
import { canAutoCompletePayment } from "./auto-complete-payment";
import { calculateCashPayment } from "@mgl/types";

test("10000 is paid as 5000 card, 2000 QR and 3000 cash without completing early", () => {
  const card = checkoutPaymentAmount("5000", 10000);
  assert.deepEqual(card, {
    amount: 5000,
    balanceAfter: 5000,
    partial: true,
    error: "",
  });
  assert.equal(
    canAutoCompletePayment({
      status: "confirmed",
      amount: card.amount,
      remaining: 10000,
      loyaltyReady: true,
    }),
    false,
  );
  const qr = checkoutPaymentAmount("2000", card.balanceAfter);
  assert.equal(qr.amount, 2000);
  assert.equal(qr.balanceAfter, 3000);
  assert.equal(
    canAutoCompletePayment({
      status: "confirmed",
      amount: qr.amount,
      remaining: 5000,
      loyaltyReady: true,
    }),
    false,
  );
  const cash = calculateCashPayment(3000, qr.balanceAfter);
  assert.equal(cash.amount, 3000);
  assert.equal(cash.remaining, 0);
  assert.equal(card.amount + qr.amount + cash.amount, 10000);
});
test("bank payment amounts cannot silently become the full balance or be clamped", () => {
  for (const input of [
    "abc",
    "5000foo",
    "-1",
    "0",
    "0.001",
    "1e3",
    "10001",
    "Infinity",
    "0x20",
  ]) {
    const result = checkoutPaymentAmount(input, 10000);
    assert.equal(result.amount, 0, input);
    assert.ok(result.error, input);
  }
  assert.equal(checkoutPaymentAmount("", 10000).amount, 10000);
  assert.equal(checkoutPaymentAmount("3000", 3000).partial, false);
  assert.equal(checkoutPaymentAmount("0.20", 0.3).balanceAfter, 0.1);
});
test("cash change contributes only the remaining applied amount", () => {
  const cash = calculateCashPayment(5000, 3000);
  assert.deepEqual(cash, {
    amount: 3000,
    cash: { receivedAmount: 5000, changeAmount: 2000 },
    remaining: 0,
  });
});
