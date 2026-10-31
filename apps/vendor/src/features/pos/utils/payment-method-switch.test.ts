import assert from "node:assert/strict";
import test from "node:test";
import type { CheckoutPaymentEntry } from "../components/PosCheckoutView";
import { canSwitchAfterQrCancellation, paymentMethodSwitchState, preparePaymentMethodSwitch } from "./payment-method-switch";

const card: CheckoutPaymentEntry = { id: "card", method: "CARD", amount: 7500, status: "pending", attemptId: "attempt" };
const qr: CheckoutPaymentEntry = { id: "qr", method: "QR", amount: 7500, status: "pending", invoiceId: "invoice" };

for (const entry of [card, qr]) {
  test(`${entry.method} may switch only after its outstanding request settles`, async () => {
    const entries = [entry];
    let resolved = false;
    const resolving = preparePaymentMethodSwitch(entries, async pending => {
      assert.equal(pending.id, entry.id);
      assert.equal(paymentMethodSwitchState(entries, 7500, false), "waiting");
      resolved = true;
    });
    // Calling the cancellation/check API alone is not proof of settlement.
    await resolving;
    assert.equal(resolved, true);
    assert.equal(paymentMethodSwitchState(entries, 7500, false), "waiting");
    assert.equal(paymentMethodSwitchState([], 7500, false), "ready");
  });

  test(`${entry.method} approval during cancellation must not open a second full payment`, async () => {
    assert.equal(paymentMethodSwitchState([{ ...entry, status: "confirmed" }], 0, false), "paid");
    assert.equal(paymentMethodSwitchState([{ ...entry, amount: 2500, status: "confirmed" }], 5000, false), "ready");
  });
}

test("a payment still being created cannot be bypassed through an empty entries snapshot", () => {
  assert.equal(paymentMethodSwitchState([], 7500, true), "waiting");
});

test("a cancellation error retains all entries and stops further cancellation work", async () => {
  const entries = [qr, card];
  const seen: string[] = [];
  await assert.rejects(preparePaymentMethodSwitch(entries, async entry => {
    seen.push(entry.id);
    throw new Error("Provider unavailable");
  }), /Provider unavailable/);
  assert.deepEqual(seen, [qr.id]);
  assert.equal(entries.length, 2);
  assert.equal(paymentMethodSwitchState(entries, 7500, false), "waiting");
});

test("expiry, abandonment and old API responses do not prove QR cancellation", () => {
  for (const result of [
    { status: "EXPIRED" },
    { status: "EXPIRED", providerCancellationConfirmed: false },
    { status: "PAID", providerCancellationConfirmed: true },
    { status: "PENDING", providerCancellationConfirmed: true },
  ]) assert.equal(canSwitchAfterQrCancellation(result), false);
  assert.equal(canSwitchAfterQrCancellation({ status: "EXPIRED", providerCancellationConfirmed: true }), true);
});

test("confirmed split payments are preserved while only pending entries are resolved", async () => {
  const confirmed = { ...card, status: "confirmed" as const, amount: 2500 };
  const seen: string[] = [];
  await preparePaymentMethodSwitch([confirmed, qr], async entry => { seen.push(entry.id); });
  assert.deepEqual(seen, [qr.id]);
  assert.equal(confirmed.status, "confirmed");
});
