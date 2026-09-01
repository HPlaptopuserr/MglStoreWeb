import assert from "node:assert/strict";
import test from "node:test";
import { isStoreQPayPaymentComplete } from "./store-payment-validation.service";

test("store checkout rejects a partial QPay payment", () => {
  assert.equal(
    isStoreQPayPaymentComplete({
      paymentCount: 1,
      paidAmount: 5000,
      expectedAmount: 6100,
    }),
    false,
  );
});

test("store checkout accepts the full invoiced QPay amount", () => {
  assert.equal(
    isStoreQPayPaymentComplete({
      paymentCount: 1,
      paidAmount: 6100,
      expectedAmount: 6100,
    }),
    true,
  );
});

test("store checkout requires a payment row and a positive invoice amount", () => {
  assert.equal(
    isStoreQPayPaymentComplete({
      paymentCount: 0,
      paidAmount: 6100,
      expectedAmount: 6100,
    }),
    false,
  );
  assert.equal(
    isStoreQPayPaymentComplete({
      paymentCount: 1,
      paidAmount: 0,
      expectedAmount: 0,
    }),
    false,
  );
});
