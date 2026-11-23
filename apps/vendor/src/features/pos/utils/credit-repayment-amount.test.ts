import assert from "node:assert/strict";
import test from "node:test";
import { allocateCreditReceiptAmounts } from "./credit-repayment-amount";
import { isCreditRepaymentContext } from "./credit-repayment-context";

test("partial repayment receipt lines always sum to the exact amount including one cent", () => {
  for (const amount of [0.01, 0.02, 20000, 99999.99]) {
    const values = allocateCreditReceiptAmounts(
      [10000, 25000, 15000, 50000],
      amount,
    );
    assert.equal(
      values.reduce((sum, value) => sum + Math.round(value * 100), 0),
      Math.round(amount * 100),
    );
    assert.ok(values.every((value) => value >= 0));
  }
});
test("recovery context binds the chosen amount, original credits and retry key", () => {
  const value = {
    requestId: "retry-key",
    credit: {
      id: "credit",
      saleId: "sale",
      receiptNo: "receipt",
      borrowerName: "Test",
      createdAt: "2026-01-01T00:00:00Z",
      principalAmount: 100000,
      totalDue: 70000,
      repaymentAmount: 20000,
      lines: [
        {
          id: "line",
          productId: "product",
          productName: "Test",
          qty: 1,
          unitPrice: 100000,
          lineTotal: 100000,
        },
      ],
    },
  };
  assert.equal(isCreditRepaymentContext(value), true);
  assert.equal(isCreditRepaymentContext({ ...value, requestId: "" }), false);
  assert.equal(
    isCreditRepaymentContext({
      ...value,
      credit: { ...value.credit, repaymentAmount: 70000.01 },
    }),
    false,
  );
  assert.equal(
    isCreditRepaymentContext({
      ...value,
      credit: { ...value.credit, credits: "broken" },
    }),
    false,
  );
});

test("repayment identity survives reload and an older save without credit metadata", async () => {
  const {
    saveQPayCheckoutRecovery,
    loadQPayCheckoutRecovery,
    checkoutRecoveryStorageKey,
  } = await import("./qpay-checkout-recovery");
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    },
  });
  const context = {
    requestId: "retry-key",
    credit: {
      id: "credit",
      saleId: "sale",
      receiptNo: "receipt",
      borrowerName: "Test",
      createdAt: "2026-01-01T00:00:00Z",
      principalAmount: 100000,
      totalDue: 70000,
      repaymentAmount: 20000,
      lines: [
        {
          id: "line",
          productId: "product",
          productName: "Test",
          qty: 1,
          unitPrice: 100000,
          lineTotal: 100000,
        },
      ],
    },
  };
  if (!isCreditRepaymentContext(context)) throw new Error("Invalid fixture");
  try {
    const saved = {
      clientSaleId: "checkout",
      registerId: "register",
      qpayModal: null,
      loyaltyRedeemSession: null,
      loyalty: {
        mode: "NONE" as const,
        phone: "",
        lookupLoading: false,
        lookupError: "",
        found: false,
        balance: 0,
        earnRate: 0,
        membershipBadge: "NONE" as const,
        redeemPoints: 0,
      },
      paymentEntries: [
        {
          id: "qr",
          invoiceId: "invoice",
          method: "QR" as const,
          status: "pending" as const,
          amount: 20000,
        },
      ],
    };
    saveQPayCheckoutRecovery("org", { ...saved, creditRepayment: context });
    assert.deepEqual(
      loadQPayCheckoutRecovery("org", "register")?.creditRepayment,
      context,
    );
    saveQPayCheckoutRecovery("org", saved);
    assert.deepEqual(
      loadQPayCheckoutRecovery("org", "register")?.creditRepayment,
      context,
    );
    const key = checkoutRecoveryStorageKey("org", "register");
    const raw = JSON.parse(storage.get(key)!);
    raw.creditRepayment.requestId = "";
    storage.set(key, JSON.stringify(raw));
    assert.equal(loadQPayCheckoutRecovery("org", "register"), null);
    assert.ok(
      storage.get(key),
      "corrupt repayment evidence must remain available for review",
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
