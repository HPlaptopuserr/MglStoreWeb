import assert from "node:assert/strict";
import test from "node:test";
import { detachReviewedQPayCheckout, loadQPayCheckoutRecovery, saveQPayCheckoutRecovery, checkoutRecoveryStorageKey, type QPayCheckoutRecovery } from "./qpay-checkout-recovery";

test("review release keeps the complete original snapshot and cannot discard another or confirmed payment", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  let failArchive = false;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { if (failArchive && key.includes(":review:")) throw new Error("disk full"); storage.set(key, value); },
    removeItem: (key: string) => storage.delete(key),
  } } });
  const saved: Omit<QPayCheckoutRecovery, "updatedAt"> = {
    clientSaleId: "sale", registerId: "register", qpayModal: null, loyaltyRedeemSession: null,
    loyalty: { mode: "NONE", phone: "", lookupLoading: false, lookupError: "", found: false, balance: 0, earnRate: 0, membershipBadge: "NONE", redeemPoints: 0 },
    paymentEntries: [{ id: "qr", invoiceId: "invoice", method: "QR", status: "pending", amount: 21600 }],
  };
  try {
    saveQPayCheckoutRecovery("org", saved);
    assert.throws(() => detachReviewedQPayCheckout("org", "register", "other-invoice", "audit"));
    failArchive = true;
    assert.throws(() => detachReviewedQPayCheckout("org", "register", "invoice", "audit"), /disk full/);
    assert.equal(loadQPayCheckoutRecovery("org", "register")?.clientSaleId, "sale");
    failArchive = false;
    const original = loadQPayCheckoutRecovery("org", "register");
    assert.equal(detachReviewedQPayCheckout("org", "register", "invoice", "audit"), "sale");
    assert.equal(loadQPayCheckoutRecovery("org", "register"), null);
    assert.deepEqual(JSON.parse(storage.get(`${checkoutRecoveryStorageKey("org", "register")}:review:audit`)!), JSON.parse(JSON.stringify(original)));
    storage.clear();
    saveQPayCheckoutRecovery("org", { ...saved, paymentEntries: [{ ...saved.paymentEntries[0]!, status: "confirmed" }] });
    assert.throws(() => detachReviewedQPayCheckout("org", "register", "invoice", "audit"));
    assert.equal(loadQPayCheckoutRecovery("org", "register")?.paymentEntries[0]?.status, "confirmed");
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
