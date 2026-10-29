import assert from "node:assert/strict";
import test from "node:test";
import { cardRequestFailureIsDefinitive } from "./card-payment-outcome";

test("status endpoint errors never discard an already-authorized card reference", () => {
  for (const httpStatus of [0, 400, 401, 403, 404, 408, 409, 422, 429, 500, 502]) {
    assert.equal(cardRequestFailureIsDefinitive({ hasAttemptId: true, authorizationAccepted: true, httpStatus }), false);
  }
});
test("preflight failure is safe to discard, but a lost authorization response keeps its UUID", () => {
  assert.equal(cardRequestFailureIsDefinitive({ hasAttemptId: false, authorizationAccepted: false, httpStatus: 500 }), true);
  for (const httpStatus of [0, 408, 409, 429, 500, 502]) {
    assert.equal(cardRequestFailureIsDefinitive({ hasAttemptId: true, authorizationAccepted: false, httpStatus }), false);
  }
  for (const httpStatus of [400, 401, 403, 404, 422]) {
    assert.equal(cardRequestFailureIsDefinitive({ hasAttemptId: true, authorizationAccepted: false, httpStatus }), true);
  }
});
