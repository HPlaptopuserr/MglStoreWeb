import test from "node:test";
import assert from "node:assert/strict";
import { emptyEsimSalesSettings, parseEsimSalesSettings } from "@mgl/types";
import { checkoutPrice, type ManualEsimPrices } from "./member-pricing";
import { EsimQuoteService } from "./quote-service";
import type { SupplierOffer } from "./offers";
const id = "esim-access:CN_1_7";
const offer: SupplierOffer = {
  id,
  supplier: "esim-access",
  packageId: "CN_1_7",
  title: "China 1GB",
  countries: ["CN"],
  dataMb: 1024,
  days: 7,
  wholesaleUsdUnits: 10000,
  activation: "first-network",
};
test("marketing defaults never publish prices or enable checkout", () => {
  const settings = emptyEsimSalesSettings();
  assert.equal(settings.mode, "coming-soon");
  assert.deepEqual(settings.prices, {});
  assert.deepEqual(
    parseEsimSalesSettings({ ...settings, prices: { [id]: 9900 } }).prices,
    { [id]: 9900 },
  );
  assert.throws(() => parseEsimSalesSettings({ ...settings, mode: "live" }));
});
test("manual prices require safe positive integer MNT and supplier identifiers", () => {
  for (const price of [0, -1, 1.5, NaN, Infinity, 2147483648, "9900"])
    assert.throws(() =>
      parseEsimSalesSettings({
        ...emptyEsimSalesSettings(),
        prices: { [id]: price },
      }),
    );
  assert.throws(() =>
    parseEsimSalesSettings({
      ...emptyEsimSalesSettings(),
      prices: { __proto__: 1, "not-a-supplier": 1 },
    }),
  );
  assert.throws(() =>
    parseEsimSalesSettings({
      ...emptyEsimSalesSettings(),
      ESIM_ACCESS_CODE: "injection",
    }),
  );
  assert.equal(
    parseEsimSalesSettings({
      ...emptyEsimSalesSettings(),
      mode: "live",
      prices: { [id]: 9900 },
    }).mode,
    "live",
  );
});
test("manual retail prices work without FX configuration and never guess missing prices", () => {
  const policy: ManualEsimPrices = { kind: "manual", prices: { [id]: 9900 } };
  assert.equal(checkoutPrice(10000, policy, false, Date.now(), id), 9900);
  assert.throws(() =>
    checkoutPrice(10000, policy, false, Date.now(), "esim-access:JP_missing"),
  );
});
test("manual quotes remain signed, user-bound and expire after five minutes", () => {
  const now = Date.now();
  const quotes = new EsimQuoteService("s".repeat(40));
  const quote = quotes.issue(
    "owner",
    offer,
    { kind: "manual", prices: { [id]: 9900 } },
    now,
    { country: "CN", checkoutAvailable: false, terms: "Approved terms" },
  );
  assert.equal(quote.totalMnt, 9900);
  assert.equal(quote.checkoutAvailable, false);
  assert.equal(quotes.verify(quote.token, "owner", now + 1).totalMnt, 9900);
  assert.throws(() => quotes.verify(quote.token, "other", now + 1));
  assert.throws(() => quotes.verify(quote.token, "owner", now + 300001));
  assert.notEqual(
    checkoutPrice(
      10000,
      { kind: "manual", prices: { [id]: 10900 } },
      false,
      now,
      id,
    ),
    quote.totalMnt,
  );
});
