import assert from "node:assert/strict";
import test from "node:test";
import { validateEnabledEbarimtConfig } from "./ebarimt-config.validation";

const completeConfig = {
  enabled: true,
  posApiUrl: "http://localhost:7080",
  merchantTin: "12345678901",
  posNo: "10001",
  merchantName: "Туршилтын дэлгүүр",
};

test("disabled eBarimt accepts an incomplete draft configuration", () => {
  assert.equal(
    validateEnabledEbarimtConfig({
      enabled: false,
      posApiUrl: null,
      merchantTin: null,
      posNo: null,
      merchantName: null,
    }),
    null,
  );
});

test("enabled eBarimt requires every operational field", () => {
  assert.equal(
    validateEnabledEbarimtConfig({
      ...completeConfig,
      merchantTin: null,
      merchantName: " ",
    }),
    "eBarimt идэвхтэй үед Merchant TIN, Merchant нэр шаардлагатай",
  );
});

test("enabled eBarimt accepts a complete configuration", () => {
  assert.equal(validateEnabledEbarimtConfig(completeConfig), null);
});
