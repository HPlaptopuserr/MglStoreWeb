import assert from "node:assert/strict";
import test from "node:test";
import {
  createSplitPaymentDraft,
  resolveSplitPaymentPlan,
  type SplitPaymentDraft,
} from "./split-payment-plan";
import type { CheckoutPaymentEntry } from "../components/PosCheckoutView";

const draft = (
  card: string,
  qr: string,
  cash: string,
  remainderMethod: SplitPaymentDraft["remainderMethod"] = null,
): SplitPaymentDraft => ({
  amounts: { CARD: card, QR: qr, CASH: cash },
  remainderMethod,
});
test("2000 card automatically assigns the remaining 8000 to QR, with zero cash", () => {
  const input = createSplitPaymentDraft();
  input.amounts.CARD = "2000";
  const plan = resolveSplitPaymentPlan(10000, input, []);
  assert.deepEqual(plan.amounts, { CARD: 2000, QR: 8000, CASH: 0 });
  assert.equal(plan.error, "");
  assert.equal(plan.nextMethod, "CARD");
});
test("2000 card plus 1000 manual cash automatically assigns 7000 to QR", () => {
  const plan = resolveSplitPaymentPlan(
    10000,
    draft("2000", "0", "1000", "QR"),
    [],
  );
  assert.deepEqual(plan.amounts, { CARD: 2000, QR: 7000, CASH: 1000 });
  assert.equal(plan.allocated, 10000);
  assert.equal(plan.error, "");
});
test("any row can receive the remainder, including cash and card", () => {
  assert.deepEqual(
    resolveSplitPaymentPlan(10000, draft("2000", "7000", "0", "CASH"), [])
      .amounts,
    { CARD: 2000, QR: 7000, CASH: 1000 },
  );
  assert.deepEqual(
    resolveSplitPaymentPlan(10000, draft("0", "7000", "1000", "CARD"), [])
      .amounts,
    { CARD: 2000, QR: 7000, CASH: 1000 },
  );
});
test("manual splits must exactly match total and reject invalid money", () => {
  for (const input of [
    draft("2000", "7000", "0"),
    draft("2000", "9000", "0"),
    draft("-1", "0", "0", "QR"),
    draft("0.001", "0", "0", "QR"),
    draft("abc", "0", "0", "QR"),
  ]) {
    const plan = resolveSplitPaymentPlan(10000, input, []);
    assert.ok(plan.error);
    assert.equal(plan.nextMethod, null);
  }
  assert.equal(
    resolveSplitPaymentPlan(10000, draft("2000", "7000", "1000"), []).error,
    "",
  );
});
test("bank-confirmed and pending amounts cannot be edited and zero rows are skipped", () => {
  const entries: CheckoutPaymentEntry[] = [
    { id: "card", method: "CARD", amount: 2000, status: "confirmed" },
  ];
  let plan = resolveSplitPaymentPlan(
    10000,
    draft("9999", "0", "0", "QR"),
    entries,
  );
  assert.deepEqual(plan.amounts, { CARD: 2000, QR: 8000, CASH: 0 });
  assert.equal(plan.locked.CARD, true);
  assert.equal(plan.nextMethod, "QR");
  entries.push({
    id: "qr",
    method: "QR",
    amount: 8000,
    status: "pending",
    invoiceId: "test-invoice",
  });
  plan = resolveSplitPaymentPlan(
    10000,
    draft("9999", "9999", "0", "QR"),
    entries,
  );
  assert.equal(plan.statuses.QR, "pending");
  assert.equal(plan.nextMethod, null);
  assert.equal(plan.error, "");
  entries[1] = { ...entries[1], status: "confirmed" };
  assert.equal(
    resolveSplitPaymentPlan(10000, draft("0", "0", "0", "QR"), entries)
      .nextMethod,
    null,
  );
});
test("decimal allocations use minor units without residual fractions", () => {
  const plan = resolveSplitPaymentPlan(
    0.3,
    draft("0.10", "0", "0.10", "QR"),
    [],
  );
  assert.deepEqual(plan.amounts, { CARD: 0.1, QR: 0.1, CASH: 0.1 });
  assert.equal(plan.error, "");
});
