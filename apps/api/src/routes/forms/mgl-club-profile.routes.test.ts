import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import {
  innovaWebsite,
  parseClubWebsite,
  parseMglClubProfile,
} from "@mgl/types";
import { createClubProfileRouter } from "./mgl-club-profile.routes";

const id = "00000000-0000-4000-8000-000000000001";
const profile = {
  name: "Бат",
  businessName: "Компани",
  sector: "Худалдаа",
  city: "Улаанбаатар",
  description: "Байгууллагын танилцуулга",
  offers: "Бараа нийлүүлэлт",
  needs: "",
  foundedYear: "",
  role: "",
  teamSize: "",
  address: "",
  workingHours: "",
  serviceArea: "",
  website: "",
  phone: "99112233",
  logoUrl: "https://example.test/company.webp",
  consent: "yes",
};
const adminToken = token("ADMIN");
let server: Server, base: string;
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => Reflect.set(target, key, previous));
}
function token(role: string) {
  return jwt.sign(
    { userId: "system-admin", email: "admin@example.test", role },
    process.env.JWT_SECRET || "dev-secret-change-me",
  );
}
before(async () => {
  const app = express();
  app.use(express.json(), createClubProfileRouter());
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/forms/mgl-club/my-companies`;
});
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
function request(
  path: string,
  method: string,
  body?: unknown,
  auth: string | null = adminToken,
) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function patch(
  data: unknown = profile,
  version: unknown = 0,
  auth: string | null = adminToken,
) {
  return request(`/${id}/profile`, "PATCH", { data, version }, auth);
}
interface DatabaseState {
  stored: Prisma.JsonObject;
  updates: number;
  queries: { sql: string; values: unknown[] }[];
}
function database(data: Prisma.JsonObject, missing = false): DatabaseState {
  const state: DatabaseState = { stored: data, updates: 0, queries: [] };
  const findFirst = async (args: {
    where: { id: string; form: { slug: string; isActive: boolean } };
  }) => {
    assert.equal(
      args.where.id,
      id,
      "lookup must use the URL company, not client-supplied IDs",
    );
    assert.deepEqual(args.where.form, { slug: "mgl-club", isActive: true });
    return missing ? null : { id, data: state.stored };
  };
  stub(prisma.formResponse, "findFirst", findFirst);
  stub(prisma, "$transaction", async (run: (tx: object) => Promise<unknown>) =>
    run({
      $queryRaw: async (
        strings: TemplateStringsArray,
        ...values: unknown[]
      ) => {
        state.queries.push({ sql: strings.join("?"), values });
        return [];
      },
      formResponse: {
        findFirst: async (args: Parameters<typeof findFirst>[0]) => {
          assert.ok(
            state.queries.some((query) => /FOR UPDATE/.test(query.sql)),
            "profile must be read after acquiring its row lock",
          );
          return findFirst(args);
        },
        update: async (args: {
          where: { id: string };
          data: { data: Prisma.JsonObject };
        }) => {
          assert.deepEqual(args.where, { id });
          state.updates += 1;
          state.stored = args.data.data;
          return { id, data: state.stored };
        },
      },
    }),
  );
  return state;
}

test("anonymous profile requests and nonadmin Innova imports stop before storage", async () => {
  let accessed = false;
  for (const target of [prisma, prisma.formResponse, prisma.form])
    for (const key of target === prisma
      ? ["$transaction"]
      : ["findFirst", "findMany", "findUnique", "create", "update", "upsert"])
      stub(target, key, async () => {
        accessed = true;
        throw new Error("unexpected storage access");
      });
  for (const [method, path, body] of [
    ["GET", `/${id}/profile`, undefined],
    ["PATCH", `/${id}/profile`, { data: profile, version: 0 }],
    ["POST", "/import-innova", undefined],
  ] as const)
    assert.equal((await request(path, method, body, null)).status, 401);
  for (const role of [
    "CUSTOMER",
    "OWNER",
    "CONTENT_ADMIN",
    "ORG_ADMIN",
    "HR_ADMIN",
  ])
    assert.equal(
      (await request("/import-innova", "POST", undefined, token(role))).status,
      403,
    );
  assert.equal(accessed, false);
});

test("profile GET returns only public profile fields and its independent version", async () => {
  database({
    ...profile,
    ownerUserId: "private-owner",
    paymentTokenHash: "private-token",
    websiteDraft: { title: "private draft" },
    clubSiteSlug: "company",
    profileVersion: 4,
  });
  for (const role of ["ADMIN", "SUPER_ADMIN"]) {
    const response = await request(
      `/${id}/profile`,
      "GET",
      undefined,
      token(role),
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    const { consent: _consent, ...publicProfile } = profile;
    assert.deepEqual(body, { member: { id, ...publicProfile }, version: 4 });
    assert.match(response.headers.get("cache-control") || "", /no-store/);
  }
});

test("profile PATCH rejects malformed input and invalid IDs without storage writes", async () => {
  let accessed = false;
  stub(prisma, "$transaction", async () => {
    accessed = true;
    throw new Error("invalid input must not reach storage");
  });
  for (const data of [
    null,
    [],
    {},
    { ...profile, consent: "no" },
    { ...profile, businessName: " " },
    { ...profile, phone: "123" },
    { ...profile, logoUrl: "javascript:alert(1)" },
  ]) {
    assert.equal((await patch(data)).status, 400);
  }
  for (const version of [null, -1, 0.5, "0"]) {
    assert.equal((await patch(profile, version)).status, 400);
  }
  assert.equal(
    (
      await request("/not-a-company/profile", "PATCH", {
        data: profile,
        version: 0,
      })
    ).status,
    400,
  );
  assert.equal(
    (await request(`/${id}/profile`, "PATCH", { data: profile })).status,
    400,
  );
  assert.equal(accessed, false);
});

test("profile updates normalize known fields and preserve website, URL, ownership and payment metadata", async () => {
  const metadata = {
    ownerUserId: "different-owner",
    paymentTokenHash: "secret",
    clubSiteSlug: "keep-this-url",
    websiteVersion: 7,
    websiteDraft: { sections: [{ id: "home", title: "Draft" }] },
    websitePublished: { sections: [{ id: "home", title: "Published" }] },
    goldInvoiceId: "paid-invoice",
    goldExpiresAt: "2027-01-01T00:00:00.000Z",
  };
  const state = database({ ...profile, ...metadata, profileVersion: 3 });
  const input = {
    ...profile,
    businessName: "  Шинэ нэр  ",
    city: "Дархан",
    phone: "88112233",
    companyId: "wrong-company",
    ownerUserId: "injected-owner",
    clubSiteSlug: "stolen-url",
    websiteVersion: 0,
    websiteDraft: {},
    profileVersion: 100,
    goldExpiresAt: "2099-01-01",
    clubFeaturedGold: true,
  };
  const response = await patch(input, 3);
  assert.equal(response.status, 200);
  const normalized = parseMglClubProfile(input);
  assert.ok(normalized);
  const { consent: _consent, ...publicProfile } = normalized;
  assert.deepEqual(await response.json(), {
    member: { id, ...publicProfile },
    version: 4,
  });
  const { profileUpdatedAt, ...storedWithoutTimestamp } = state.stored;
  assert.equal(typeof profileUpdatedAt, "string");
  assert.ok(Number.isFinite(Date.parse(String(profileUpdatedAt))));
  assert.deepEqual(storedWithoutTimestamp, {
    ...normalized,
    ...metadata,
    profileVersion: 4,
  });
  assert.equal(state.updates, 1);
  assert.match(state.queries[0].sql, /FOR UPDATE/);
  assert.deepEqual(state.queries[0].values, [id]);
});

test("legacy profiles begin at version zero and the second stale editor gets a conflict", async () => {
  const state = database({ ...profile, websiteVersion: 12 });
  assert.equal(
    (await patch({ ...profile, businessName: "First editor" }, 0)).status,
    200,
  );
  assert.equal(
    (await patch({ ...profile, businessName: "Stale second editor" }, 0))
      .status,
    409,
  );
  assert.equal(state.stored.businessName, "First editor");
  assert.equal(state.stored.websiteVersion, 12);
  assert.equal(state.stored.profileVersion, 1);
  assert.equal(state.updates, 1);
});

test("missing companies return 404 and storage errors are retryable without private error details", async () => {
  const state = database({ ...profile }, true);
  assert.equal((await request(`/${id}/profile`, "GET")).status, 404);
  assert.equal((await patch()).status, 404);
  assert.equal(state.updates, 0);
  stub(prisma, "$transaction", async () => {
    throw new Error("postgresql://private-password");
  });
  const response = await patch();
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("private-password"), false);
});

test("an administrator can remove the old logo without altering unrelated private state", async () => {
  const state = database({
    ...profile,
    paymentTokenHash: "keep-secret",
    profileVersion: 2,
  });
  const response = await patch({ ...profile, logoUrl: "" }, 2);
  assert.equal(response.status, 200);
  const result: { member: { logoUrl?: string }; version: number } =
    await response.json();
  assert.equal(result.member.logoUrl || "", "");
  assert.equal(state.stored.logoUrl || "", "");
  assert.equal(state.stored.paymentTokenHash, "keep-secret");
  assert.equal(result.version, 3);
});

interface ImportedRow {
  id: string;
  data: Prisma.JsonObject;
}
interface ImportState {
  row: ImportedRow | null;
  creates: number;
  locks: unknown[][];
}
function importDatabase(
  existing: ImportedRow | null = null,
  active = true,
): ImportState {
  const state: ImportState = { row: existing, creates: 0, locks: [] };
  stub(prisma, "$transaction", async (run: (tx: object) => Promise<unknown>) =>
    run({
      $queryRaw: async (
        strings: TemplateStringsArray,
        ...values: unknown[]
      ) => {
        assert.match(strings.join("?"), /pg_advisory_xact_lock/);
        assert.match(strings.join("?"), /SELECT 1 AS locked FROM/);
        state.locks.push(values);
        return [];
      },
      form: {
        upsert: async (args: { where: { slug: string }; update: unknown }) => {
          assert.ok(
            state.locks.length > 0,
            "reserve the public URL before finding or importing its record",
          );
          assert.deepEqual(args.where, { slug: "mgl-club" });
          assert.deepEqual(args.update, {});
          return { id: "club-form", isActive: active };
        },
      },
      formResponse: {
        findFirst: async (args: { where: unknown }) => {
          assert.deepEqual(args.where, {
            formId: "club-form",
            data: { path: ["clubSiteSlug"], equals: "innovallc" },
          });
          return state.row;
        },
        create: async (args: {
          data: { formId: string; data: Prisma.JsonObject };
        }) => {
          assert.equal(args.data.formId, "club-form");
          state.creates += 1;
          state.row = { id, data: args.data.data };
          return state.row;
        },
      },
    }),
  );
  return state;
}

test("Innova import reserves its URL, creates a genuine editable profile, and never fabricates a payment", async () => {
  const state = importDatabase();
  const response = await request(
    "/import-innova",
    "POST",
    {
      ownerUserId: "injected",
      clubSiteSlug: "wrong-url",
      websitePublished: "injected",
    },
    token("SUPER_ADMIN"),
  );
  assert.equal(response.status, 200);
  const body: {
    imported: boolean;
    siteSlug: string;
    member: { id: string; businessName: string };
    version: number;
  } = await response.json();
  assert.equal(body.imported, true);
  assert.equal(body.siteSlug, "innovallc");
  assert.equal(body.member.id, id);
  assert.equal(body.member.businessName, "Иннова ХХК");
  assert.equal(body.version, 0);
  assert.equal(state.creates, 1);
  assert.deepEqual(state.locks, [["mgl-club-site:innovallc"]]);
  const data = state.row?.data;
  assert.ok(data);
  assert.ok(parseMglClubProfile(data));
  assert.ok(parseClubWebsite(data.websitePublished));
  assert.deepEqual(data.websitePublished, innovaWebsite);
  assert.deepEqual(data.websiteDraft, innovaWebsite);
  assert.equal(data.clubSiteSlug, "innovallc");
  assert.equal(data.clubFeaturedGold, true);
  for (const key of [
    "ownerUserId",
    "paymentTokenHash",
    "goldInvoiceId",
    "goldExpiresAt",
    "paidAt",
  ])
    assert.equal(
      data[key],
      undefined,
      `${key} must not be invented by a content import`,
    );
});

test("repeated import returns the existing profile and preserves administrator edits", async () => {
  const original = {
    ...profile,
    businessName: "Иннова шинэ нэр",
    profileVersion: 7,
    clubSiteSlug: "innovallc",
    websitePublished: { title: "Administrator publication" },
    paymentTokenHash: "private",
  };
  const state = importDatabase({ id, data: original });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await request("/import-innova", "POST");
    assert.equal(response.status, 200);
    const body: {
      imported: boolean;
      version: number;
      member: { id: string; businessName: string; paymentTokenHash?: string };
    } = await response.json();
    assert.equal(body.imported, false);
    assert.equal(body.version, 7);
    assert.equal(body.member.businessName, "Иннова шинэ нэр");
    assert.equal(body.member.id, id);
    assert.equal(body.member.paymentTokenHash, undefined);
  }
  assert.equal(state.creates, 0);
  assert.deepEqual(state.row?.data, original);
});

test("an already reserved incomplete profile or closed club form cannot be overwritten by importing", async () => {
  const incomplete = {
    clubSiteSlug: "innovallc",
    websiteDraft: { private: true },
  };
  let state = importDatabase({ id, data: incomplete });
  assert.equal((await request("/import-innova", "POST")).status, 409);
  assert.equal(state.creates, 0);
  assert.deepEqual(state.row?.data, incomplete);
  state = importDatabase(null, false);
  assert.equal((await request("/import-innova", "POST")).status, 409);
  assert.equal(state.creates, 0);
});
