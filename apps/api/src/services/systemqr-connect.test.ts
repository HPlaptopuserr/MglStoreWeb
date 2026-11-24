import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { prisma, type Prisma } from "@mgl/database";
import { connectVendorMerchant } from "./vendor-merchant.service";
import { isSystemQrRegistrationDuplicate } from "./systemqr-registration-error";

const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
const env = [
  "SYSTEMQR_BASE_URL",
  "SYSTEMQR_USERNAME",
  "SYSTEMQR_PASSWORD",
] as const;
const savedEnv = new Map(env.map((key) => [key, process.env[key]]));
let writes: Prisma.OrganizationUpdateInput[];
let providerFailure = false;
let requests: string[];
before(() => {
  process.env.SYSTEMQR_BASE_URL = "https://minu.test/qrpay";
  process.env.SYSTEMQR_USERNAME = "fixture-master";
  process.env.SYSTEMQR_PASSWORD = "fixture-password";
});
after(() => {
  for (const key of env) {
    const value = savedEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
beforeEach(() => {
  writes = [];
  requests = [];
  providerFailure = false;
  stub(prisma.organization, "findUnique", async () => ({
    id: "org",
    name: "MGL-312",
  }));
  stub(prisma.organization, "findFirst", async () => null);
  stub(
    prisma.organization,
    "update",
    async ({ data }: Prisma.OrganizationUpdateArgs) => {
      writes.push(data);
      return { id: "org" };
    },
  );
  stub(globalThis, "fetch", async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    requests.push(url);
    if (url.endsWith("/login"))
      return Response.json({ status: "000", entity: "fixture-token" });
    assert.equal(url, "https://minu.test/qrpay/qrMerchant/subMerchant");
    if (providerFailure) throw new Error("Provider unavailable");
    return Response.json({
      status: "000",
      entity: [
        {
          merchantCode: "MGL_STEPPE_1795508501363",
          merchantName: "MGL_312_Төлбөр",
        },
      ],
    });
  });
});
test("SystemQR connects only a code verified by the current Minu API without requiring settlement accounts", async () => {
  const result = await connectVendorMerchant(
    "org",
    " MGL_STEPPE_1795508501363 ",
    "systemqr",
    "SYSTEMQR",
  );
  assert.equal(result.success, true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].qpayMerchantId, "MGL_STEPPE_1795508501363");
  assert.equal(writes[0].qpayInvoiceCode, "SYSTEMQR");
  assert.deepEqual(writes[0].qpayBankAccounts, []);
  assert.ok(requests.some((url) => url.endsWith("/qrMerchant/subMerchant")));
});
test("a display name cannot be saved as a merchant code", async () => {
  const result = await connectVendorMerchant(
    "org",
    "MGL-312",
    "systemqr",
    "SYSTEMQR",
  );
  assert.equal(result.success, false);
  assert.match(result.message, /Merchant Code/);
  assert.equal(writes.length, 0);
});
test("provider failure never creates an apparently connected SystemQR merchant", async () => {
  providerFailure = true;
  const result = await connectVendorMerchant(
    "org",
    "MGL_STEPPE_1795508501363",
    "systemqr",
    "SYSTEMQR",
  );
  assert.equal(result.success, false);
  assert.equal(writes.length, 0);
});
test("a merchant connected to another active organization remains blocked", async () => {
  stub(prisma.organization, "findFirst", async () => ({ id: "other-org" }));
  const result = await connectVendorMerchant(
    "org",
    "MGL_STEPPE_1795508501363",
    "systemqr",
    "SYSTEMQR",
  );
  assert.equal(result.success, false);
  assert.equal(writes.length, 0);
  assert.equal(requests.length, 0);
});
test("the WEB channel uses its own fields", async () => {
  const result = await connectVendorMerchant(
    "org",
    "MGL_STEPPE_1795508501363",
    "systemqr",
    "SYSTEMQR",
    "WEB",
  );
  assert.equal(result.success, true);
  assert.equal(writes[0].webQpayMerchantId, "MGL_STEPPE_1795508501363");
  assert.equal(writes[0].qpayMerchantId, undefined);
});
test("legacy QPay connections retain their own credential path", async () => {
  assert.equal(
    (
      await connectVendorMerchant(
        "org",
        "legacy-id",
        "legacy-key",
        "invoice-code",
      )
    ).success,
    true,
  );
  assert.equal(requests.length, 0);
});
test("only provider duplicate code 0077 is classified as an existing merchant", () => {
  assert.equal(
    isSystemQrRegistrationDuplicate(
      new Error("Minu SystemQR subMerchant register failed (0077): duplicate"),
    ),
    true,
  );
  assert.equal(
    isSystemQrRegistrationDuplicate(
      new Error("Minu SystemQR subMerchant register failed (001): failure"),
    ),
    false,
  );
  assert.equal(isSystemQrRegistrationDuplicate("0077"), false);
});

test("reconnecting the same merchant preserves its registration account snapshot", async () => {
  stub(prisma.organization, "findUnique", async () => ({
    id: "org",
    qpayMerchantId: "MGL_STEPPE_1795508501363",
  }));
  assert.equal(
    (
      await connectVendorMerchant(
        "org",
        "MGL_STEPPE_1795508501363",
        "systemqr",
        "SYSTEMQR",
      )
    ).success,
    true,
  );
  assert.equal(writes[0].qpayBankAccounts, undefined);
});
