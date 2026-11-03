import test from "node:test";
import assert from "node:assert/strict";
import express, { type Request } from "express";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { createEsimRouter } from "./esim.routes";
import { EsimCatalogService } from "../../services/esim/catalog-service";
import { EsimQuoteService } from "../../services/esim/quote-service";
import type { AuthPayload } from "../../middleware/auth";

test("HTTP boundary protects costs, authentication, server prices and disabled checkout", async () => {
  const app = express();
  app.use(express.json());
  let reviewed = true;
  app.use(
    createEsimRouter({
      authenticate: (req, res, next) => {
        if (!req.headers.authorization) {
          res.sendStatus(401);
          return;
        }
        (req as Request & { user: AuthPayload }).user = {
          userId: "owner",
          email: "test@example.com",
          role: "CUSTOMER",
        };
        next();
      },
      activeUser: async () => true,
      catalog: new EsimCatalogService([
        {
          id: "esim-access",
          fetchPage: async () => ({
            supplier: "esim-access",
            nextPage: null,
            records: [
              {
                slug: "CN_1_7",
                name: "China",
                location: "CN",
                durationUnit: "DAY",
                duration: 7,
                volume: 1073741824,
                dataType: 1,
                currencyCode: "USD",
                price: 7000,
                activeType: 2,
              },
            ],
          }),
        },
      ]),
      pricing: () => {
        if (!reviewed) throw new Error("Not reviewed");
        return {
          usdMnt: 3595.6,
          fxAt: Date.now(),
          vatBps: 0,
          qrFeeBps: 100,
          incomeTaxReserveBps: 0,
          fundingFeeBps: 0,
          refundReserveBps: 0,
          additionalSupplierTaxBps: 0,
          overheadPerOrderMnt: 0,
          profitMarkupBps: 3000,
          roundingMnt: 100,
        };
      },
      quotes: () => new EsimQuoteService("test-only-secret".repeat(3)),
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/store/esim`;
  const headers = { authorization: "test", "content-type": "application/json" };
  try {
    assert.equal((await fetch(`${base}/catalog`)).status, 401);
    const catalog = await fetch(`${base}/catalog?country=CN`, { headers });
    assert.equal(catalog.status, 200);
    assert.equal(catalog.headers.get("cache-control"), "private, no-store");
    const body = await catalog.text();
    assert.ok(!body.includes("wholesale"));
    assert.ok(body.includes('"checkoutAvailable":false'));
    const post = (path: string, payload: object) =>
      fetch(`${base}/${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    assert.equal(
      (
        await post("quotes", {
          country: "CN",
          offerId: "esim-access:CN_1_7",
          totalMnt: 1,
        })
      ).status,
      400,
    );
    assert.equal(
      (await post("quotes", { country: "CN", offerId: "   " })).status,
      400,
    );
    assert.equal(
      (await post("quotes", { country: "CN", offerId: "missing" })).status,
      409,
    );
    const quote = await post("quotes", {
      country: "CN",
      offerId: "esim-access:CN_1_7",
    });
    assert.equal(quote.status, 200);
    const quotedBody = await quote.text();
    assert.ok(quotedBody.includes('"checkoutAvailable":false'));
    assert.ok(!quotedBody.includes("wholesale"));
    assert.equal((await post("orders", {})).status, 503);
    reviewed = false;
    const unpriced = await fetch(`${base}/catalog`, { headers });
    assert.equal(unpriced.status, 200);
    const unpricedBody = await unpriced.json() as {
      priceKind: string; checkoutAvailable: boolean;
      offers: { title: string; totalMnt: number | null; memberTotalMnt: number | null }[];
    };
    assert.equal(unpricedBody.priceKind, "unavailable");
    assert.equal(unpricedBody.checkoutAvailable, false);
    assert.equal(unpricedBody.offers[0]?.title, "China");
    assert.equal(unpricedBody.offers[0]?.totalMnt, null);
    assert.equal(unpricedBody.offers[0]?.memberTotalMnt, null);
    assert.ok(!JSON.stringify(unpricedBody).includes("wholesale"));
    assert.equal((await post("quotes", { country: "CN", offerId: "esim-access:CN_1_7" })).status, 503);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
