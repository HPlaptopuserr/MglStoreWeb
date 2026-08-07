import assert from "node:assert/strict";
import test from "node:test";
import {
  UpgradeMinuConfigurationError,
  buildUpgradeMinuWebhookUrl,
  calculateUpgradeRenewalExpiration,
  hasSufficientLegacyQPayPayment,
  resolveUpgradeMinuMerchantConfig,
} from "./upgrade-minu.service";

test("upgrade Minu uses one platform merchant with server credentials", () => {
  const config = resolveUpgradeMinuMerchantConfig({
    SYSTEMQR_USERNAME: "platform-user",
    SYSTEMQR_PASSWORD: "platform-password",
    SYSTEMQR_UPGRADE_MERCHANT_CODE: "MGLSTORE-MERCHANT",
  });

  assert.deepEqual(config, {
    merchantCode: "MGLSTORE-MERCHANT",
    username: "platform-user",
    password: "platform-password",
  });
});

test("upgrade Minu can use the existing platform username as merchant code", () => {
  const config = resolveUpgradeMinuMerchantConfig({
    SYSTEMQR_USERNAME: "platform-merchant",
    SYSTEMQR_PASSWORD: "platform-password",
  });

  assert.equal(config.merchantCode, "platform-merchant");
  assert.equal(config.username, "platform-merchant");
});

test("upgrade Minu rejects a partial dedicated credential pair", () => {
  assert.throws(
    () =>
      resolveUpgradeMinuMerchantConfig({
        SYSTEMQR_USERNAME: "platform-user",
        SYSTEMQR_PASSWORD: "platform-password",
        SYSTEMQR_UPGRADE_USERNAME: "upgrade-user",
      }),
    UpgradeMinuConfigurationError,
  );
});

test("upgrade Minu webhook points back to the exact organization invoice", () => {
  assert.equal(
    buildUpgradeMinuWebhookUrl("UPG-123", "org-123", {
      API_PUBLIC_URL: "https://api.mglstore.mn",
    }),
    "https://api.mglstore.mn/api/vendor/upgrade/callback?orgId=org-123&invoiceNo=UPG-123",
  );
});

test("legacy QPay payment requires the full invoiced amount", () => {
  assert.equal(
    hasSufficientLegacyQPayPayment(
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
