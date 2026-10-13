import assert from "node:assert/strict";
import test from "node:test";

import { canClearCheckoutAfterCancelFailure } from "./qpay-cancel-policy";

test("allows checkout clearing when every rechecked invoice is expired", () => {
  assert.equal(canClearCheckoutAfterCancelFailure(["EXPIRED"]), true);
  assert.equal(canClearCheckoutAfterCancelFailure(["EXPIRED", "EXPIRED"]), true);
});

test("keeps checkout when a payment may still be active or status is unknown", () => {
  assert.equal(canClearCheckoutAfterCancelFailure([]), false);
  assert.equal(canClearCheckoutAfterCancelFailure(["PAID"]), false);
  assert.equal(canClearCheckoutAfterCancelFailure(["PENDING"]), false);
  assert.equal(canClearCheckoutAfterCancelFailure(["EXPIRED", "PENDING"]), false);
});
