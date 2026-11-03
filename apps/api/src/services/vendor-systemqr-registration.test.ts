import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "@mgl/database";
import { registerVendorWithSystemQr } from "./vendor-merchant.service";
import { SYSTEMQR_REGISTRATION_001_MESSAGE } from "./systemqr-registration-error";
import type { SystemQrRegisterSubMerchantParams } from "./systemqr";

const registration: SystemQrRegisterSubMerchantParams = {
  merchantName: "Test store", accountNumber: "1234567890", bankCode: "050000",
  cityId: "20", districtId: "1", khorooId: "provider-khoroo-id",
  building: "1", doorNo: "1", phone: "99112233", firstName: "Test", lastName: "Owner",
  corporateFlag: "0", registerNumber: "АА00112233", gender: "M", subCategoryId: "36",
};

test("vendor registration validates location and never saves failed provider registrations", async (t) => {
  const previousEnv = {
    SYSTEMQR_USERNAME: process.env.SYSTEMQR_USERNAME,
    SYSTEMQR_PASSWORD: process.env.SYSTEMQR_PASSWORD,
    SYSTEMQR_LOCAL_CATALOG: process.env.SYSTEMQR_LOCAL_CATALOG,
  };
  process.env.SYSTEMQR_USERNAME = "vendor-registration-test";
  process.env.SYSTEMQR_PASSWORD = "test-password";
  process.env.SYSTEMQR_LOCAL_CATALOG = "false";
  t.after(() => {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  let writes = 0;
  let registrations = 0;
  let providerStatus = "001";
  t.mock.method(console, "error", () => {});
  const stub = (target: object, key: string, value: unknown) => {
    const previous: unknown = Reflect.get(target, key);
    Reflect.set(target, key, value);
    t.after(() => { Reflect.set(target, key, previous); });
  };
  stub(prisma.organization, "findUnique", async () => ({ id: "test-org" }));
  stub(prisma.organization, "update", async () => { writes++; return {}; });
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/login")) return Response.json({ status: "000", entity: "test-token" });
    if (url.endsWith("/qrMerchant/city")) return Response.json({ status: "000", entity: [
      { cityId: 20, cityName: "City", districtList: [{ districtId: 1, districtName: "District" }] },
    ] });
    if (url.endsWith("/qrMerchant/khoroo?districtId=1")) return Response.json({
      status: "000", entity: [{ khorooId: "provider-khoroo-id", khorooName: "31-р хороо" }],
    });
    if (url.endsWith("/qrMerchant/registerSubMerchant")) {
      registrations++;
      const body: Record<string, unknown> = JSON.parse(String(init?.body));
      assert.equal(body.khorooId, "provider-khoroo-id");
      return Response.json({ status: providerStatus, message: "Системийн алдаа", entity:
        providerStatus === "000" ? { merchantCode: "test-submerchant" } : null });
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  await t.test("invalid khoroo returns a location error before provider registration", async () => {
    const result = await registerVendorWithSystemQr("test-org", { ...registration, khorooId: "15782385" });
    assert.equal(result.code, "INVALID_LOCATION");
    assert.equal(result.success, false);
    assert.equal(registrations, 0);
    assert.equal(writes, 0);
  });
  await t.test("001 is not misreported as a location or successful connection", async () => {
    const result = await registerVendorWithSystemQr("test-org", registration);
    assert.equal(result.code, "PROVIDER_REGISTRATION_FAILED");
    assert.equal(result.upstreamStatus, "001");
    assert.equal(result.message, SYSTEMQR_REGISTRATION_001_MESSAGE);
    assert.equal(result.success, false);
    assert.equal(registrations, 1);
    assert.equal(writes, 0);
  });
  await t.test("valid provider IDs and successful registration persist once", async () => {
    providerStatus = "000";
    const result = await registerVendorWithSystemQr("test-org", registration);
    assert.equal(result.success, true);
    assert.equal(result.merchantId, "test-submerchant");
    assert.equal(registrations, 2);
    assert.equal(writes, 1);
  });
});
