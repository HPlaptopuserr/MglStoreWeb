import assert from "node:assert/strict";
import test from "node:test";
import { canAutoCompletePayment, canResumePaidCheckout, canFinalizeQrWithoutBrowser } from "./auto-complete-payment";
import { paymentMethodForKey } from "../constants/payment-methods";

for (const status of ["confirmed", "pending"] as const) {
  test(`${status} payment finishes only when verified and covering the balance`, () => {
    assert.equal(
      canAutoCompletePayment({
        status,
        amount: 20000,
        remaining: 20000,
        loyaltyReady: true,
      }),
      status === "confirmed",
    );
    assert.equal(
      canAutoCompletePayment({
        status,
        amount: 10000,
        remaining: 20000,
        loyaltyReady: true,
      }),
      false,
    );
    assert.equal(
      canAutoCompletePayment({
        status,
        amount: 20000,
        remaining: 20000,
        loyaltyReady: false,
      }),
      false,
    );
  });
}
test("invalid or excess money never starts automatic completion", () => {
  for (const amount of [0, -1, NaN, Infinity, 20001]) {
    assert.equal(
      canAutoCompletePayment({
        status: "confirmed",
        amount,
        remaining: 20000,
        loyaltyReady: true,
      }),
      false,
    );
  }
  assert.equal(
    canAutoCompletePayment({
      status: "confirmed",
      amount: 0,
      remaining: 0,
      loyaltyReady: true,
    }),
    false,
  );
  assert.equal(
    canAutoCompletePayment({
      status: "confirmed",
      amount: 10.25,
      remaining: 10.25,
      loyaltyReady: true,
    }),
    true,
  );
});
test("cashier keyboard mapping stays identical across register and checkout", () => {
  assert.equal(paymentMethodForKey("F9"), "CASH");
  assert.equal(paymentMethodForKey("F10"), "CARD");
  assert.equal(paymentMethodForKey("F11"), "QR");
  assert.equal(paymentMethodForKey("F8"), "CREDIT");
  assert.equal(paymentMethodForKey("F2"), undefined);
  assert.equal(paymentMethodForKey("Enter"), undefined);
});

test("restored bank payments resume only when a complete basket can finalize", () => {
  assert.equal(canResumePaidCheckout({ hasConfirmedBankPayment: true, canFinalizeSale: true, hasBasket: true }), true);
  assert.equal(canResumePaidCheckout({ hasConfirmedBankPayment: true, canFinalizeSale: false, hasBasket: true }), false);
  assert.equal(canResumePaidCheckout({ hasConfirmedBankPayment: false, canFinalizeSale: true, hasBasket: true }), false);
  assert.equal(canResumePaidCheckout({ hasConfirmedBankPayment: true, canFinalizeSale: true, hasBasket: false }), false);
});

test("paid recovery waits until register and shift prerequisites are ready", () => {
  const saved = { hasConfirmedBankPayment: true, canFinalizeSale: true, hasBasket: true };
  assert.equal(canResumePaidCheckout({ ...saved, blocked: true }), false);
  assert.equal(canResumePaidCheckout({ ...saved, blocked: false }), true);
});

test("server recovery opts in only a complete plain QR basket", () => {
  const plain = { amount: 6600, basketTotal: 6600, priorPaymentCount: 0,
    loyaltyMode: "NONE", companyReceipt: false, creditRepayment: false };
  assert.equal(canFinalizeQrWithoutBrowser(plain), true);
  for (const unsupported of [{ amount: 3300 }, { priorPaymentCount: 1 }, { loyaltyMode: "EARN" },
    { loyaltyMode: "REDEEM" }, { companyReceipt: true },
    { creditRepayment: true }, { amount: NaN }, { amount: 0 }]) {
    assert.equal(canFinalizeQrWithoutBrowser({ ...plain, ...unsupported }), false);
  }
});
