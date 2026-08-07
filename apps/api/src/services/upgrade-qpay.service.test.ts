import assert from "node:assert/strict";
import test from "node:test";
import {
  UpgradeQPayConfigurationError,
  calculateUpgradeRenewalExpiration,
  hasSufficientUpgradePayment,
  resolveUpgradeQPayMerchantContext,
} from "./upgrade-qpay.service";

test("upgrade QPay uses the dedicated platform merchant as one complete set", () => {
  const context = resolveUpgradeQPayMerchantContext({
    QPAY_CLIENT_ID: "shared-user",
    QPAY_CLIENT_SECRET: "shared-secret",
    QPAY_INVOICE_CODE: "SHARED",
    QPAY_UPGRADE_CLIENT_ID: "upgrade-user",
    QPAY_UPGRADE_CLIENT_SECRET: "upgrade-secret",
    QPAY_UPGRADE_INVOICE_CODE: "UPGRADE",
  });

  assert.equal(context.username, "upgrade-user");
  assert.equal(context.password, "upgrade-secret");
  assert.equal(context.invoiceCode, "UPGRADE");
  assert.equal(context.merchantId, undefined);
  assert.equal(context.bankAccounts, undefined);
});

test("upgrade QPay rejects a partial dedicated merchant configuration", () => {
  assert.throws(
    () =>
      resolveUpgradeQPayMerchantContext({
        QPAY_CLIENT_ID: "shared-user",
        QPAY_CLIENT_SECRET: "shared-secret",
        QPAY_INVOICE_CODE: "SHARED",
        QPAY_UPGRADE_CLIENT_ID: "upgrade-user",
      }),
    UpgradeQPayConfigurationError,
  );
});

test("upgrade payment requires the full invoiced amount to be paid", () => {
  assert.equal(
    hasSufficientUpgradePayment(
      {
        count: 1,
        paid_amount: 29_999,
        rows: [
          {
            payment_id: "payment-1",
            payment_status: "PAID",
            payment_amount: 29_999,
            transaction_id: "transaction-1",
          },
        ],
      },
      30_000,
    ),
    false,
  );

  assert.equal(
    hasSufficientUpgradePayment(
      {
        count: 1,
        paid_amount: 30_000,
        rows: [
          {
            payment_id: "payment-2",
            payment_status: "PAID",
            payment_amount: 30_000,
            transaction_id: "transaction-2",
          },
        ],
      },
      30_000,
    ),
    true,
  );
});

test("renewal keeps remaining paid time and expired access restarts now", () => {
  const paidAt = new Date("2026-08-07T00:00:00.000Z");
  const activeExpiry = new Date("2026-08-20T00:00:00.000Z");
  const plan = { id: "silver_1m", durationDays: 30 };

  assert.equal(
    calculateUpgradeRenewalExpiration(plan, activeExpiry, paidAt).toISOString(),
    "2026-09-19T00:00:00.000Z",
  );
  assert.equal(
    calculateUpgradeRenewalExpiration(
      plan,
      new Date("2026-08-01T00:00:00.000Z"),
      paidAt,
    ).toISOString(),
    "2026-09-06T00:00:00.000Z",
  );
});
