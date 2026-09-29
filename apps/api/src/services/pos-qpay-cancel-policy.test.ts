import assert from "node:assert/strict";
import test from "node:test";
import { canReleaseCheckoutAfterCancelFailure } from "./pos-qpay-cancel-policy";

test("releases an expired checkout after a successful unpaid provider recheck", () => {
  assert.equal(
    canReleaseCheckoutAfterCancelFailure({
      invoiceStatus: "EXPIRED",
      providerRecheckCompleted: true,
      providerPaymentConfirmed: false,
    }),
    true,
  );
});

test("releases a pending checkout after a successful unpaid provider recheck", () => {
  assert.equal(
    canReleaseCheckoutAfterCancelFailure({
      invoiceStatus: "PENDING",
      providerRecheckCompleted: true,
      providerPaymentConfirmed: false,
    }),
    true,
  );
});

test("keeps checkout when payment is confirmed, recheck failed, or status is terminal", () => {
  assert.equal(
    canReleaseCheckoutAfterCancelFailure({
      invoiceStatus: "PENDING",
      providerRecheckCompleted: true,
      providerPaymentConfirmed: true,
    }),
    false,
  );
  assert.equal(
    canReleaseCheckoutAfterCancelFailure({
      invoiceStatus: "EXPIRED",
      providerRecheckCompleted: true,
      providerPaymentConfirmed: true,
    }),
    false,
  );
  assert.equal(
    canReleaseCheckoutAfterCancelFailure({
      invoiceStatus: "EXPIRED",
      providerRecheckCompleted: false,
      providerPaymentConfirmed: false,
    }),
    false,
  );
  assert.equal(
    canReleaseCheckoutAfterCancelFailure({
      invoiceStatus: "PAID",
      providerRecheckCompleted: true,
      providerPaymentConfirmed: false,
    }),
    false,
  );
});
