import test from "node:test";
import assert from "node:assert/strict";
import { parseCreditCustomerInput } from "./credit-customer.input";
import { buildCreditBorrowerId, buildCreditBorrowerKey } from "@mgl/types";
const customer = {
  organizationId: "org",
  targetType: "CUSTOMER",
  borrowerName: " Болд ",
  borrowerPhone: "9911 2233",
};
test("new customer uses the same identity as credit checkout", () => {
  const result = parseCreditCustomerInput(customer);
  assert.equal(result.borrowerName, "Болд");
  assert.equal(
    result.borrowerId,
    buildCreditBorrowerId("CUSTOMER", "Болд", "99112233", ""),
  );
  assert.equal(
    result.normalizedBorrowerKey,
    buildCreditBorrowerKey({
      targetType: "CUSTOMER",
      borrowerId: result.borrowerId,
    }),
  );
  assert.equal(result.borrowerEmail, null);
  assert.equal(
    parseCreditCustomerInput({ ...customer, borrowerPhone: "99112233" })
      .normalizedBorrowerKey,
    result.normalizedBorrowerKey,
  );
});
test("company contacts share checkout identity and require contact name", () => {
  assert.throws(() =>
    parseCreditCustomerInput({ ...customer, targetType: "COMPANY" }),
  );
  const result = parseCreditCustomerInput({
    ...customer,
    targetType: "COMPANY",
    employeeName: "Бат",
  });
  assert.equal(result.employeeId, `${result.borrowerId}-employee`);
  assert.equal(result.normalizedBorrowerKey, buildCreditBorrowerKey(result));
});
test("malformed customer data is rejected before database writes", () => {
  for (const patch of [
    { borrowerName: " " },
    { borrowerPhone: "123" },
    { borrowerPhone: "99112233abc" },
    { borrowerEmail: "invalid" },
    { targetType: "ADMIN" },
    { organizationId: "" },
    { borrowerAddress: "x".repeat(501) },
  ])
    assert.throws(() => parseCreditCustomerInput({ ...customer, ...patch }));
});

test("optional employment fields trim, preserve identity, and validate input", () => {
  const original = parseCreditCustomerInput(customer);
  for (const targetType of ["CUSTOMER", "COMPANY"]) {
    const result = parseCreditCustomerInput({
      ...customer, targetType, employeeName: "Бат",
      workplace: " МГЛ ", department: " Борлуулалт ", jobTitle: " Менежер ",
    });
    assert.equal(result.workplace, "МГЛ");
    assert.equal(result.department, "Борлуулалт");
    assert.equal(result.jobTitle, "Менежер");
  }
  for (const [field, limit] of [["workplace", 200], ["department", 120], ["jobTitle", 120]] as const) {
    assert.equal(original[field], null);
    assert.equal(parseCreditCustomerInput({ ...customer, [field]: " " })[field], null);
    assert.throws(() => parseCreditCustomerInput({ ...customer, [field]: 123 }));
    assert.throws(() => parseCreditCustomerInput({ ...customer, [field]: "x".repeat(limit + 1) }));
    assert.equal(parseCreditCustomerInput({ ...customer, [field]: "x".repeat(limit) }).normalizedBorrowerKey, original.normalizedBorrowerKey);
  }
});
