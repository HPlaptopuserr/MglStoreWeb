import assert from "node:assert/strict";
import test from "node:test";
import { reconcilePaymentEntry } from "./reconcile-payment-entry";
import type { CheckoutPaymentEntry } from "../components/PosCheckoutView";
const response: CheckoutPaymentEntry = { id: "invoice", invoiceId: "invoice", method: "QR", amount: 100, status: "pending" };
test("late QR creation cannot downgrade provider-confirmed payment", () => {
  const result = reconcilePaymentEntry([{ ...response, status: "confirmed" }], "invoice", response);
  assert.equal(result[0].status, "confirmed");
});
test("late response preserves unrelated payments and cannot resurrect removed invoice", () => {
  const cash: CheckoutPaymentEntry = { id: "cash", method: "CASH", amount: 50, status: "confirmed" };
  assert.deepEqual(reconcilePaymentEntry([cash], "invoice", response), [cash]);
});
test("pending invoice receives response metadata", () => {
  assert.equal(reconcilePaymentEntry([response], "invoice", { ...response, amount: 101 })[0].amount, 101);
});
