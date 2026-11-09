import assert from "node:assert/strict";
import { beforeEach, afterEach, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { createCommunityEditRouter } from "./community-2003-edit.routes";

const profile = {
  name: "Бат",
  profession: "Инженер",
  phone: "99112233",
  business: "no",
  consent: "yes",
  publishConsent: "yes",
};
let server: Server;
let base: string;
let status: "PENDING" | "VERIFIED" = "PENDING";
let statusPhone = profile.phone;
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const original: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => Reflect.set(target, key, original));
}
beforeEach(async () => {
  status = "PENDING";
  statusPhone = profile.phone;
  const app = express();
  app.use(
    express.json(),
    createCommunityEditRouter({
      createSession: async (phone) => ({
        sessionId: "session",
        phone,
        shortcode: "1234",
        text: "123456",
        smsUri: "sms:1234?body=123456",
        displayInstruction: "SMS",
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      }),
      getStatus: async (sessionId) => ({
        sessionId,
        phone: statusPhone,
        sessionStatus: status,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      }),
    }),
  );
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/forms/2003/edit`;
});
afterEach(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  while (restores.length) restores.pop()?.();
});
const send = (path: string, data: unknown, token?: string, method = "POST") =>
  fetch(`${base}/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
async function start() {
  const response = await send("start", { phone: profile.phone });
  assert.equal(response.status, 200);
  const data: unknown = await response.json();
  assert.ok(
    data &&
      typeof data === "object" &&
      "challengeToken" in data &&
      typeof data.challengeToken === "string",
  );
  return data.challengeToken;
}
async function verifiedToken() {
  const challengeToken = await start();
  status = "VERIFIED";
  stub(prisma.formResponse, "findMany", async (args: unknown) => {
    assert.deepEqual(args, {
      where: {
        form: { slug: "2003", isActive: true },
        data: { path: ["phone"], equals: profile.phone },
      },
      select: { id: true, data: true },
      orderBy: { submittedAt: "desc" },
    });
    return [
      {
        id: "mine",
        data: { ...profile, publicationSource: "owner", secret: "hidden" },
      },
    ];
  });
  const response = await send("verify", { challengeToken });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const data: unknown = await response.json();
  assert.ok(
    data &&
      typeof data === "object" &&
      "responses" in data &&
      Array.isArray(data.responses),
  );
  const row: unknown = data.responses[0];
  assert.ok(
    row &&
      typeof row === "object" &&
      "editToken" in row &&
      typeof row.editToken === "string" &&
      "data" in row,
  );
  assert.ok(row.data && typeof row.data === "object");
  assert.equal("secret" in row.data, false);
  assert.equal("publicationSource" in row.data, false);
  return row.editToken;
}
test("does not disclose profiles before matching phone verification", async () => {
  const token = await start();
  stub(prisma.formResponse, "findMany", async () => {
    assert.fail("Must not read before verification");
  });
  assert.equal((await send("verify", { challengeToken: token })).status, 403);
  status = "VERIFIED";
  statusPhone = "88112233";
  assert.equal((await send("verify", { challengeToken: token })).status, 403);
  assert.equal(
    (await send("verify", { challengeToken: token + "tampered" })).status,
    401,
  );
});
test("verified owner can update their profile while server audit fields are preserved", async () => {
  const token = await verifiedToken();
  stub(prisma.formResponse, "findFirst", async (args: unknown) => {
    assert.deepEqual(args, {
      where: { id: "mine", form: { slug: "2003", isActive: true } },
      select: { id: true, data: true },
    });
    return { id: "mine", data: { ...profile, publicationSource: "owner" } };
  });
  let updated = false;
  stub(
    prisma.formResponse,
    "update",
    async (args: {
      where: { id: string };
      data: { data: Record<string, unknown> };
    }) => {
      updated = true;
      assert.equal(args.where.id, "mine");
      assert.equal(args.data.data.name, "Шинэ нэр");
      assert.equal(args.data.data.phone, "88112233");
      assert.equal(args.data.data.publishConsent, "");
      assert.equal(args.data.data.publicationSource, "owner");
      assert.equal(typeof args.data.data.editedAt, "string");
      return {};
    },
  );
  const response = await send(
    "mine",
    {
      data: {
        ...profile,
        name: "Шинэ нэр",
        phone: "88112233",
        publishConsent: "",
        publicationSource: "forged",
      },
    },
    token,
    "PUT",
  );
  assert.equal(response.status, 200);
  assert.equal(updated, true);
});
test("edit tokens cannot change another response or be replaced by a login token", async () => {
  const token = await verifiedToken();
  stub(prisma.formResponse, "update", async () => {
    assert.fail("Unauthorized update");
  });
  assert.equal(
    (await send("other", { data: profile }, token, "PUT")).status,
    401,
  );
  const loginToken = jwt.sign(
    { userId: "mine" },
    process.env.JWT_SECRET || "dev-secret-change-me",
  );
  assert.equal(
    (await send("mine", { data: profile }, loginToken, "PUT")).status,
    401,
  );
  assert.equal(
    (await send("mine", { data: profile }, undefined, "PUT")).status,
    401,
  );
  const expired = jwt.sign(
    { purpose: "edit", responseId: "mine" },
    process.env.JWT_SECRET || "dev-secret-change-me",
    { audience: "community-2003-editor", expiresIn: -1 },
  );
  assert.equal(
    (await send("mine", { data: profile }, expired, "PUT")).status,
    401,
  );
});
test("invalid edits and unavailable forms cannot be saved", async () => {
  const token = await verifiedToken();
  assert.equal(
    (await send("mine", { data: { ...profile, phone: "bad" } }, token, "PUT"))
      .status,
    400,
  );
  stub(prisma.formResponse, "findFirst", async () => null);
  assert.equal(
    (await send("mine", { data: profile }, token, "PUT")).status,
    404,
  );
});

test("signed-in users load their own and legacy profiles without SMS", async () => {
  const login = jwt.sign(
    { userId: "account", role: "USER", email: "test@example.test" },
    process.env.JWT_SECRET || "dev-secret-change-me",
  );
  stub(prisma.user, "findFirst", async (args: unknown) => {
    assert.deepEqual(args, {
      where: { id: "account", isActive: true, deletedAt: null },
      select: { id: true, profile: { select: { phoneNumber: true } } },
    });
    return { id: "account", profile: { phoneNumber: "+97699112233" } };
  });
  stub(prisma.formResponse, "findMany", async (args: unknown) => {
    assert.deepEqual(args, {
      where: {
        form: { slug: "2003", isActive: true },
        OR: [
          { data: { path: ["ownerUserId"], equals: "account" } },
          { data: { path: ["phone"], equals: profile.phone } },
        ],
      },
      select: { id: true, data: true },
      orderBy: { submittedAt: "desc" },
    });
    return [
      {
        id: "mine",
        data: { ...profile, ownerUserId: "account", phone: "88112233" },
      },
      { id: "legacy", data: profile },
      { id: "other", data: { ...profile, ownerUserId: "other" } },
      { id: "unrelated", data: { ...profile, phone: "77112233" } },
    ];
  });
  const response = await fetch(`${base}/mine`, {
    headers: { Authorization: `Bearer ${login}` },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const data: unknown = await response.json();
  assert.ok(
    data &&
      typeof data === "object" &&
      "responses" in data &&
      Array.isArray(data.responses),
  );
  assert.equal(data.responses.length, 2);
  const row: unknown = data.responses[1];
  assert.ok(
    row &&
      typeof row === "object" &&
      "id" in row &&
      "editToken" in row &&
      typeof row.editToken === "string",
  );
  assert.equal(row.id, "legacy");
  stub(prisma.formResponse, "findFirst", async () => ({
    id: "legacy",
    data: profile,
  }));
  let saved = false;
  stub(
    prisma.formResponse,
    "update",
    async (args: { data: { data: Record<string, unknown> } }) => {
      saved = true;
      assert.equal(args.data.data.ownerUserId, "account");
      return {};
    },
  );
  assert.equal(
    (await send("legacy", { data: profile }, row.editToken, "PUT")).status,
    200,
  );
  assert.equal(saved, true);
});

test("signed-in loading rejects missing login and inactive accounts", async () => {
  assert.equal((await fetch(`${base}/mine`)).status, 401);
  stub(prisma.user, "findFirst", async () => null);
  const login = jwt.sign(
    { userId: "inactive", role: "USER" },
    process.env.JWT_SECRET || "dev-secret-change-me",
  );
  assert.equal(
    (
      await fetch(`${base}/mine`, {
        headers: { Authorization: `Bearer ${login}` },
      })
    ).status,
    401,
  );
});
