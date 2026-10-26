import assert from "node:assert/strict";
import test from "node:test";
import { registerSystemQrSubMerchant, SystemQrLocationValidationError, type SystemQrRegisterSubMerchantParams } from "./systemqr";

const registration: SystemQrRegisterSubMerchantParams = {
  merchantName: "Test", accountNumber: "1234567890", bankCode: "050000",
  cityId: "20", districtId: "1", khorooId: "actual-khoroo-id",
  building: "1", doorNo: "1", phone: "99112233", firstName: "Test", lastName: "Test",
  corporateFlag: "0", registerNumber: "АА00112233", gender: "M", subCategoryId: "36",
};

test("registration checks provider location IDs before sending merchant details", async (t) => {
  const originalFetch = globalThis.fetch;
  let posted: Record<string, unknown> | undefined;
  let catalogFailure = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/login")) return Response.json({ status: "000", entity: "test-token" });
    if (url.endsWith("/qrMerchant/city")) return Response.json({ status: "000", entity: [
      { cityId: 20, cityName: "City", districtList: [{ districtId: 1, districtName: "District" }] },
    ] });
    if (url.endsWith("/qrMerchant/khoroo?districtId=1")) return Response.json(catalogFailure
      ? { status: "001", message: "Unavailable" }
      : { status: "000", entity: [{ khorooId: "actual-khoroo-id", khorooName: "1-р хороо" }] });
    if (url.endsWith("/qrMerchant/registerSubMerchant")) {
      posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ status: "000", entity: { merchantCode: "test-merchant" } });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  try {
    for (const location of [
      { cityId: "other-city" }, { districtId: "other-district" },
      { khorooId: "15782385" }, { khorooId: "" },
    ]) {
      await t.test(`reject invalid ${Object.keys(location)[0]} without registration POST`, async () => {
        posted = undefined;
        await assert.rejects(registerSystemQrSubMerchant({ ...registration, ...location }, "location-test", "password"), SystemQrLocationValidationError);
        assert.equal(posted, undefined);
      });
    }
    await t.test("catalog failure prevents registration", async () => {
      posted = undefined;
      catalogFailure = true;
      await assert.rejects(registerSystemQrSubMerchant(registration, "location-test", "password"), /Minu хаягийн жагсаалт/);
      assert.equal(posted, undefined);
      catalogFailure = false;
    });
    await t.test("valid provider ID is forwarded unchanged", async () => {
      const result = await registerSystemQrSubMerchant(registration, "location-test", "password");
      assert.equal(result.merchantCode, "test-merchant");
      assert.equal(posted?.khorooId, registration.khorooId);
    });
    for (const registerNumber of ["аа00112233", "Аа00112233", "АА00112233", "  аа00112233  "]) {
      await t.test(`normalizes personal register casing: ${registerNumber}`, async () => {
        await registerSystemQrSubMerchant({ ...registration, registerNumber }, "location-test", "password");
        assert.equal(posted?.registerNumber, "АА00112233");
      });
    }
    await t.test("company registration digits remain unchanged", async () => {
      await registerSystemQrSubMerchant({
        ...registration, registerNumber: "1234567", corporateFlag: "1", corporateName: "Test company",
      }, "location-test", "password");
      assert.equal(posted?.registerNumber, "1234567");
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
