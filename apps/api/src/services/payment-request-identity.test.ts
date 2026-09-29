import assert from "node:assert/strict";
import test from "node:test";
import { isPaymentRequestId, matchesPaymentRequest } from "./payment-request-identity";
const existing = { organizationId: "org-a", registerId: "register-a", amount: 100 };
test("same payment retry matches its original scope and amount", () => {
  assert.equal(matchesPaymentRequest(existing, { ...existing }), true);
});
for (const [name, requested] of [
  ["other organization", { ...existing, organizationId: "org-b" }],
  ["other register", { ...existing, registerId: "register-b" }],
  ["different amount", { ...existing, amount: 101 }],
  ["invalid amount", { ...existing, amount: NaN }],
] as const) test(name, () => assert.equal(matchesPaymentRequest(existing, requested), false));
test("only UUID shaped request IDs are accepted", () => {
  assert.equal(isPaymentRequestId("12345678-1234-1234-1234-123456789abc"), true);
  assert.equal(isPaymentRequestId("12345678----------------------------"), false);
});
