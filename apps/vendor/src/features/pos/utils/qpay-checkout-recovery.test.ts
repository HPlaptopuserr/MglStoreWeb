import assert from "node:assert/strict";
import test from "node:test";
import { saveQPayCheckoutRecovery, loadQPayCheckoutRecovery, clearQPayCheckoutRecovery, claimQPayCheckoutRecovery, detachDeferredQPayCheckout, restoreDeferredQPayCheckout, archiveBlockedQPayCheckoutRecovery, readQPayCheckoutArchiveNotice, parseQPayCheckoutSnapshot, type QPayCheckoutRecovery } from "./qpay-checkout-recovery";

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

const scopedKey = "mglstore.pos.qpay-checkout.v1:archive-org:archive-register";
const archiveRecovery: QPayCheckoutRecovery = {
  registerId: "archive-register", clientSaleId: "prior-sale", cart: [],
  paymentEntries: [{ id: "prior-payment", method: "QR", amount: 20_000, status: "confirmed", invoiceId: "paid-invoice" }],
  qpayModal: null, loyaltyRedeemSession: null, updatedAt: 1,
  loyalty: { mode: "NONE", phone: "", lookupLoading: false, lookupError: "", found: false, balance: 0, earnRate: 0, membershipBadge: "NONE", redeemPoints: 0 },
};

async function withArchiveStorage(run: (storage: Map<string, string>) => Promise<void>) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } } });
  try { await run(storage); }
  finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

test("legacy empty-cart money is archived exactly before a new checkout can claim the till", async () => {
  await withArchiveStorage(async storage => {
    const raw = JSON.stringify(archiveRecovery);
    storage.set(scopedKey, raw);
    const archived = await archiveBlockedQPayCheckoutRecovery("archive-org", "archive-register", async request => {
      assert.equal(request.snapshot, raw);
      assert.equal(request.reason, "EMPTY_CART_PAYMENT");
      assert.equal(request.clientSaleId, "prior-sale");
      assert.equal(storage.get(scopedKey), raw, "active evidence remains until server acknowledgement");
      return { archiveId: "server-audit-1" };
    });
    assert.equal(archived, true);
    assert.equal(storage.has(scopedKey), false);
    assert.equal(storage.get(`${scopedKey}:archived:server-audit-1`), raw);
    assert.equal(readQPayCheckoutArchiveNotice("archive-org", "archive-register")?.archiveId, "server-audit-1");
    assert.throws(() => saveQPayCheckoutRecovery("archive-org", archiveRecovery), /тусад нь хадгалагдсан/);
    assert.equal(storage.get(`${scopedKey}:deferred:prior-sale`), "1", "stale tabs cannot silently reactivate the orphan");
  });
});

test("failed server acknowledgement and cross-tab changes preserve the active snapshot", async () => {
  await withArchiveStorage(async storage => {
    const raw = JSON.stringify(archiveRecovery);
    storage.set(scopedKey, raw);
    await assert.rejects(archiveBlockedQPayCheckoutRecovery("archive-org", "archive-register", async () => {
      throw new Error("server unavailable");
    }));
    assert.equal(storage.get(scopedKey), raw);
    await assert.rejects(archiveBlockedQPayCheckoutRecovery("archive-org", "archive-register", async () => ({ archiveId: "" })));
    assert.equal(storage.get(scopedKey), raw);
    await assert.rejects(archiveBlockedQPayCheckoutRecovery("archive-org", "archive-register", async () => {
      storage.set(scopedKey, "newer state");
      return { archiveId: "server-audit-2" };
    }));
    assert.equal(storage.get(scopedKey), "newer state");
  });
});

test("malformed snapshots are backed up unchanged while valid current baskets are untouched", async () => {
  await withArchiveStorage(async storage => {
    storage.set(scopedKey, "{broken financial snapshot");
    assert.equal(await archiveBlockedQPayCheckoutRecovery("archive-org", "archive-register", async request => {
      assert.equal(request.snapshot, "{broken financial snapshot");
      assert.equal(request.reason, "INVALID_SNAPSHOT");
      return { archiveId: "malformed-audit" };
    }), true);
    assert.equal(storage.get(`${scopedKey}:archived:malformed-audit`), "{broken financial snapshot");
    const valid = { ...archiveRecovery, cart: [{ productId: "p", name: "Item", qty: 1, stockQty: 1, unitPrice: 20_000, baseUnitPrice: 20_000, priceType: "UNIT", taxRate: 0, discountAmount: 0 }] };
    const raw = JSON.stringify(valid);
    storage.set(scopedKey, raw);
    assert.equal(await archiveBlockedQPayCheckoutRecovery("archive-org", "archive-register", async () => {
      throw new Error("must not archive a valid current payment");
    }), false);
    assert.equal(storage.get(scopedKey), raw);
  });
});

