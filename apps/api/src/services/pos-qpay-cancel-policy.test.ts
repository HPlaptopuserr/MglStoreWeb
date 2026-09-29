import assert from "node:assert/strict";
import test from "node:test";
import { canReleaseExpiredCheckoutAfterCancelFailure } from "./pos-qpay-cancel-policy";

test("releases an expired checkout after a successful unpaid provider recheck", () => {
  assert.equal(
    canReleaseExpiredCheckoutAfterCancelFailure({
      invoiceStatus: "EXPIRED",
      providerRecheckCompleted: true,
      providerPaymentConfirmed: false,
    }),
    true,
  );
});

test("keeps checkout when invoice is pending, paid, or provider recheck failed", () => {
  assert.equal(
    canReleaseExpiredCheckoutAfterCancelFailure({
      invoiceStatus: "PENDING",
      providerRecheckCompleted: true,
      providerPaymentConfirmed: false,
    }),
    false,
  );
  assert.equal(
    canReleaseExpiredCheckoutAfterCancelFailure({
      invoiceStatus: "EXPIRED",
      providerRecheckCompleted: true,
      providerPaymentConfirmed: true,
    }),
    false,
  );
  assert.equal(
    canReleaseExpiredCheckoutAfterCancelFailure({
      invoiceStatus: "EXPIRED",
      providerRecheckCompleted: false,
      providerPaymentConfirmed: false,
    }),
    false,
  );
});
