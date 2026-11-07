import assert from "node:assert/strict";
import test from "node:test";
import type { CheckoutPaymentEntry } from "../components/PosCheckoutView";
import {
  hasProtectedCheckoutPayment,
  hasUnresolvedCardPayment,
} from "./checkout-cart-guard";

for (const amount of [7_500, 50_000_000]) {
  test(`card payment of ${amount} protects the basket before and after bank confirmation`, () => {
    const pending: CheckoutPaymentEntry = {
      id: "card",
      method: "CARD",
      amount,
      status: "pending",
    };
    // Authorization may be in flight before an attempt ID is returned.
    assert.equal(hasUnresolvedCardPayment([pending]), true);
    assert.equal(hasProtectedCheckoutPayment([pending]), true);
    const uncertain = { ...pending, attemptId: "bank-attempt" };
    assert.equal(hasUnresolvedCardPayment([uncertain]), true);
    assert.equal(hasProtectedCheckoutPayment([uncertain]), true);
    const confirmed: CheckoutPaymentEntry = {
      ...uncertain,
      status: "confirmed",
    };
    assert.equal(hasUnresolvedCardPayment([confirmed]), false);
    assert.equal(hasProtectedCheckoutPayment([confirmed]), true);
  });
}

test("confirmed split payments and existing QR invoices protect the basket", () => {
  const cash: CheckoutPaymentEntry = {
    id: "cash",
    method: "CASH",
    amount: 3_000,
    status: "confirmed",
  };
  const qr: CheckoutPaymentEntry = {
    id: "qr",
    method: "QR",
    amount: 5_000,
    status: "pending",
    invoiceId: "invoice",
  };
  assert.equal(hasProtectedCheckoutPayment([cash]), true);
  assert.equal(hasProtectedCheckoutPayment([qr]), true);
  assert.equal(hasUnresolvedCardPayment([cash, qr]), false);
});

test("an unpaid basket can be edited and cleared", () => {
  assert.equal(hasProtectedCheckoutPayment([]), false);
  assert.equal(hasUnresolvedCardPayment([]), false);
});
