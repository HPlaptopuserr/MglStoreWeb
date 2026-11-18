import jwt from "jsonwebtoken";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { prisma, Prisma } from "@mgl/database";
import router from "./mgl-club.routes";
let server: Server;
let base: string;
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
function stubQuery(handler: (query: Prisma.Sql) => Promise<unknown>) {
  stub(prisma, "$queryRaw", async (query: Prisma.Sql) =>
    query.sql.includes("GROUP BY") ? [] : handler(query),
  );
}
const profile = {
  name: "Бат",
  businessName: "Бизнес",
  sector: "Худалдаа",
  city: "Дархан-Уул",
  description: "Танилцуулга",
  offers: "Бүтээгдэхүүн",
  needs: "Хүргэлт",
  phone: "99112233",
  consent: "yes",
  foundedYear: "",
  role: "",
  teamSize: "",
  address: "",
  workingHours: "",
  serviceArea: "",
  website: "",
};
before(async () => {
  const app = express();
  app.use(express.json(), router);
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
const submit = (data: unknown) =>
  fetch(`${base}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt.sign({ userId: "system-admin", role: "ADMIN", email: "admin@example.test" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
    },
    body: JSON.stringify({ data }),
  });
test("saves normalized profiles under an isolated club form", async () => {
  stub(prisma.form, "upsert", async (args: { where: { slug: string } }) => {
    assert.equal(args.where.slug, "mgl-club");
    return { id: "club", isActive: true };
  });
  stub(
    prisma.formResponse,
    "create",
    async (args: { data: { formId: string; data: unknown } }) => {
      assert.equal(args.data.formId, "club");
      const saved = args.data.data as Record<string, unknown>;
      const { paymentTokenHash, ownerUserId, ...publicData } = saved;
      assert.equal(ownerUserId, "system-admin");
      assert.match(String(paymentTokenHash), /^[0-9a-f]{64}$/);
      assert.deepEqual(publicData, profile);
      return {};
    },
  );
  assert.equal(
    (await submit({ ...profile, privateField: "hidden" })).status,
    201,
  );
});
test("rejects invalid registration before accessing storage", async () => {
  assert.equal((await submit({ ...profile, consent: "no" })).status, 400);
});
test("respects closed registration", async () => {
  stub(prisma.form, "upsert", async () => ({ id: "club", isActive: false }));
  assert.equal((await submit(profile)).status, 410);
});
test("public listing selects consenting club profiles and never returns unknown fields", async () => {
  stubQuery(async (args: Prisma.Sql) => {
    assert.ok(args.values.includes("mgl-club"));
    assert.ok(args.values.includes("Худалдаа"));
    assert.ok(args.values.includes("%хүргэлт%"));
    assert.ok(args.sql.includes('"isActive" = TRUE'));
    assert.ok(args.sql.includes("'consent' = 'yes'"));
    assert.ok(args.sql.includes("LIMIT 25"));
    return [
      { id: "one", data: { ...profile, adminNotes: "hidden" } },
      { id: "two", data: { ...profile, consent: "no" } },
    ];
  });
  const response = await fetch(`${base}/members?q=Хүргэлт&sector=Худалдаа`);
  const body = await response.json();
  const { consent: _consent, ...publicProfile } = profile;
  assert.deepEqual(body, {
    members: [{ id: "one", ...publicProfile }],
    nextCursor: null,
    services: [],
  });
});
test("pagination returns a stable cursor and limits the public page", async () => {
  stubQuery(async () =>
    Array.from({ length: 25 }, (_, index) => ({
      id: `member-${index}`,
      data: profile,
    })),
  );
  const body = await (await fetch(`${base}/members`)).json();
  assert.equal(body.members.length, 24);
  assert.equal(body.nextCursor, "member-23");
  assert.equal((await fetch(`${base}/members?cursor=invalid`)).status, 400);
});
test("storage failures return a retryable error without leaking database details", async () => {
  stubQuery(async () => {
    throw new Error("private database details");
  });
  const response = await fetch(`${base}/members`);
  assert.equal(response.status, 500);
  assert.equal(
    (await response.text()).includes("private database details"),
    false,
  );
});

test("province filter is parameterized and rejects unknown provinces", async () => {
  stubQuery(async (args: Prisma.Sql) => {
    assert.ok(args.sql.includes("TRIM(r.\"data\"->>'city') IN"));
    assert.ok(args.values.includes("Дархан-Уул"));
    assert.ok(args.values.includes("Дархан"));
    return [{ id: "legacy", data: { ...profile, city: "Дархан" } }];
  });
  const response = await fetch(
    `${base}/members?city=${encodeURIComponent("Дархан-Уул")}`,
  );
  const body = await response.json();
  assert.equal(body.members[0].city, "Дархан-Уул");
  assert.equal((await fetch(`${base}/members?city=unknown`)).status, 400);
});

test("province service availability stays complete while member results are filtered", async () => {
  const groups = [
    { sector: "Тээвэр, логистик", count: 32 },
    { sector: "Барилга, үл хөдлөх", count: 7 },
  ];
  const cursor = "00000000-0000-4000-a000-000000000001";
  stub(prisma, "$queryRaw", async (query: Prisma.Sql) => {
    if (query.sql.includes("GROUP BY")) {
      assert.ok(query.values.includes("Хөвсгөл"));
      assert.ok(!query.values.includes(cursor));
      assert.ok(!query.values.includes("Тээвэр, логистик"));
      assert.ok(!query.values.includes("%хүргэлт%"));
      return groups;
    }
    assert.ok(!query.values.includes("needs"));
    assert.ok(query.values.includes("offers"));
    assert.ok(query.values.includes(cursor));
    return [{ id: "result", data: { ...profile, city: "Хөвсгөл" } }];
  });
  const params = new URLSearchParams({
    city: "Хөвсгөл",
    sector: "Тээвэр, логистик",
    q: "хүргэлт",
    scope: "services",
    cursor,
  });
  const response = await fetch(`${base}/members?${params}`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.members.length, 1);
  assert.deepEqual(body.services, [groups[1], groups[0]]);
  assert.equal((await fetch(`${base}/members?scope=invalid`)).status, 400);
});

test("needs directory excludes blank needs and searches buying needs rather than offered services", async () => {
  const cursor = "00000000-0000-4000-a000-000000000001";
  stub(prisma, "$queryRaw", async (query: Prisma.Sql) => {
    assert.ok(
      query.sql.includes("NULLIF(BTRIM(r.\"data\"->>'needs'), '') IS NOT NULL"),
    );
    assert.ok(query.sql.includes("'consent' = 'yes'"));
    assert.ok(query.values.includes("Хөвсгөл"));
    if (query.sql.includes("GROUP BY")) {
      assert.ok(!query.values.includes(cursor));
      assert.ok(!query.values.includes("%хүргэлт%"));
      return [{ sector: "Худалдаа", count: 15 }];
    }
    assert.ok(query.values.includes("needs"));
    assert.ok(!query.values.includes("offers"));
    assert.ok(!query.values.includes("description"));
    assert.ok(query.values.includes("%хүргэлт%"));
    assert.ok(query.values.includes(cursor));
    return [
      { id: "need", data: { ...profile, city: "Хөвсгөл", isDemo: true } },
    ];
  });
  const params = new URLSearchParams({
    scope: "needs",
    city: "Хөвсгөл",
    q: "хүргэлт",
    cursor,
  });
  const response = await fetch(`${base}/members?${params}`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.members[0].needs, "Хүргэлт");
  assert.equal(body.members[0].isDemo, true);
  assert.deepEqual(body.services, [{ sector: "Худалдаа", count: 15 }]);
});

test("gold logos allow an explicit admin selection or a settled unexpired gold invoice", async () => {
  stubQuery(async (query: Prisma.Sql) => {
    assert.ok(query.sql.includes('FROM "QPayInvoice"'));
    assert.ok(query.sql.includes("clubFeaturedGold"));
    assert.match(query.sql, /clubFeaturedGold' = 'true' OR EXISTS/);
    assert.ok(query.sql.includes("p.\"status\" = 'PAID'"));
    assert.ok(query.sql.includes('p."amount" = 1200000'));
    assert.ok(query.sql.includes("accessExpiresAt"));
    assert.ok(query.sql.includes("MGL_CLUB_GOLD"));
    assert.ok(query.sql.includes("'isDemo'"));
    return [];
  });
  assert.equal((await fetch(`${base}/members?scope=gold`)).status, 200);
});
test("directory search expands Latin products and spoken company initials before pagination", async () => {
  for (const [queryText, expected] of [
    ["block", "%блок%"],
    ["эм жи эл", "%mgl%"],
  ]) {
    stubQuery(async (query: Prisma.Sql) => {
      assert.ok(query.values.includes(expected));
      assert.ok(query.values.includes("offers"));
      assert.ok(query.sql.includes("LIMIT 25"));
      assert.ok(query.sql.includes("p.\"status\" = 'PAID'"));
      return [];
    });
    assert.equal(
      (
        await fetch(
          `${base}/members?scope=gold&q=${encodeURIComponent(queryText)}`,
        )
      ).status,
      200,
    );
  }
});
test("expanded search still treats percent and underscore as literal characters", async () => {
  stubQuery(async (query: Prisma.Sql) => {
    assert.ok(query.values.includes("%50\\%\\_%"));
    assert.ok(!query.values.includes("%50%_%"));
    return [];
  });
  assert.equal((await fetch(`${base}/members?q=50%25_`)).status, 200);
});

test("company pages only return consenting public profile fields", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  stub(prisma.formResponse, "findFirst", async () => ({
    id,
    data: { ...profile, ownerUserId: "private", paymentTokenHash: "secret" },
  }));
  const response = await fetch(`${base}/members/${id}`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.member.businessName, profile.businessName);
  assert.equal(body.member.ownerUserId, undefined);
  assert.equal(body.member.paymentTokenHash, undefined);
  stub(prisma.formResponse, "findFirst", async () => ({
    id,
    data: { ...profile, consent: "no" },
  }));
  assert.equal((await fetch(`${base}/members/${id}`)).status, 404);
});

test("company page exposes the published website and never the private draft", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const section = {
    id: "home",
    type: "hero",
    title: "Published",
    eyebrow: "",
    text: "",
    imageUrl: "",
    imageAlt: "",
    layout: "image-right",
    tone: "dark",
    items: [],
  };
  stub(prisma.formResponse, "findFirst", async () => ({
    id,
    data: {
      ...profile,
      websiteDraft: { sections: [{ ...section, title: "Private draft" }] },
      websitePublished: { sections: [section] },
    },
  }));
  const response = await fetch(`${base}/members/${id}`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.website.sections[0].title, "Published");
  assert.equal(body.member.websiteDraft, undefined);
  assert.equal(JSON.stringify(body).includes("Private draft"), false);
});
