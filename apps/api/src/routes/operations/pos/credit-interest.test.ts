import assert from "node:assert/strict";
import test from "node:test";

import { calculatePosCreditPayable } from "./credit-interest";

const credit = {
  principalAmount: 100_000,
  monthlyInterestRate: 0.012,
  termMonths: 1,
  dueDate: new Date("2026-02-01T00:00:00.000Z"),
};

test("does not accrue interest before the credit due date", () => {
  const payable = calculatePosCreditPayable(credit, new Date("2026-01-31T23:59:59.000Z"));

  assert.equal(payable.interestMonths, 0);
  assert.equal(payable.totalInterest, 0);
  assert.equal(payable.totalDue, 100_000);
});

test("accrues the first month of interest once the due date is reached", () => {
  const payable = calculatePosCreditPayable(credit, new Date("2026-02-01T00:00:00.000Z"));

  assert.equal(payable.interestMonths, 1);
  assert.equal(payable.totalInterest, 1_200);
  assert.equal(payable.totalDue, 101_200);
});

test("adds another month after a full unpaid month past the due date", () => {
  const payable = calculatePosCreditPayable(credit, new Date("2026-03-01T00:00:00.000Z"));

  assert.equal(payable.interestMonths, 2);
  assert.equal(payable.totalInterest, 2_400);
  assert.equal(payable.totalDue, 102_400);
});

test("normalizes percent-style monthly interest rates", () => {
  const payable = calculatePosCreditPayable(
    { ...credit, monthlyInterestRate: 1.2 },
    new Date("2026-02-01T00:00:00.000Z"),
  );

  assert.equal(payable.monthlyInterestRate, 0.012);
  assert.equal(payable.totalInterest, 1_200);
});
