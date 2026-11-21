import assert from "node:assert/strict";
import test from "node:test";
import {
  acknowledgeCancelledQPayRecovery,
  acknowledgeUnstartedQPayRecovery,
  clearQPayCheckoutRecovery,
  loadQPayCheckoutRecovery,
  saveQPayCheckoutRecovery,
  type QPayCheckoutRecovery,
} from "./qpay-checkout-recovery";

const snapshot: Omit<QPayCheckoutRecovery, "updatedAt"> = {
  clientSaleId: "original-sale",
  registerId: "register",
  cart: [
    {
      productId: "product",
      name: "Item",
      qty: 1,
      stockQty: 1,
      unitPrice: 8300,
      baseUnitPrice: 8300,
      priceType: "UNIT",
      taxRate: 0,
      discountAmount: 0,
    },
  ],
  paymentEntries: [
    {
      id: "original-invoice",
      invoiceId: "original-invoice",
      method: "QR",
      amount: 8300,
      status: "pending",
    },
  ],
  qpayModal: null,
  loyaltyRedeemSession: null,
  loyalty: {
    mode: "NONE",
    phone: "",
    lookupLoading: false,
    lookupError: "",
    found: false,
    balance: 0,
    earnRate: 0,
    membershipBadge: "NONE",
    redeemPoints: 0,
  },
};

test("expired or failed cancellation cannot erase durable QR evidence; explicit bank proof releases it", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => {
          map.set(key, value);
        },
        removeItem: (key: string) => {
          map.delete(key);
        },
      },
    },
  });
  try {
    saveQPayCheckoutRecovery("org", snapshot);
    clearQPayCheckoutRecovery("org", "register", snapshot.clientSaleId);
    assert.ok(loadQPayCheckoutRecovery("org", "register"));
    assert.throws(() =>
      acknowledgeCancelledQPayRecovery(
        "org",
        "register",
        snapshot.clientSaleId,
        "original-invoice",
        { status: "EXPIRED", providerCancellationConfirmed: false },
      ),
    );
    assert.ok(loadQPayCheckoutRecovery("org", "register"));
    assert.throws(() =>
      acknowledgeUnstartedQPayRecovery(
        "org",
        "register",
        snapshot.clientSaleId,
        "original-invoice",
        { status: 409 },
      ),
    );
    assert.ok(loadQPayCheckoutRecovery("org", "register"));
    acknowledgeCancelledQPayRecovery(
      "org",
      "register",
      snapshot.clientSaleId,
      "original-invoice",
      { status: "EXPIRED", providerCancellationConfirmed: true },
    );
    assert.equal(loadQPayCheckoutRecovery("org", "register"), null);
    saveQPayCheckoutRecovery("org", snapshot);
    acknowledgeUnstartedQPayRecovery(
      "org",
      "register",
      snapshot.clientSaleId,
      "original-invoice",
      { status: 409, code: "PAYMENT_NOT_STARTED" },
    );
    assert.equal(loadQPayCheckoutRecovery("org", "register"), null);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
