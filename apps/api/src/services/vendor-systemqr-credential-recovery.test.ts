import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { prisma } from "@mgl/database";
import {
  connectVendorMerchant,
  recoverVendorSystemQrCredentials,
} from "./vendor-merchant.service";

const merchantCode = "MGL_STEPPE_TEST";
const restores: Array<() => void> = [];
let providerCalls = 0;
let organizationUpdates: Array<Record<string, unknown>> = [];

function stub(target: object, key: string, value: unknown) {
  const previous = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => Reflect.set(target, key, previous));
}

function connectedOrganization(overrides: Record<string, unknown> = {}) {
  return {
    qpayEnabled: true,
    qpayMerchantId: merchantCode,
    qpayMerchantKey: "systemqr",
    qpayInvoiceCode: "SYSTEMQR",
    qpayConnectedAt: new Date("2026-10-13T00:00:00.000Z"),
    webQpayEnabled: false,
    webQpayMerchantId: null,
    webQpayMerchantKey: null,
    webQpayInvoiceCode: null,
    webQpayConnectedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  providerCalls = 0;
  organizationUpdates = [];
  stub(prisma.organization, "update", async ({ data }: { data: Record<string, unknown> }) => {
    organizationUpdates.push(data);
    return {};
  });
});

afterEach(() => {
  while (restores.length) restores.pop()?.();
});

test("credential recovery stops before Minu when another organization uses the code", async () => {
  stub(prisma.organization, "findUnique", async () => connectedOrganization());
  stub(prisma.organization, "findFirst", async () => ({ id: "other-org" }));
  stub(globalThis, "fetch", async () => {
    providerCalls += 1;
    throw new Error("Minu must not be called");
  });

  const result = await recoverVendorSystemQrCredentials(
    "target-org",
    "POS",
    merchantCode,
  );

  assert.equal(result.success, false);
  assert.match(result.message, /өөр байгууллагад идэвхтэй ашиглагдаж/);
  assert.equal(providerCalls, 0);
  assert.equal(organizationUpdates.length, 0);
});

test("credential recovery rejects a stale merchant code before Minu is called", async () => {
  let conflictChecks = 0;
  stub(prisma.organization, "findUnique", async () => connectedOrganization());
  stub(prisma.organization, "findFirst", async () => {
    conflictChecks += 1;
    return null;
  });
  stub(globalThis, "fetch", async () => {
    providerCalls += 1;
    throw new Error("Minu must not be called");
  });

  const result = await recoverVendorSystemQrCredentials(
    "target-org",
    "POS",
    "A_DIFFERENT_CODE",
  );

  assert.equal(result.success, false);
  assert.match(result.message, /Merchant code өөрчлөгдсөн/);
  assert.equal(conflictChecks, 0);
  assert.equal(providerCalls, 0);
  assert.equal(organizationUpdates.length, 0);
});

test("credential recovery updates both channels only when the same organization shares the code", async () => {
  stub(
    prisma.organization,
    "findUnique",
    async () =>
      connectedOrganization({
        webQpayEnabled: true,
        webQpayMerchantId: merchantCode,
        webQpayMerchantKey: "systemqr",
        webQpayInvoiceCode: "SYSTEMQR",
        webQpayConnectedAt: new Date("2026-10-12T00:00:00.000Z"),
      }),
  );
  stub(prisma.organization, "findFirst", async () => null);

  const previousUsername = process.env.SYSTEMQR_USERNAME;
  const previousPassword = process.env.SYSTEMQR_PASSWORD;
  process.env.SYSTEMQR_USERNAME = "recovery-test-master";
  process.env.SYSTEMQR_PASSWORD = "recovery-test-secret";
  restores.push(() => {
    if (previousUsername === undefined) delete process.env.SYSTEMQR_USERNAME;
    else process.env.SYSTEMQR_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.SYSTEMQR_PASSWORD;
    else process.env.SYSTEMQR_PASSWORD = previousPassword;
  });

  stub(globalThis, "fetch", async (input: string | URL | Request) => {
    providerCalls += 1;
    const url = String(input);
    if (url.endsWith("/login")) {
      return new Response(
        JSON.stringify({ status: "000", message: "OK", entity: "token" }),
        { status: 200 },
      );
    }
    assert.match(url, /\/qrMerchant\/resetPassword$/);
    return new Response(
      JSON.stringify({
        status: "000",
        message: "OK",
        entity: {
          merchantCode,
          username: merchantCode,
          password: "new-password",
        },
      }),
      { status: 200 },
    );
  });

  const result = await recoverVendorSystemQrCredentials(
    "target-org",
    "POS",
    merchantCode,
  );

  assert.equal(result.success, true);
  assert.equal(providerCalls, 2);
  assert.equal(organizationUpdates.length, 1);
  const update = organizationUpdates[0];
  assert.equal(update.qpayMerchantId, merchantCode);
  assert.equal(update.webQpayMerchantId, merchantCode);
  assert.equal(update.qpayInvoiceCode, "SYSTEMQR");
  assert.equal(update.webQpayInvoiceCode, "SYSTEMQR");
  assert.equal(update.qpayMerchantKey, update.webQpayMerchantKey);
  assert.match(String(update.qpayMerchantKey), /^systemqr:v1:/);
});

test("manual SystemQR connection refuses a code active in another organization", async () => {
  stub(prisma.organization, "findUnique", async () => ({ id: "target-org" }));
  stub(prisma.organization, "findFirst", async () => ({ id: "other-org" }));

  const result = await connectVendorMerchant(
    "target-org",
    merchantCode,
    "systemqr",
    "SYSTEMQR",
    "POS",
  );

  assert.equal(result.success, false);
  assert.match(result.message, /өөр байгууллагад идэвхтэй ашиглагдаж/);
  assert.equal(organizationUpdates.length, 0);
});
