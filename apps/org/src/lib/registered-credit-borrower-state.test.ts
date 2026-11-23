import assert from "node:assert/strict";
import test from "node:test";
import {
  registeredBorrowerLookupReducer as reduce,
  registeredBorrowerPhone,
  verifiedCreditBorrower,
  type RegisteredBorrowerLookupState,
} from "./registered-credit-borrower-state";

const user = {
  id: "registered-person",
  fullName: "Registered Person",
  phoneNumber: "99489147",
  email: null,
};
const first = {
  type: "start" as const,
  requestId: 1,
  organizationId: "org-a",
  phone: "99489147",
};

test("only exact full phone numbers are searched and accepted country prefix is canonicalized", () => {
  assert.equal(registeredBorrowerPhone("+976 (9948) 9147"), "99489147");
  assert.equal(registeredBorrowerPhone("99489147"), "99489147");
  for (const input of [
    "9948",
    "someone@example.com",
    "99489147foo",
    "",
    "123456789",
  ])
    assert.equal(registeredBorrowerPhone(input), null);
});
test("saved details and late responses cannot bypass a fresh registered-user lookup", () => {
  let state: RegisteredBorrowerLookupState = reduce({ status: "idle" }, first);
  state = reduce(state, { type: "resolved", requestId: 1, user });
  assert.equal(
    verifiedCreditBorrower(state, "org-a", "+97699489147")?.id,
    user.id,
  );
  assert.equal(verifiedCreditBorrower(state, "org-b", user.phoneNumber), null);
  assert.equal(verifiedCreditBorrower(state, "org-a", "99051206"), null);
  state = reduce(state, { type: "reset" });
  state = reduce(state, { type: "resolved", requestId: 1, user });
  assert.deepEqual(state, { status: "idle" });
  assert.equal(verifiedCreditBorrower(state, "org-a", user.phoneNumber), null);
});
test("out-of-order lookup results never replace the current selected phone", () => {
  let state = reduce(reduce({ status: "idle" }, first), {
    ...first,
    requestId: 2,
    phone: "99051206",
  });
  state = reduce(state, { type: "resolved", requestId: 1, user });
  assert.equal(state.status, "loading");
  state = reduce(state, { type: "resolved", requestId: 2, user: null });
  assert.equal(state.status, "empty");
  assert.equal(verifiedCreditBorrower(state, "org-a", "99051206"), null);
  state = reduce(state, {
    type: "failed",
    requestId: 1,
    message: "late error",
  });
  assert.equal(state.status, "empty");
});
