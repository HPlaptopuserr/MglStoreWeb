import test from "node:test";
import assert from "node:assert/strict";
import { priceOffer, monthlyResult, type PricingPolicy } from "./pricing";
import { readPricingPolicy } from "./config";
const now = Date.now();
const policy: PricingPolicy = {
  usdMnt: 1000,
  fxAt: now,
  vatBps: 1000,
  incomeTaxReserveBps: 0,
  qrFeeBps: 100,
  fundingFeeBps: 0,
  refundReserveBps: 0,
  additionalSupplierTaxBps: 0,
  overheadPerOrderMnt: 0,
  profitMarkupBps: 3000,
  roundingMnt: 1,
};

test("price retains 30% on all modeled costs after VAT and QR, not 30% on headline cost", () => {
  const result = priceOffer(10000, policy, now);
  assert.ok(result.totalMnt > 1430 && result.totalMnt < 1460);
  assert.ok(
    result.estimatedProfitMnt >= Math.ceil((1000 + result.qrFeeMnt) * 0.3),
  );
  assert.equal(
    result.totalMnt - result.vatMnt - result.qrFeeMnt - 1000,
    result.estimatedProfitMnt,
  );
});
test("profit floor holds across supplier costs, taxes, fees and rounding", () => {
  for (const cost of [1, 7000, 19000, 58500, 250000, 1000000]) {
    for (const vatBps of [0, 1000]) {
      const p = {
        ...policy,
        usdMnt: 3595.6,
        vatBps,
        fundingFeeBps: 300,
        refundReserveBps: 200,
        additionalSupplierTaxBps: 1000,
        incomeTaxReserveBps: 1000,
        overheadPerOrderMnt: 1000,
        roundingMnt: 100,
      };
      const result = priceOffer(cost, p, now);
      const costs =
        result.supplierCostMnt +
        result.fundingFeeMnt +
        result.supplierTaxReserveMnt +
        result.refundReserveMnt +
        result.overheadMnt +
        result.qrFeeMnt;
      assert.ok(result.estimatedProfitMnt * 10000 >= costs * p.profitMarkupBps);
      assert.equal(result.totalMnt % 100, 0);
      assert.equal(
        result.totalMnt - result.vatMnt - costs - result.incomeTaxReserveMnt,
        result.estimatedProfitMnt,
      );
    }
  }
});
test("stale FX, missing review, invalid rates and impossible profitability fail closed", () => {
  assert.throws(() =>
    priceOffer(10000, { ...policy, fxAt: now - 86400001 }, now),
  );
  assert.throws(() =>
    priceOffer(10000, { ...policy, vatBps: Number.NaN }, now),
  );
  assert.throws(() => priceOffer(10000, { ...policy, qrFeeBps: 10000 }, now));
  assert.throws(() => priceOffer(0, policy, now));
  assert.throws(() => readPricingPolicy({}));
  assert.throws(() => readPricingPolicy({ ESIM_PRICING_REVIEWED: "true" }));
});
test("zero and one monthly order never pretend to recover fixed costs", () => {
  assert.equal(monthlyResult(6809, 0, 500000), -500000);
  assert.equal(monthlyResult(6809, 1, 500000), -493191);
});