test("new invalid snapshots cannot poison storage and normal credit repayment lines remain recoverable", async () => {
  await withArchiveStorage(async storage => {
    assert.throws(() => saveQPayCheckoutRecovery("archive-org", archiveRecovery), /мэдээлэл бүрэн бус/);
    assert.equal(storage.has(scopedKey), false);
    const repayment: QPayCheckoutRecovery = { ...archiveRecovery,
      cart: [{ productId: "credit:credit-1:line-1", name: "Credit repayment", qty: 1, stockQty: 1, unitPrice: 20_000, baseUnitPrice: 20_000, priceType: "UNIT", taxRate: 0, discountAmount: 0 }],
    };
    saveQPayCheckoutRecovery("archive-org", repayment);
    assert.equal(loadQPayCheckoutRecovery("archive-org", "archive-register")?.cart?.[0].productId, "credit:credit-1:line-1");
    assert.equal(await archiveBlockedQPayCheckoutRecovery("archive-org", "archive-register", async () => {
      throw new Error("must not archive a valid credit repayment basket");
    }), false);
    const conflicting = JSON.stringify({ ...repayment, paymentEntries: [...repayment.paymentEntries, { id: "invalid-paid-entry", method: "QR", amount: -10, status: "confirmed" }] });
    assert.equal(parseQPayCheckoutSnapshot(conflicting, "archive-register"), null, "malformed entries cannot be silently dropped");
  });
});

test("local backup failures and colliding archive IDs never discard active financial evidence", async () => {
  await withArchiveStorage(async storage => {
    const raw = JSON.stringify(archiveRecovery);
    storage.set(scopedKey, raw);
    storage.set(`${scopedKey}:archived:duplicate-id`, "another financial snapshot");
    await assert.rejects(archiveBlockedQPayCheckoutRecovery("archive-org", "archive-register", async () => ({ archiveId: "duplicate-id" })));
    assert.equal(storage.get(scopedKey), raw);
    assert.equal(storage.get(`${scopedKey}:archived:duplicate-id`), "another financial snapshot");
    const originalSetItem = window.localStorage.setItem;
    window.localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
    try {
      await assert.rejects(archiveBlockedQPayCheckoutRecovery("archive-org", "archive-register", async () => ({ archiveId: "quota-id" })));
      assert.equal(storage.get(scopedKey), raw);
    } finally { window.localStorage.setItem = originalSetItem; }
  });
});

test("legacy recovery keys remain register scoped during archival", async () => {
  await withArchiveStorage(async storage => {
    const legacyKey = "mglstore.pos.qpay-checkout.v1:archive-org";
    const foreign = JSON.stringify({ ...archiveRecovery, registerId: "other-register" });
    storage.set(legacyKey, foreign);
    await assert.rejects(archiveBlockedQPayCheckoutRecovery("archive-org", "archive-register", async () => {
      throw new Error("must not send another register snapshot");
    }));
    assert.equal(storage.get(legacyKey), foreign);
    const raw = JSON.stringify(archiveRecovery);
    storage.set(legacyKey, raw);
    assert.equal(await archiveBlockedQPayCheckoutRecovery("archive-org", "archive-register", async request => {
      assert.equal(request.snapshot, raw);
      return { archiveId: "legacy-audit" };
    }), true);
    assert.equal(storage.has(legacyKey), false);
    assert.equal(storage.get(`${scopedKey}:archived:legacy-audit`), raw);
  });
});

test("a register checkout restores its entire basket and rejects another tab overwriting payment evidence", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } } });
  const recovery: Omit<QPayCheckoutRecovery, "updatedAt"> = {
    registerId: "register-1", clientSaleId: "sale-1", qpayModal: null, loyaltyRedeemSession: null,
    loyalty: { mode: "NONE", phone: "", lookupLoading: false, lookupError: "", found: false, balance: 0, earnRate: 0, membershipBadge: "NONE", redeemPoints: 0 },
    cart: [{ productId: "product", name: "Large basket", qty: 1, stockQty: 1, unitPrice: 50_000_000, baseUnitPrice: 50_000_000, priceType: "UNIT", taxRate: 0, discountAmount: 0 }],
    paymentEntries: [{ id: "pending", method: "CARD", amount: 50_000_000, status: "pending", attemptId: "bank-attempt" }],
  };
  try {
    await claimQPayCheckoutRecovery("org", recovery);
    assert.deepEqual(loadQPayCheckoutRecovery("org", "register-1")?.cart, recovery.cart);
    assert.equal(loadQPayCheckoutRecovery("org", "register-2"), null);
    await assert.rejects(claimQPayCheckoutRecovery("org", { ...recovery, clientSaleId: "another-tab" }));
    clearQPayCheckoutRecovery("org", "register-1", "another-tab");
    assert.equal(loadQPayCheckoutRecovery("org", "register-1")?.clientSaleId, "sale-1");
    saveQPayCheckoutRecovery("org", { ...recovery, paymentEntries: [{ ...recovery.paymentEntries[0], status: "confirmed" }] });
    saveQPayCheckoutRecovery("org", recovery);
    assert.equal(loadQPayCheckoutRecovery("org", "register-1")?.paymentEntries[0].status, "confirmed", "a stale tab cannot downgrade a verified payment");
    assert.throws(() => saveQPayCheckoutRecovery("org", { ...recovery, paymentEntries: [{ id: "other", method: "CASH", status: "confirmed", amount: 1 }] }));
    clearQPayCheckoutRecovery("org", "register-1");
    assert.ok(loadQPayCheckoutRecovery("org", "register-1"), "an unrelated empty tab cannot clear the checkout");
    clearQPayCheckoutRecovery("org", "register-1", "sale-1");
    assert.ok(loadQPayCheckoutRecovery("org", "register-1"), "a stale empty state cannot delete confirmed money");
    clearQPayCheckoutRecovery("org", "register-1", "sale-1", true);
    assert.equal(loadQPayCheckoutRecovery("org", "register-1"), null);
    saveQPayCheckoutRecovery("org", recovery);
    const [key, raw] = [...storage.entries()][0];
    const broken = JSON.stringify({ ...JSON.parse(raw), cart: [{ ...recovery.cart![0], qty: 0 }] });
    storage.set(key, broken);
    assert.equal(loadQPayCheckoutRecovery("org", "register-1"), null);
    assert.throws(() => saveQPayCheckoutRecovery("org", recovery));
    assert.equal(storage.get(key), broken, "unreadable financial evidence is preserved for review");
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});


