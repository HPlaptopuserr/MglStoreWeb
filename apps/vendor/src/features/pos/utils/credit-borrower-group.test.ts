import assert from "node:assert/strict";
import test from "node:test";
import { creditBorrowerGroupKey } from "./credit-borrower-group";
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
