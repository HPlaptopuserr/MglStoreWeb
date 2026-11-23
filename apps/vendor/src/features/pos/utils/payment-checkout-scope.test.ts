import assert from "node:assert/strict";
import test from "node:test";
import { isCurrentPaymentCheckout, verifiedQPayObservation, verifiedQPayCancellation, canReleaseReviewedUnpaidQr } from "./payment-checkout-scope";
import type { CheckoutPaymentEntry } from "../components/PosCheckoutView";

const scope = { organizationId: "org", registerId: "register", clientSaleId: "original-sale" };
const entry: CheckoutPaymentEntry = { id: "request-reference", method: "QR", status: "pending", invoiceId: "invoice", amount: 6600 };
const paid = { invoiceId: "invoice", status: "PAID", amount: 6600 };

test("delayed bank replies and retry timers cannot affect another basket, register or organization", () => {
  assert.equal(isCurrentPaymentCheckout(scope, scope), true);
  for (const current of [
    { ...scope, clientSaleId: "next-sale" },
    { ...scope, clientSaleId: null },
    { ...scope, registerId: "another-register" },
    { ...scope, organizationId: "another-org" },
  ]) {
    assert.equal(isCurrentPaymentCheckout(scope, current), false);
    assert.equal(verifiedQPayObservation({ expected: scope, current, invoiceId: "invoice", invoice: paid, entries: [entry] }), null);
  }
});

test("verified payment matches the invoice reference rather than the temporary local entry ID", () => {
  assert.deepEqual(verifiedQPayObservation({ expected: scope, current: scope, invoiceId: "invoice", invoice: paid, entries: [entry] }),
    { entryId: "request-reference", amount: 6600 });
});

test("a duplicate confirmation or removed payment cannot re-trigger automatic checkout", () => {
  for (const entries of [[], [{ ...entry, status: "confirmed" as const }], [{ ...entry, method: "CARD" as const }]]) {
    assert.equal(verifiedQPayObservation({ expected: scope, current: scope, invoiceId: "invoice", invoice: paid, entries }), null);
  }
});

test("pending, expired and mismatched bank evidence cannot confirm the basket", () => {
  for (const status of ["PENDING", "EXPIRED"]) {
    assert.equal(verifiedQPayObservation({ expected: scope, current: scope, invoiceId: "invoice", invoice: { ...paid, status }, entries: [entry] }), null);
  }
  for (const invoice of [{ ...paid, invoiceId: "other" }, { ...paid, amount: 6601 }, { ...paid, amount: NaN }, { ...paid, amount: 0 }]) {
    assert.throws(() => verifiedQPayObservation({ expected: scope, current: scope, invoiceId: "invoice", invoice, entries: [entry] }), /зөрүүтэй/);
  }
});

test("server-reviewed unpaid cleanup cannot discard paid, split, loyalty, credit or company baskets", () => {
  const plain = { invoiceId: "invoice", entries: [entry], basketTotal: 6600, loyaltyMode: "NONE",
    hasLoyaltyRedeemSession: false, creditRepayment: false, companyReceipt: false };
  assert.equal(canReleaseReviewedUnpaidQr(plain), true);
  for (const unsafe of [{ entries: [{ ...entry, status: "confirmed" as const }] },
    { entries: [entry, { ...entry, id: "cash", method: "CASH" as const }] },
    { basketTotal: 13200 }, { loyaltyMode: "EARN" }, { hasLoyaltyRedeemSession: true },
    { creditRepayment: true }, { companyReceipt: true }, { invoiceId: "other" }]) {
    assert.equal(canReleaseReviewedUnpaidQr({ ...plain, ...unsafe }), false);
  }
});

test("only positive bank cancellation can resolve a pending QR observation", () => {
  const cancelled = { ...paid, status: "EXPIRED", providerCancellationConfirmed: true };
  const base = { expected: scope, current: scope, invoiceId: "invoice", entries: [entry] };
  assert.deepEqual(verifiedQPayCancellation({ ...base, invoice: cancelled }), { entryId: entry.id });
  for (const invoice of [{ ...cancelled, providerCancellationConfirmed: false }, { ...cancelled, providerCancellationConfirmed: undefined },
    { ...cancelled, status: "PENDING" }, { ...cancelled, status: "PAID" }]) {
    assert.equal(verifiedQPayCancellation({ ...base, invoice }), null);
  }
  assert.equal(verifiedQPayCancellation({ ...base, current: { ...scope, clientSaleId: "next" }, invoice: cancelled }), null);
  assert.equal(verifiedQPayCancellation({ ...base, entries: [{ ...entry, status: "confirmed" }], invoice: cancelled }), null);
  assert.throws(() => verifiedQPayCancellation({ ...base, invoice: { ...cancelled, amount: 1 } }), /зөрүүтэй/);
});
