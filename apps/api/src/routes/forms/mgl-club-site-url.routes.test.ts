import assert from "node:assert/strict";
import { before, after, afterEach, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import {
  createClubSection,
  isClubSiteSlug,
  normalizeClubSiteSlug,
} from "@mgl/types";
import { activeGoldInvoice } from "./mgl-club-gold.test-support";
import { createClubSiteUrlRouter } from "./mgl-club-site-url.routes";
const id = "00000000-0000-4000-8000-000000000001";
const profile = {
  name: "Бат",
  businessName: "Компани",
  sector: "Худалдаа",
  city: "Улаанбаатар",
  description: "Танилцуулга",
  offers: "Бараа",
  phone: "99112233",
  consent: "yes",
};
const published = { sections: [createClubSection("hero", "home")] };
let server: Server, base: string;
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
function token(role: string) {
  return jwt.sign(
    { userId: "system-admin", email: "admin@example.test", role },
    process.env.JWT_SECRET || "dev-secret-change-me",
  );
}
before(async () => {
  const app = express();
  app.use(express.json(), createClubSiteUrlRouter());
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/forms/mgl-club`;
});
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
function save(slug: string, role = "ADMIN") {
  return fetch(`${base}/my-companies/${id}/site-url`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token(role)}`,
    },
    body: JSON.stringify({ slug }),
  });
}
test("names normalize safely and reserve existing application routes", () => {
  assert.equal(normalizeClubSiteSlug("  InnovaLLC  "), "innovallc");
  for (const slug of [
    "login",
    "api",
    "profile",
    "mgl-club",
    "products",
    "store",
    "2003",
    "a",
    "ab",
    "-innova",
    "innova-",
    "a/b",
    "иннова",
    "a".repeat(64),
  ])
    assert.equal(isClubSiteSlug(slug), false, slug);
  assert.equal(isClubSiteSlug("innova-llc"), true);
});
test("owners and sub-admins cannot assign URLs; invalid names never reach storage", async () => {
  let accessed = false;
  stub(prisma, "$transaction", async () => {
    accessed = true;
    throw new Error();
  });
  for (const role of ["CUSTOMER", "OWNER", "CONTENT_ADMIN"])
    assert.equal((await save("innovallc", role)).status, 403);
  assert.equal((await save("login")).status, 400);
  assert.equal(accessed, false);
});
test("reservation locks the URL name and company row before preserving private data", async () => {
  const queries: { sql: string; values: unknown[] }[] = [];
  let saved: unknown;
  stub(prisma, "$transaction", async (run: (tx: object) => Promise<unknown>) =>
    run({
      $queryRaw: async (
        strings: TemplateStringsArray,
        ...values: unknown[]
      ) => {
        queries.push({ sql: strings.join("?"), values });
        return [];
      },
      qPayInvoice: { findMany: async () => [activeGoldInvoice(id)] },
      formResponse: {
        findFirst: async (args: { where: { id: unknown } }) =>
          typeof args.where.id === "string"
            ? {
                id,
                data: {
                  ...profile,
                  ownerUserId: "another-owner",
                  paymentTokenHash: "secret",
                  websiteDraft: published,
                },
              }
            : null,
        update: async (args: { data: { data: unknown } }) => {
          saved = args.data.data;
        },
      },
    }),
  );
  const response = await save("InnovaLLC");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { siteSlug: "innovallc" });
  assert.match(queries[0].sql, /pg_advisory_xact_lock/);
  assert.deepEqual(queries[0].values, ["mgl-club-site:innovallc"]);
  assert.match(queries[1].sql, /FOR UPDATE/);
  assert.deepEqual(saved, {
    ...profile,
    ownerUserId: "another-owner",
    paymentTokenHash: "secret",
    websiteDraft: published,
    clubSiteSlug: "innovallc",
  });
});
test("duplicate names return conflict without updating either company", async () => {
  let wrote = false;
  stub(prisma, "$transaction", async (run: (tx: object) => Promise<unknown>) =>
    run({
      $queryRaw: async () => [],
      qPayInvoice: { findMany: async () => [activeGoldInvoice(id)] },
      formResponse: {
        findFirst: async () => ({ id, data: profile }),
        update: async () => {
          wrote = true;
        },
      },
    }),
  );
  assert.equal((await save("innovallc", "SUPER_ADMIN")).status, 409);
  assert.equal(wrote, false);
});
test("public URL lookup exposes published content, never drafts or private fields", async () => {
  stub(
    prisma.formResponse,
    "findFirst",
    async (args: { where: { data: unknown } }) => {
      assert.deepEqual(args.where.data, {
        path: ["clubSiteSlug"],
        equals: "innovallc",
      });
      return {
        id,
        data: {
          ...profile,
          clubSiteSlug: "innovallc",
          websitePublished: published,
          websiteDraft: { sections: [] },
          paymentTokenHash: "secret",
          ownerUserId: "private",
        },
      };
    },
  );
  const response = await fetch(`${base}/sites/innovallc`);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(result.website, published);
  assert.equal(result.member.paymentTokenHash, undefined);
  assert.equal(result.member.ownerUserId, undefined);
  assert.equal(result.websiteDraft, undefined);
});
test("missing or unpublished-consent profiles do not resolve", async () => {
  stub(prisma.formResponse, "findFirst", async () => ({
    id,
    data: { ...profile, consent: "no" },
  }));
  assert.equal((await fetch(`${base}/sites/innovallc`)).status, 404);
  assert.equal((await fetch(`${base}/sites/login`)).status, 404);
});

test("unpaid or expired Gold cannot reserve or change a company URL", async () => {
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
    let wrote = false;
    stub(
      prisma,
      "$transaction",
      async (run: (tx: object) => Promise<unknown>) =>
        run({
          $queryRaw: async () => [],
          qPayInvoice: { findMany: async () => candidates },
          formResponse: {
            findFirst: async () => ({
              id,
              data: {
                ...profile,
                clubSiteSlug: "existing-url",
                clubFeaturedGold: true,
                goldExpiresAt: "2099-01-01T00:00:00Z",
              },
            }),
            update: async () => {
              wrote = true;
            },
          },
        }),
    );
    const response = await save("new-company-url");
    assert.equal(response.status, 403);
    const body: { access: { eligible: boolean } } = await response.json();
    assert.equal(body.access.eligible, false);
    assert.equal(wrote, false);
  }
});

test("a reserved URL never publishes an unsaved or draft-only website", async () => {
  stub(prisma.formResponse, "findFirst", async () => ({
    id,
    data: { ...profile, clubSiteSlug: "draft-only", websiteDraft: published },
  }));
  assert.equal((await fetch(`${base}/sites/draft-only`)).status, 404);
});
