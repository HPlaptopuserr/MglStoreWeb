import test from "node:test";
import assert from "node:assert/strict";
import { EsimCatalogService } from "./catalog-service";
import { accessOffers, airaloOffers } from "./offers";
import { EsimQuoteService } from "./quote-service";
import type { SupplierCatalog } from "./supplier-catalog";
const record = {
  slug: "CN_1_7",
  name: "China 1GB",
  location: "CN",
  durationUnit: "DAY",
  duration: 7,
  volume: 1073741824,
  dataType: 1,
  currencyCode: "USD",
  price: 7000,
  activeType: 2,
};
test("Access preserves actual API units and coverage, rejects unsupported plan types", () => {
  const [offer] = accessOffers([record], "CN");
  assert.equal(offer?.wholesaleUsdUnits, 7000);
  assert.equal(offer?.dataMb, 1024);
  assert.equal(accessOffers([record], "JP").length, 0);
  assert.equal(accessOffers([{ ...record, dataType: 2 }], "CN").length, 0);
  assert.throws(() => accessOffers([{ ...record, price: -1 }], "CN"));
});
test("Airalo requires USD net price; never substitutes retail price or fabricates regional coverage", () => {
  const destination = {
    country_code: "CN",
    operators: [
      {
        type: "local",
        plan_type: "data",
        packages: [
          {
            id: "cn",
            title: "China",
            type: "sim",
            is_unlimited: false,
            amount: 1024,
            day: 7,
            price: 4,
            prices: { net_price: { USD: 0.7 } },
          },
        ],
      },
    ],
  };
  assert.equal(airaloOffers([destination], "CN")[0]?.wholesaleUsdUnits, 7000);
  assert.equal(airaloOffers([destination], "JP").length, 0);
  destination.operators[0]!.packages[0]!.prices.net_price = {} as {
    USD: number;
  };
  assert.throws(() => airaloOffers([destination], "CN"));
});
test("cache coalesces loads, isolates supplier outage and rejects stale data after refresh failure", async () => {
  let now = 0;
  let calls = 0;
  let fail = false;
  const supplier: SupplierCatalog = {
    id: "esim-access",
    fetchPage: async () => {
      calls++;
      if (fail) throw new Error("offline");
      return { supplier: "esim-access", records: [record], nextPage: null };
    },
  };
  const service = new EsimCatalogService([supplier], () => now);
  await Promise.all([service.list("CN"), service.list("CN")]);
  assert.equal(calls, 1);
  now = 300001;
  fail = true;
  const result = await service.list("CN");
  assert.equal(result.offers.length, 0);
  assert.equal(result.suppliers[0]?.status, "unavailable");
});
test("quotes are owner-bound, expire, reject tampering and disclose no wholesale price", () => {
  const service = new EsimQuoteService("x".repeat(32));
  const offer = accessOffers([record], "CN")[0]!;
  const now = Date.now();
  const quote = service.issue(
    "owner",
    offer,
    {
      usdMnt: 3595.6,
      fxAt: now,
      vatBps: 1000,
      qrFeeBps: 100,
      incomeTaxReserveBps: 0,
      fundingFeeBps: 300,
      refundReserveBps: 200,
      additionalSupplierTaxBps: 0,
      overheadPerOrderMnt: 0,
      profitMarkupBps: 3000,
      roundingMnt: 100,
    },
    now,
  );
  assert.equal(service.verify(quote.token, "owner", now).offerId, offer.id);
  assert.throws(() => service.verify(quote.token, "other", now));
  assert.throws(() => service.verify(quote.token, "owner", now + 300001));
  assert.throws(() => service.verify(`bad${quote.token}`, "owner", now));
  assert.ok(
    !Buffer.from(quote.token.split(".")[0]!, "base64url")
      .toString()
      .includes("wholesale"),
  );
  assert.equal(quote.checkoutAvailable, false);
});
