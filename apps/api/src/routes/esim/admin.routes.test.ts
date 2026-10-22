import test from "node:test";
import assert from "node:assert/strict";
import express, { type Request, type RequestHandler } from "express";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { emptyEsimSalesSettings, type EsimSalesDocument } from "@mgl/types";
import { requireRole, type AuthPayload } from "../../middleware/auth";
import {
  EsimSettingsConflict,
  type EsimSalesStore,
} from "../../services/esim/sales-settings";
import { EsimCatalogService } from "../../services/esim/catalog-service";
import { createEsimAdminRouter } from "./admin.routes";
import { createEsimRouter } from "./esim.routes";
import { EsimQuoteService } from "../../services/esim/quote-service";

test("web settings enforce admin roles, reject stale updates, and publish only explicitly priced packages", async () => {
  let saved: EsimSalesDocument = {
    settings: emptyEsimSalesSettings(),
    revision: 0,
  };
  const store: EsimSalesStore = {
    read: async () => saved,
    save: async (settings, revision, actor) => {
      assert.equal(actor, "owner");
      if (revision !== saved.revision) throw new EsimSettingsConflict();
      saved = { settings, revision: revision + 1 };
      return saved;
    },
  };
  const auth: RequestHandler = (req, res, next) => {
    const role = req.headers["x-test-role"];
    if (typeof role !== "string") {
      res.sendStatus(401);
      return;
    }
    (req as Request & { user: AuthPayload }).user = {
      userId: "owner",
      role,
      email: "test@example.com",
    };
    next();
  };
  const catalog = new EsimCatalogService([
    {
      id: "esim-access",
      fetchPage: async () => ({
        supplier: "esim-access",
        nextPage: null,
        records: [1, 3].map((gb) => ({
          slug: `CN_${gb}_7`,
          name: `China ${gb}GB`,
          location: "CN",
          durationUnit: "DAY",
          duration: 7,
          volume: gb * 1073741824,
          dataType: 1,
          currencyCode: "USD",
          activeType: 2,
          price: gb * 10000,
        })),
      }),
    },
  ]);
  const app = express();
  app.use(express.json());
  app.use(
    createEsimAdminRouter({
      authorize: [auth, requireRole("ADMIN", "SUPER_ADMIN")],
      store,
      catalog,
      readiness: () => ({ supplierCredentials: true }),
    }),
  );
  app.use(
    createEsimRouter({
      authenticate: auth,
      activeUser: async () => true,
      catalog,
      pricing: async () => ({
        kind: "manual",
        prices: saved.settings.mode === "live" ? saved.settings.prices : {},
      }),
      quotes: () => new EsimQuoteService("q".repeat(40)),
      checkoutEnabled: async () => false,
      marketing: async () => ({
        mode: saved.settings.mode,
        announcement: saved.settings.announcement,
      }),
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.equal((await fetch(`${base}/admin/esim/settings`)).status, 401);
    assert.equal(
      (
        await fetch(`${base}/admin/esim/settings`, {
          headers: { "x-test-role": "CUSTOMER" },
        })
      ).status,
      403,
    );
    const headers = {
      "x-test-role": "ADMIN",
      "content-type": "application/json",
    };
    const save = (body: unknown) =>
      fetch(`${base}/admin/esim/settings`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
    assert.equal(
      (
        await save({
          settings: {
            ...saved.settings,
            prices: { "esim-access:CN_1_7": 9900 },
          },
          revision: 0,
        })
      ).status,
      200,
    );
    let body = await (
      await fetch(`${base}/store/esim/catalog?country=CN`, { headers })
    ).json();
    assert.equal(body.priceKind, "unavailable");
    assert.equal(body.offers.length, 2);
    assert.equal(body.offers[0].totalMnt, null);
    assert.equal(body.checkoutAvailable, false);
    assert.equal(
      (
        await save({
          settings: { ...saved.settings, mode: "live" },
          revision: 0,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await save({
          settings: { ...saved.settings, mode: "live" },
          revision: 1,
        })
      ).status,
      200,
    );
    body = await (
      await fetch(`${base}/store/esim/catalog?country=CN`, { headers })
    ).json();
    assert.equal(body.priceKind, "final");
    assert.equal(body.offers.length, 1);
    assert.equal(body.offers[0].totalMnt, 9900);
    assert.equal(body.memberEligible, false);
    assert.equal(body.checkoutAvailable, false);
    const text = JSON.stringify(body);
    assert.equal(text.includes("wholesale"), false);
    assert.equal(text.includes("updatedBy"), false);
    assert.equal(
      (
        await save({
          settings: { ...saved.settings, prices: { "esim-access:CN_1_7": -1 } },
          revision: 2,
        })
      ).status,
      400,
    );
  } finally {
    server.closeAllConnections();
    server.close();
  }
});
