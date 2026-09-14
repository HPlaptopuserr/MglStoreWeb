import assert from "node:assert/strict";
import test from "node:test";
import {
  adjustedInvoiceTotalAfterReturn,
  canCreateUnpaidDispatchReturn,
} from "./dispatch-return.policy";

test("allows a return before any payment is received", () => {
  assert.equal(
    canCreateUnpaidDispatchReturn({ status: "PENDING", paidAmount: "0" }),
    true,
  );
  assert.equal(canCreateUnpaidDispatchReturn(null), true);
});

test("approved returns reduce only the unpaid invoice balance", () => {
  assert.equal(
    adjustedInvoiceTotalAfterReturn({
      currentTotal: 100_000,
      paidAmount: 0,
      returnAmount: 30_000,
    }),
    70_000,
  );
  assert.equal(
    adjustedInvoiceTotalAfterReturn({
      currentTotal: 100_000,
      paidAmount: 0,
      returnAmount: 100_000,
    }),
    0,
  );
});

test("blocks a return after a partial or full payment", () => {
  assert.equal(
    canCreateUnpaidDispatchReturn({ status: "PENDING", paidAmount: "1" }),
    false,
  );
  assert.equal(
    canCreateUnpaidDispatchReturn({ status: "PAID", paidAmount: "100" }),
    false,
  );
  assert.equal(
    canCreateUnpaidDispatchReturn({ status: "PAID", paidAmount: "0" }),
    false,
  );
});
