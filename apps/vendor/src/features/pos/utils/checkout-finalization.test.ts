import assert from "node:assert/strict";
import test from "node:test";
import { checkoutFinalizationBlocker } from "./checkout-finalization";

const paidCheckout = {
  registerReady: true,
  shiftLoading: false,
  shiftError: null,
  hasShift: true,
  shiftRegisterMismatch: false,
  loyaltyReady: true,
  hasPendingPayment: false,
  confirmedPaid: 7500,
  payableTotal: 7500,
};

test("a fully paid checkout can proceed once shift and loyalty prerequisites are satisfied", () => {
  assert.equal(checkoutFinalizationBlocker(paidCheckout), null);
});

test("a paid checkout explains missing prerequisites instead of requesting another payment", () => {
  for (const missing of [
    { hasShift: false },
    { shiftRegisterMismatch: true },
    { loyaltyReady: false },
    { hasPendingPayment: true },
  ]) {
    const reason = checkoutFinalizationBlocker({ ...paidCheckout, ...missing });
    assert.match(reason ?? "", /дахин/i);
    assert.equal(checkoutFinalizationBlocker(paidCheckout), null);
  }
});

test("zero displayed balance does not permit overpayment to be silently finalized", () => {
  assert.ok(checkoutFinalizationBlocker({ ...paidCheckout, confirmedPaid: 8000 })?.includes("их"));
});

test("shift loading and failures remain visible after payment approval", () => {
  assert.ok(checkoutFinalizationBlocker({ ...paidCheckout, shiftLoading: true })?.includes("шалгаж"));
  assert.ok(checkoutFinalizationBlocker({ ...paidCheckout, shiftError: "Холболт тасарсан" })?.includes("Холболт тасарсан"));
});