test("deferring preserves a complete snapshot, frees a new checkout and prevents stale tabs overwriting it", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } } });
  const original: Omit<QPayCheckoutRecovery, "updatedAt"> = {
    registerId: "register", clientSaleId: "old-customer", qpayModal: null, loyaltyRedeemSession: null,
    loyalty: { mode: "NONE", phone: "", lookupLoading: false, lookupError: "", found: false, balance: 0, earnRate: 0, membershipBadge: "NONE", redeemPoints: 0 },
    cart: [{ productId: "coffee", name: "Coffee", qty: 1, stockQty: 10, unitPrice: 7500, baseUnitPrice: 7500, priceType: "UNIT", taxRate: 0, discountAmount: 0 }],
    paymentEntries: [{ id: "pending", method: "CARD", amount: 7500, status: "pending", attemptId: "original-invoice" }],
  };
  try {
    await claimQPayCheckoutRecovery("org", original);
    const snapshot = loadQPayCheckoutRecovery("org", "register")!;
    assert.throws(() => detachDeferredQPayCheckout("org", "register", snapshot.clientSaleId, snapshot.updatedAt - 1));
    assert.ok(loadQPayCheckoutRecovery("org", "register"), "a stale completion must not clear newer browser evidence");
    detachDeferredQPayCheckout("org", "register", snapshot.clientSaleId, snapshot.updatedAt);
    assert.equal(loadQPayCheckoutRecovery("org", "register"), null);
    assert.throws(() => saveQPayCheckoutRecovery("org", original), "an old tab must not revive the pending checkout");
    const next = { ...original, clientSaleId: "next-customer", paymentEntries: [{ id: "cash", method: "CASH" as const, status: "confirmed" as const, amount: 7500 }] };
    await claimQPayCheckoutRecovery("org", next);
    const recovered = parseQPayCheckoutSnapshot(JSON.stringify(snapshot), "register")!;
    assert.equal(recovered.paymentEntries[0].attemptId, "original-invoice");
    await assert.rejects(restoreDeferredQPayCheckout("org", recovered));
    assert.equal(loadQPayCheckoutRecovery("org", "register")?.clientSaleId, "next-customer");
    clearQPayCheckoutRecovery("org", "register", "next-customer", true);
    recovered.paymentEntries[0].status = "confirmed";
    await restoreDeferredQPayCheckout("org", recovered);
    assert.deepEqual(loadQPayCheckoutRecovery("org", "register")?.cart, original.cart);
    assert.equal(loadQPayCheckoutRecovery("org", "register")?.paymentEntries[0].status, "confirmed");
    clearQPayCheckoutRecovery("org", "register", "old-customer");
    assert.ok(loadQPayCheckoutRecovery("org", "register"), "confirmed money cannot be discarded after restoration");
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});


test("legacy missing-basket money cannot seed another basket and is archived before reuse", async () => {
  await withArchiveStorage(async storage => {
    const { cart: _cart, ...withoutBasket } = archiveRecovery;
    const raw = JSON.stringify(withoutBasket);
    const legacyKey = "mglstore.pos.qpay-checkout.v1:archive-org";
    storage.set(legacyKey, raw);
    assert.equal(loadQPayCheckoutRecovery("archive-org", "archive-register"), null);
    assert.equal(parseQPayCheckoutSnapshot(raw, "archive-register"), null);
    await archiveBlockedQPayCheckoutRecovery("archive-org", "archive-register", async request => {
      assert.equal(request.snapshot, raw);
      assert.equal(request.reason, "INVALID_SNAPSHOT");
      return { archiveId: "legacy-no-basket" };
    });
    assert.equal(storage.get(`${scopedKey}:archived:legacy-no-basket`), raw);
    assert.equal(storage.has(legacyKey), false);
    assert.equal(loadQPayCheckoutRecovery("archive-org", "archive-register"), null);
    assert.throws(() => saveQPayCheckoutRecovery("archive-org", { ...withoutBasket, clientSaleId: "new-scoped-checkout" }));
    assert.equal(storage.has(scopedKey), false, "new scoped claims require their own valid basket");
  });
});
