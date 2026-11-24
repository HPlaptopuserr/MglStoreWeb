import assert from "node:assert/strict";
import test from "node:test";
import { applyConfirmedCreditBorrowerLink, creditBorrowerGroupKey } from "./credit-borrower-group";
test("one saved customer never merges different debtor identities in correction or repayment groups", () => {
  const original = {
    customerId: "legacy-customer",
    targetType: "CUSTOMER",
    borrowerId: "person-a",
    employeeId: null,
    borrowerPhone: "90000001",
  };
  assert.equal(
    creditBorrowerGroupKey(original),
    creditBorrowerGroupKey({ ...original }),
  );
  for (const change of [
    { borrowerId: "person-b" },
    { employeeId: "employee" },
    { targetType: "COMPANY" },
    { borrowerPhone: "90000002" },
  ]) {
    assert.notEqual(
      creditBorrowerGroupKey(original),
      creditBorrowerGroupKey({ ...original, ...change }),
    );
  }
});

test("linked and unlinked credits cannot share a borrower action group", () => {
  const original = { customerId: "customer", targetType: "CUSTOMER", borrowerId: "same", employeeId: null, borrowerPhone: "99489147" };
  assert.equal(creditBorrowerGroupKey(original), creditBorrowerGroupKey({ ...original, borrowerUserId: null }));
  assert.notEqual(creditBorrowerGroupKey(original), creditBorrowerGroupKey({ ...original, borrowerUserId: "account" }));
  assert.notEqual(creditBorrowerGroupKey({ ...original, borrowerUserId: "one" }), creditBorrowerGroupKey({ ...original, borrowerUserId: "two" }));
});

test("confirmed links immediately show the canonical phone without changing financial state", () => {
  const credits = [
    { id: "selected", borrowerUserId: null, totalDue: 1041350, paidAmount: 20000, borrowerPhone: "99489147" },
    { id: "other", borrowerUserId: null, totalDue: 5000, paidAmount: 0, borrowerPhone: "90000000" },
  ];
  const result = { linkedCreditSaleIds: ["selected"], borrowerUserId: "account", linkedCount: 1,
    user: { id: "account", fullName: "Person", phoneNumber: "99001122", email: null } };
  const updated = applyConfirmedCreditBorrowerLink(credits, result);
  assert.equal(updated[0]?.borrowerUserId, "account");
  assert.equal(updated[0]?.borrowerPhone, "99001122");
  assert.deepEqual({ ...updated[0], borrowerUserId: null, borrowerPhone: "99489147" }, credits[0]);
  assert.equal(updated[1], credits[1]);
  assert.equal(credits[0]?.borrowerUserId, null);
});
