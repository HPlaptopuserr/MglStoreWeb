import assert from "node:assert/strict";
import test from "node:test";
import {
  canClearCheckoutAfterCancelFailure,
  isQPayCancellationConfirmed,
} from "./qpay-cancel-policy";

test("checkout clearing requires affirmative bank cancellation for every invoice", () => {
  assert.equal(
    canClearCheckoutAfterCancelFailure([
      { status: "EXPIRED", providerCancellationConfirmed: true },
    ]),
    true,
  );
  assert.equal(
    canClearCheckoutAfterCancelFailure([
      { status: "EXPIRED", providerCancellationConfirmed: true },
      { status: "EXPIRED", providerCancellationConfirmed: true },
    ]),
    true,
  );
});
test("expiry, abandoned checkout, unpaid checks and mixed proofs never erase unresolved QR", () => {
  for (const status of ["EXPIRED", "PAID", "PENDING"]) {
    assert.equal(canClearCheckoutAfterCancelFailure([{ status }]), false);
    assert.equal(
      isQPayCancellationConfirmed({
        status,
        providerCancellationConfirmed: false,
      }),
      false,
    );
  }
  assert.equal(canClearCheckoutAfterCancelFailure([]), false);
  assert.equal(
    canClearCheckoutAfterCancelFailure([
      { status: "EXPIRED", providerCancellationConfirmed: true },
      { status: "EXPIRED" },
    ]),
    false,
  );
  assert.equal(
    isQPayCancellationConfirmed({
      status: "PAID",
      providerCancellationConfirmed: true,
    }),
    false,
  );
});
