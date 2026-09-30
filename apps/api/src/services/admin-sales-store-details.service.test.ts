import assert from "node:assert/strict";
import test from "node:test";
import { storeProfileSelect } from "./admin-sales-store-details.service";

test("full store profile includes business data without payment or authentication secrets", () => {
  for (const key of [
    "openingHours",
    "address",
    "phone",
    "logoUrl",
    "bannerUrl",
    "description",
    "deliveryText",
    "planExpiresAt",
    "qpayEnabled",
    "businessInventoryEnabled",
  ]) {
    assert.equal(Reflect.get(storeProfileSelect, key), true, key);
  }
  for (const key of [
    "qpayMerchantKey",
    "webQpayMerchantKey",
    "minuAgentPassword",
    "qpayBankAccounts",
    "webQpayBankAccounts",
    "members",
  ]) {
    assert.equal(Reflect.get(storeProfileSelect, key), undefined, key);
  }
});
