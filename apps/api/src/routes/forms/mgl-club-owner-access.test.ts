import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import clubRouter from "./mgl-club.routes";
const id = "00000000-0000-4000-8000-000000000001";
const profile = {
  name: "Бат",
  businessName: "Өөрийн компани",
  sector: "Худалдаа",
  city: "Улаанбаатар",
  description: "Танилцуулга",
  offers: "Бараа",
  phone: "99112233",
  consent: "yes",
};
let server: Server, base: string;
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const old: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, old);
  });
}
function token(role = "CUSTOMER") {
  return jwt.sign(
    { userId: "owner", email: "owner@example.test", role },
    process.env.JWT_SECRET || "dev-secret-change-me",
  );
}
before(async () => {
  const app = express();
  app.use(express.json(), clubRouter);
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
function request(
  path: string,
  method = "GET",
  body?: unknown,
  role = "CUSTOMER",
) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token(role)}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
test("registration binds every authenticated role to itself and ignores owner, website and Gold spoofing", async () => {
  stub(prisma.form, "upsert", async () => ({
    id: "club-form",
    isActive: true,
  }));
  stub(
    prisma.formResponse,
    "create",
    async (args: { data: { data: Record<string, unknown> } }) => {
      const data = args.data.data;
      assert.equal(data.ownerUserId, "owner");
      assert.equal(data.clubFeaturedGold, undefined);
      assert.equal(data.websitePublished, undefined);
      assert.equal(data.clubSiteSlug, undefined);
      assert.match(String(data.paymentTokenHash), /^[0-9a-f]{64}$/);
      return { id };
    },
  );
  for (const role of [
    "CUSTOMER",
    "ORG_ADMIN",
    "OWNER",
    "HR_ADMIN",
    "CONTENT_ADMIN",
    "PARTNER_ADMIN",
    "ADMIN",
    "SUPER_ADMIN",
  ]) {
    const response = await request(
      "/responses",
      "POST",
      {
        data: {
          ...profile,
          ownerUserId: "attacker",
          clubFeaturedGold: true,
          websitePublished: {},
          clubSiteSlug: "stolen",
        },
      },
      role,
    );
    assert.equal(response.status, 201, role);
  }
});
test("owners read and edit only public profile fields, preserving paid website and private metadata", async () => {
  const stored = {
    ...profile,
    ownerUserId: "owner",
    paymentTokenHash: "private",
    profileVersion: 2,
    clubFeaturedGold: true,
    clubSiteSlug: "existing",
    websitePublished: { sections: [] },
  };
  stub(
    prisma.formResponse,
    "findFirst",
    async (args: { where: { data?: unknown } }) => {
      if (args.where.data)
        assert.deepEqual(args.where.data, {
          path: ["ownerUserId"],
          equals: "owner",
        });
      return { id, data: stored };
    },
  );
  let updated: Record<string, unknown> | undefined;
  stub(prisma, "$transaction", async (run: (tx: object) => Promise<unknown>) =>
    run({
      $queryRaw: async () => [],
      formResponse: {
        findFirst: async () => ({ id, data: stored }),
        update: async (args: { data: { data: Record<string, unknown> } }) => {
          updated = args.data.data;
          return { id };
        },
      },
    }),
  );
  const read = await request(`/my-companies/${id}/profile`);
  assert.equal(read.status, 200);
  const result: { member: Record<string, unknown> } = await read.json();
  assert.equal(result.member.ownerUserId, undefined);
  assert.equal(result.member.paymentTokenHash, undefined);
  const response = await request(`/my-companies/${id}/profile`, "PATCH", {
    data: {
      ...profile,
      businessName: "Шинэ нэр",
      ownerUserId: "attacker",
      clubFeaturedGold: false,
      websitePublished: null,
      clubSiteSlug: "stolen",
    },
    version: 2,
  });
  assert.equal(response.status, 200);
  assert.ok(updated);
  assert.equal(updated.ownerUserId, "owner");
  assert.equal(updated.paymentTokenHash, "private");
  assert.equal(updated.clubSiteSlug, "existing");
  assert.deepEqual(updated.websitePublished, stored.websitePublished);
  assert.equal(updated.profileVersion, 3);
});
test("ownership lookup errors fail closed without leaking storage details", async () => {
  stub(prisma.formResponse, "findFirst", async () => {
    throw new Error("private-database-credential");
  });
  const response = await request(`/my-companies/${id}/profile`);
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private-database-credential/);
});
