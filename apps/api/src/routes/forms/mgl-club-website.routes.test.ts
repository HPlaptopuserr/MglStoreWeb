import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import { createClubSection, parseClubWebsite } from "@mgl/types";
import { activeGoldInvoice } from "./mgl-club-gold.test-support";
import { createClubWebsiteRouter } from "./mgl-club-website.routes";
const id = "00000000-0000-4000-8000-000000000001";
const token = jwt.sign(
  { userId: "system-admin", email: "admin@example.test", role: "ADMIN" },
  process.env.JWT_SECRET || "dev-secret-change-me",
);
const site = {
  sections: [
    createClubSection("hero", "home"),
    createClubSection("split", "about"),
  ],
};
const baseData = {
  ownerUserId: "owner",
  paymentTokenHash: "private",
  name: "Бат",
  businessName: "Компани",
  sector: "Худалдаа",
  city: "Улаанбаатар",
  description: "Танилцуулга",
  offers: "Бараа",
  phone: "99112233",
  consent: "yes",
};
let server: Server, base: string, stored: Prisma.JsonObject;
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
before(async () => {
  const app = express();
  app.use(express.json(), createClubWebsiteRouter());
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/forms/mgl-club/my-companies/${id}/website`;
});
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
function database(data: Prisma.JsonObject = { ...baseData }) {
  stored = data;
  stub(prisma.qPayInvoice, "findMany", async () => [activeGoldInvoice(id)]);
  stub(prisma, "$transaction", async (run: (tx: object) => Promise<unknown>) =>
    run({
      $queryRaw: async () => [],
      qPayInvoice: { findMany: async () => prisma.qPayInvoice.findMany() },
      formResponse: {
        findFirst: async () => ({ id, data: stored }),
        update: async (args: { data: { data: Prisma.JsonObject } }) => {
          stored = args.data.data;
          return { id, data: stored };
        },
      },
    }),
  );
  stub(prisma.formResponse, "findFirst", async () => ({ id, data: stored }));
}
function write(body: unknown, publish = false, auth: boolean | string = true) {
  return fetch(`${base}${publish ? "/publish" : ""}`, {
    method: publish ? "POST" : "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(auth
        ? { Authorization: `Bearer ${typeof auth === "string" ? auth : token}` }
        : {}),
    },
    body: JSON.stringify(body),
  });
}
test("website sections reject unsafe media, duplicate IDs and malformed ordering", () => {
  assert.ok(parseClubWebsite(site));
  assert.equal(
    parseClubWebsite({ sections: [site.sections[1], site.sections[0]] }),
    null,
  );
  assert.equal(
    parseClubWebsite({
      sections: [site.sections[0], { ...site.sections[1], id: "home" }],
    }),
    null,
  );
  for (const imageUrl of [
    "javascript:alert(1)",
    "data:image/svg+xml,bad",
    "/api/forms/mgl-club/website-images/../../secret",
    "https://user:pass@example.com/p.png",
  ])
    assert.equal(
      parseClubWebsite({ sections: [{ ...site.sections[0], imageUrl }] }),
      null,
    );
  assert.equal(
    parseClubWebsite({
      sections: [...site.sections, createClubSection("hero", "duplicate")],
    }),
    null,
  );
  assert.equal(
    parseClubWebsite({
      sections: Array.from({ length: 13 }, (_, i) => ({
        ...site.sections[0],
        id: `s${i}`,
      })),
    }),
    null,
  );
});
const customerToken = jwt.sign(
  { userId: "owner", email: "owner@example.test", role: "CUSTOMER" },
  process.env.JWT_SECRET || "dev-secret-change-me",
);
test("unauthorized website updates cannot change stored content", async () => {
  database({ ...baseData, ownerUserId: "another-owner" });
  assert.equal(
    (await write({ site, version: 0 }, false, customerToken)).status,
    403,
  );
  assert.equal(stored.websiteDraft, undefined);
  assert.equal((await write({ site, version: 0 }, false, false)).status, 401);
});
test("saving a draft preserves the published site and private company metadata", async () => {
  const published = {
    sections: [{ ...site.sections[0], title: "Published title" }],
  };
  database({
    ...baseData,
    websitePublished: published as unknown as Prisma.JsonObject,
  });
  const response = await write({ site, version: 0 });
  assert.equal(response.status, 200);
  assert.deepEqual(stored.websitePublished, published);
  assert.deepEqual(stored.websiteDraft, site);
  assert.equal(stored.ownerUserId, "owner");
  assert.equal(stored.paymentTokenHash, "private");
  assert.equal(stored.websiteVersion, 1);
});
test("publication copies only the saved draft and rejects stale concurrent versions", async () => {
  database();
  assert.equal((await write({ version: 0 }, true)).status, 400);
  assert.equal((await write({ site, version: 0 })).status, 200);
  assert.equal((await write({ site, version: 0 })).status, 409);
  const response = await write({ version: 1, site: { sections: [] } }, true);
  assert.equal(response.status, 200);
  assert.deepEqual(stored.websitePublished, site);
  assert.equal(stored.websiteVersion, 2);
});

test("website theme validates colors and survives draft publication", async () => {
  const theme = { primaryColor: "#005baa", backgroundColor: "#ffffff" };
  const themed = { ...site, theme };
  assert.deepEqual(parseClubWebsite(themed), themed);
  for (const invalid of [
    null,
    [],
    {},
    { ...theme, primaryColor: "red" },
    { ...theme, backgroundColor: "url(https://example.test)" },
  ]) {
    assert.equal(parseClubWebsite({ ...site, theme: invalid }), null);
  }
  database();
  const saved = await write({ site: themed, version: 0 });
  assert.equal(saved.status, 200);
  assert.deepEqual(stored.websiteDraft, themed);
  const published = await write({ site: themed, version: 1 }, true);
  assert.equal(published.status, 200);
  assert.deepEqual(stored.websitePublished, themed);
});

test("unpaid or expired Gold access blocks draft saving and publication without changing existing published content", async () => {
  const original = {
    ...baseData,
    websiteDraft: site as unknown as Prisma.JsonObject,
    websitePublished: site as unknown as Prisma.JsonObject,
    websiteVersion: 3,
    clubFeaturedGold: true,
    goldExpiresAt: "2099-01-01T00:00:00Z",
  };
  for (const candidates of [
    [],
    [
      {
        ...activeGoldInvoice(id),
        webhookPayload: {
          kind: "MGL_CLUB_GOLD",
          accessExpiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      },
    ],
  ]) {
    database(original);
    stub(prisma.qPayInvoice, "findMany", async () => candidates);
    const input = {
      site,
      version: 3,
      eligible: true,
      membership: { eligible: true },
      clubFeaturedGold: true,
    };
    assert.equal((await write(input)).status, 403);
    assert.equal((await write(input, true)).status, 403);
    assert.deepEqual(stored, original);
  }
});

test("admins can inspect unpaid website drafts and access status without receiving editing rights", async () => {
  database({
    ...baseData,
    websiteDraft: site as unknown as Prisma.JsonObject,
    websitePublished: site as unknown as Prisma.JsonObject,
    websiteVersion: 3,
  });
  stub(prisma.qPayInvoice, "findMany", async () => []);
  const headers = { Authorization: `Bearer ${token}` };
  const status = await fetch(base.replace(/\/website$/, "/website-access"), {
    headers,
  });
  assert.equal(status.status, 200);
  assert.match(status.headers.get("cache-control") || "", /no-store/);
  const access: { eligible: boolean; status: string } = await status.json();
  assert.equal(access.eligible, false);
  assert.equal(access.status, "unpaid");
  const read = await fetch(base, { headers });
  assert.equal(read.status, 200);
  const body: {
    access: { eligible: boolean };
    draft: unknown;
    published: unknown;
    version: number;
  } = await read.json();
  assert.equal(body.access.eligible, false);
  assert.deepEqual(body.draft, site);
  assert.deepEqual(body.published, site);
  assert.equal(body.version, 3);
});

test("publishing assigns a stable Business link and preserves an administrator-selected link", async () => {
  database({
    ...baseData,
    websiteDraft: site as unknown as Prisma.JsonObject,
    websiteVersion: 0,
  });
  const response = await write({ version: 0 }, true);
  assert.equal(response.status, 200);
  const result: { siteSlug: string } = await response.json();
  assert.equal(result.siteSlug, `company-${id}`);
  assert.equal(stored.clubSiteSlug, result.siteSlug);
  assert.deepEqual(stored.websitePublished, site);
  database({
    ...baseData,
    clubSiteSlug: "custom-company",
    websiteDraft: site as unknown as Prisma.JsonObject,
    websiteVersion: 0,
  });
  const custom = await write({ version: 0 }, true);
  assert.equal(custom.status, 200);
  assert.equal(
    ((await custom.json()) as { siteSlug: string }).siteSlug,
    "custom-company",
  );
});

test("an occupied generated link blocks publication without overwriting content", async () => {
  const original = {
    ...baseData,
    websiteDraft: site as unknown as Prisma.JsonObject,
    websiteVersion: 0,
  };
  database(original);
  stub(prisma, "$transaction", async (run: (tx: object) => Promise<unknown>) =>
    run({
      $queryRaw: async () => [],
      qPayInvoice: { findMany: async () => [activeGoldInvoice(id)] },
      formResponse: {
        findFirst: async (args: { where: { id: unknown } }) =>
          typeof args.where.id === "string"
            ? { id, data: stored }
            : { id: "other-company" },
        update: async () => {
          throw new Error("A conflicting link must not be published");
        },
      },
    }),
  );
  assert.equal((await write({ version: 0 }, true)).status, 409);
  assert.deepEqual(stored, original);
});
