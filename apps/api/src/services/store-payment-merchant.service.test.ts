import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { prisma } from "@mgl/database";
import { encodeSystemQrMerchantAuth } from "./systemqr-merchant-auth";
import { getStorePaymentMerchant } from "./store-payment-merchant.service";

const original = prisma.organization.findUnique;
afterEach(() => { Reflect.set(prisma.organization, "findUnique", original); });

const merchant = {
  qpayEnabled: true,
  qpayMerchantId: "connected-pos-merchant",
  qpayMerchantKey: encodeSystemQrMerchantAuth("connected-pos-merchant", "seller-password"),
  qpayInvoiceCode: "SYSTEMQR",
  webQpayEnabled: true,
  webQpayMerchantId: "outdated-web-merchant",
  webQpayMerchantKey: "systemqr",
  webQpayInvoiceCode: "SYSTEMQR",
};

test("Store selects the connected account displayed by Profile/Org/Vendor instead of stale WEB settings", async () => {
  Reflect.set(prisma.organization, "findUnique", async () => merchant);
  const result = await getStorePaymentMerchant("seller");
  assert.equal(result?.provider, "SYSTEMQR");
  assert.equal(result?.channel, "POS");
  if (result?.provider !== "SYSTEMQR") assert.fail("Expected seller SystemQR account");
  assert.equal(result.config.merchantCode, "connected-pos-merchant");
  assert.equal(result.config.username, "connected-pos-merchant");
  assert.equal(result.config.password, "seller-password");
});

test("WEB-only sellers retain their own WEB account", async () => {
  Reflect.set(prisma.organization, "findUnique", async () => ({ ...merchant, qpayEnabled: false }));
  const result = await getStorePaymentMerchant("seller");
  assert.equal(result?.channel, "WEB");
  if (result?.provider !== "SYSTEMQR") assert.fail("Expected WEB SystemQR account");
  assert.equal(result.config.merchantCode, "outdated-web-merchant");
});

test("unconnected seller never receives a platform merchant fallback", async () => {
  Reflect.set(prisma.organization, "findUnique", async () => ({ ...merchant, qpayEnabled: false, webQpayEnabled: false }));
  assert.equal(await getStorePaymentMerchant("seller"), null);
});

test("seller accounts stay isolated by organization", async () => {
  const requested: string[] = [];
  Reflect.set(prisma.organization, "findUnique", async ({ where }: { where: { id: string } }) => {
    requested.push(where.id);
    return { ...merchant, qpayMerchantId: where.id, qpayMerchantKey: encodeSystemQrMerchantAuth(where.id, "password") };
  });
  for (const id of ["seller-a", "seller-b"]) {
    const result = await getStorePaymentMerchant(id);
    if (result?.provider !== "SYSTEMQR") assert.fail("Expected seller account");
    assert.equal(result.config.merchantCode, id);
    assert.equal(result.config.username, id);
  }
  assert.deepEqual(requested, ["seller-a", "seller-b"]);
});

test("configuration lookup errors do not silently select a different account", async () => {
  Reflect.set(prisma.organization, "findUnique", async () => { throw new Error("Database unavailable"); });
  await assert.rejects(getStorePaymentMerchant("seller"), /Database unavailable/);
});
