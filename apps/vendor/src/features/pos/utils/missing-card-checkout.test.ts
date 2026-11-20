import assert from "node:assert/strict";
import test from "node:test";
import { archiveMissingCardCheckout, canArchiveMissingCardCheckout, readMissingCardArchiveNotice } from "./missing-card-checkout";
import { checkoutRecoveryStorageKey, type QPayCheckoutRecovery } from "./qpay-checkout-recovery";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
const recovery: QPayCheckoutRecovery = {
  clientSaleId: "sale", registerId: "register", updatedAt: 10, qpayModal: null, loyaltyRedeemSession: null,
  cart: [{ productId: "product", name: "Product", qty: 1, stockQty: 10, unitPrice: 25100,
    baseUnitPrice: 25100, priceType: "UNIT", taxRate: 0, discountAmount: 0 }],
  paymentEntries: [{ id: "entry", method: "CARD", status: "pending", amount: 25100, attemptId: "missing" }],
  loyalty: { mode: "NONE", phone: "", lookupLoading: false, lookupError: "", found: false, balance: 0, earnRate: 0,
    membershipBadge: "NONE", redeemPoints: 0 },
};
const key = checkoutRecoveryStorageKey("org", "register");
const prepare = () => {
  const storage = new MemoryStorage();
  storage.setItem(key, JSON.stringify(recovery));
  return storage;
};
const archive = async () => ({ archiveId: "proof" });
const run = (storage: Storage, callback = archive) => archiveMissingCardCheckout({
  organizationId: "org", registerId: "register", clientSaleId: "sale", missingIds: ["missing"], storage, archive: callback,
});

test("a 404 only offers archival; confirmed, mixed and real pending payments stay protected", () => {
  assert.equal(canArchiveMissingCardCheckout(recovery.paymentEntries, ["missing"]), true);
  assert.equal(canArchiveMissingCardCheckout(recovery.paymentEntries, []), false);
  assert.equal(canArchiveMissingCardCheckout([], ["missing"]), false);
  for (const replacement of [
    { ...recovery.paymentEntries[0], status: "confirmed" as const },
    { ...recovery.paymentEntries[0], method: "QR" as const },
    { ...recovery.paymentEntries[0], method: "CASH" as const, status: "confirmed" as const },
  ]) assert.equal(canArchiveMissingCardCheckout([replacement], ["missing"]), false);
});

test("saves exact financial evidence server-side and locally before freeing the basket", async () => {
  const storage = prepare();
  const exact = storage.getItem(key);
  const notice = await run(storage, async () => {
    assert.equal(storage.getItem(key), exact, "the basket remains active until server acknowledgement");
    return { archiveId: "proof" };
  });
  assert.equal(storage.getItem(key), null);
  assert.equal(storage.getItem(`${key}:archived:proof`), exact);
  assert.equal(storage.getItem(`${key}:deferred:sale`), "1", "old tabs cannot revive the same checkout");
  assert.deepEqual(readMissingCardArchiveNotice("org", "register", storage), notice);
  assert.equal(readMissingCardArchiveNotice("org", "other-register", storage), null);
});

test("no acknowledgement, server rejection or a changed basket cannot erase payment evidence", async () => {
  for (const callback of [
    async () => { throw new Error("existing payment or server unavailable"); },
    async () => ({ archiveId: "" }),
  ]) {
    const storage = prepare();
    const exact = storage.getItem(key);
    await assert.rejects(run(storage, callback));
    assert.equal(storage.getItem(key), exact);
  }
  const storage = prepare();
  const newer = JSON.stringify({ ...recovery, updatedAt: 11 });
  await assert.rejects(run(storage, async () => { storage.setItem(key, newer); return { archiveId: "proof" }; }));
  assert.equal(storage.getItem(key), newer);
});

test("local backup failure preserves the active checkout despite server acknowledgement", async () => {
  const storage = prepare();
  const exact = storage.getItem(key);
  const original = storage.setItem.bind(storage);
  storage.setItem = (name, value) => { if (name.includes(":archived:")) throw new Error("storage full"); original(name, value); };
  await assert.rejects(run(storage));
  assert.equal(storage.getItem(key), exact);
});

test("a wrong sale, register or confirmed payment never reaches the archive API", async () => {
  const storage = prepare();
  let calls = 0;
  const callback = async () => { calls += 1; return { archiveId: "proof" }; };
  storage.setItem(key, JSON.stringify({ ...recovery, paymentEntries: [{ ...recovery.paymentEntries[0], status: "confirmed" }] }));
  await assert.rejects(run(storage, callback));
  storage.setItem(key, JSON.stringify({ ...recovery, clientSaleId: "different" }));
  await assert.rejects(run(storage, callback));
  assert.equal(calls, 0);
});
