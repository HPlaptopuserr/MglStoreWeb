import assert from "node:assert/strict";
import test from "node:test";
import { saveQPayCheckoutRecovery, loadQPayCheckoutRecovery, type QPayCheckoutRecovery } from "./qpay-checkout-recovery";

test("pending QR references survive reload and remain organization scoped", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } } });
  const recovery: Omit<QPayCheckoutRecovery, "updatedAt"> = {
    clientSaleId: "stable-sale", qpayModal: null, loyaltyRedeemSession: null,
    loyalty: { mode: "NONE", phone: "", lookupLoading: false, lookupError: "", found: false, balance: 0, earnRate: 0, membershipBadge: "NONE", redeemPoints: 0 },
    paymentEntries: [{ id: "qr", method: "QR", status: "pending", amount: 100, invoiceId: "invoice-1" }],
  };
  try {
    saveQPayCheckoutRecovery("org-1", recovery);
    assert.equal(loadQPayCheckoutRecovery("org-1")?.paymentEntries[0].invoiceId, "invoice-1");
    assert.equal(loadQPayCheckoutRecovery("org-1")?.clientSaleId, "stable-sale");
    assert.equal(loadQPayCheckoutRecovery("org-2"), null);
    for (const [key, raw] of storage) storage.set(key, JSON.stringify({ ...JSON.parse(raw), updatedAt: Date.now() - 48 * 60 * 60 * 1000 }));
    assert.equal(loadQPayCheckoutRecovery("org-1")?.paymentEntries[0].invoiceId, "invoice-1", "unresolved money must not disappear after 24 hours");
    recovery.paymentEntries = [{ id: "qr", method: "QR", status: "confirmed", amount: 100, invoiceId: "invoice-1" }];
    saveQPayCheckoutRecovery("org-1", recovery);
    assert.equal(loadQPayCheckoutRecovery("org-1")?.paymentEntries[0].invoiceId, "invoice-1");
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
