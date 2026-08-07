import assert from "node:assert/strict";
import test from "node:test";
import {
  UpgradeMinuConfigurationError,
  buildUpgradeMinuWebhookUrl,
  calculateUpgradeRenewalExpiration,
  hasSufficientLegacyQPayPayment,
  resolveUpgradeMinuMerchantConfig,
  resolveUpgradeMerchantCodeFromSettings,
  resolveUpgradePaymentAccountFromSettings,
} from "./upgrade-minu.service";

test("upgrade Minu uses one platform merchant with server credentials", () => {
  const config = resolveUpgradeMinuMerchantConfig(
    {
      SYSTEMQR_USERNAME: "platform-user",
      SYSTEMQR_PASSWORD: "platform-password",
    },
    "MGLSTORE-MERCHANT",
  );

  assert.deepEqual(config, {
    merchantCode: "MGLSTORE-MERCHANT",
    username: "platform-user",
    password: "platform-password",
  });
});

test("upgrade Minu requires an explicit platform merchant code", () => {
  assert.throws(
    () =>
      resolveUpgradeMinuMerchantConfig({
        SYSTEMQR_USERNAME: "platform-user",
        SYSTEMQR_PASSWORD: "platform-password",
      }),
    UpgradeMinuConfigurationError,
  );
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

test("upgrade Minu allows a subMerchant username equal to its merchant code", () => {
  const config = resolveUpgradeMinuMerchantConfig(
    {
      SYSTEMQR_USERNAME: "master-user",
      SYSTEMQR_PASSWORD: "master-password",
      SYSTEMQR_UPGRADE_USERNAME: "SUB-MERCHANT",
      SYSTEMQR_UPGRADE_PASSWORD: "sub-password",
    },
    "SUB-MERCHANT",
  );

  assert.equal(config.merchantCode, "SUB-MERCHANT");
  assert.equal(config.username, "SUB-MERCHANT");
});

test("upgrade Minu resolves only the account selected by Admin", () => {
  const selection = JSON.stringify({ accountId: "upgrade-account" });
  const accounts = JSON.stringify([
    { id: "other-account", merchantCode: "OTHER-MERCHANT" },
    {
      id: "upgrade-account",
      merchantCode: "UPGRADE-MERCHANT",
      username: "upgrade-user",
      password: "upgrade-password",
    },
  ]);
  const merchantCode = resolveUpgradeMerchantCodeFromSettings(
    selection,
    accounts,
  );
  const account = resolveUpgradePaymentAccountFromSettings(selection, accounts);

  assert.equal(merchantCode, "UPGRADE-MERCHANT");
  assert.deepEqual(account, {
    id: "upgrade-account",
    merchantCode: "UPGRADE-MERCHANT",
    username: "upgrade-user",
    password: "upgrade-password",
  });
});

test("upgrade Minu rejects a missing Admin account selection", () => {
  assert.equal(
    resolveUpgradeMerchantCodeFromSettings(
      JSON.stringify({ accountId: "deleted-account" }),
      JSON.stringify([{ id: "active-account", merchantCode: "ACTIVE" }]),
    ),
    "",
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
