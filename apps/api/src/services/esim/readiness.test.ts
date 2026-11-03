import test from "node:test";
import assert from "node:assert/strict";
import { esimReadiness } from "./readiness";
import { checkoutEnabled } from "./checkout-config";
const now = Date.now();
const env: NodeJS.ProcessEnv = {
  ESIM_PRICING_REVIEWED: "true", ESIM_USD_MNT: "3500",
  ESIM_FX_UPDATED_AT: new Date(now).toISOString(), ESIM_VAT_BPS: "0",
  ESIM_INCOME_TAX_RESERVE_BPS: "0", ESIM_FUNDING_FEE_BPS: "200",
  ESIM_REFUND_RESERVE_BPS: "100", ESIM_SUPPLIER_TAX_BPS: "0",
  ESIM_OVERHEAD_PER_ORDER_MNT: "500", ESIM_QUOTE_SECRET: "q".repeat(40),
  ESIM_ACTIVATION_KEY: Buffer.alloc(32, 1).toString("base64"),
  ESIM_MINU_MERCHANT_CODE: "child", SYSTEMQR_USERNAME: "master", SYSTEMQR_PASSWORD: "test",
  ESIM_ACCESS_CODE: "test", ESIM_REFUND_TERMS: "Reviewed test terms",
  API_PUBLIC_URL: "https://example.com", ESIM_WORKER_ENABLED: "true", ESIM_CHECKOUT_ENABLED: "true",
};
test("checkout readiness validates actual price policy, not just presence of env values", () => {
  assert.ok(Object.values(esimReadiness(env, now)).every(Boolean));
  assert.equal(checkoutEnabled(env), true);
  for (const changes of [
    { ESIM_FX_UPDATED_AT: new Date(now - 86400001).toISOString() },
    { ESIM_FX_UPDATED_AT: "invalid" }, { ESIM_USD_MNT: "0" },
    { ESIM_FUNDING_FEE_BPS: "0.5" }, { ESIM_REFUND_RESERVE_BPS: "" },
  ]) assert.equal(esimReadiness({ ...env, ...changes }, now).pricing, false);
});
test("callback origin rejects malformed, credentialed and non-HTTPS URLs", () => {
  for (const url of ["https://", "http://example.com", "https://u:p@example.com", "https://example.com/path", "https://example.com?secret=value"]) {
    assert.equal(esimReadiness({ ...env, API_PUBLIC_URL: url }, now).publicCallback, false);
  }
  assert.equal(checkoutEnabled({ ...env, ESIM_CHECKOUT_ENABLED: "false" }), false);
  assert.equal(checkoutEnabled({ ...env, ESIM_WORKER_ENABLED: "false" }), false);
});
