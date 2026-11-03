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
    recovery.qpayModal = {
      open: true,
      invoiceId: "invoice-1",
      amount: 100,
      qrText: "expired-qr",
      qrImage: "",
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    };
    saveQPayCheckoutRecovery("org-1", recovery);
    assert.equal(loadQPayCheckoutRecovery("org-1")?.qpayModal, null, "expired QR must not reopen after refresh");
    recovery.qpayModal = {
      ...recovery.qpayModal,
      qrText: "active-qr",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    saveQPayCheckoutRecovery("org-1", recovery);
    assert.equal(loadQPayCheckoutRecovery("org-1")?.qpayModal?.qrText, "active-qr");
    recovery.paymentEntries = [{ id: "qr", method: "QR", status: "confirmed", amount: 100, invoiceId: "invoice-1" }];
    saveQPayCheckoutRecovery("org-1", recovery);
    assert.equal(loadQPayCheckoutRecovery("org-1")?.paymentEntries[0].invoiceId, "invoice-1");
    recovery.paymentEntries = [{ id: "card", method: "CARD", status: "confirmed", amount: 39140, attemptId: "paid-attempt", transactionId: "123456789012" }];
    saveQPayCheckoutRecovery("org-1", recovery);
    assert.equal(loadQPayCheckoutRecovery("org-1")?.paymentEntries[0].attemptId, "paid-attempt", "verified card references must survive refresh without recharging");
    recovery.paymentEntries = [{ id: "cash-first", method: "CASH", status: "confirmed", amount: 3000, cash: { receivedAmount: 3000, changeAmount: 0 } }];
    saveQPayCheckoutRecovery("org-1", recovery);
    assert.equal(loadQPayCheckoutRecovery("org-1")?.paymentEntries[0].amount, 3000, "cash-first partial payments survive reload before adding bank payments");

    recovery.paymentEntries = [{ id: "pending-card", method: "CARD", status: "pending", amount: 2000, attemptId: "unresolved-bank-attempt" }];
    saveQPayCheckoutRecovery("org-1", recovery);
    assert.equal(loadQPayCheckoutRecovery("org-1")?.paymentEntries[0].attemptId, "unresolved-bank-attempt", "uncertain card references survive refresh for verification without a new charge");
    assert.equal(loadQPayCheckoutRecovery("org-2"), null);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
