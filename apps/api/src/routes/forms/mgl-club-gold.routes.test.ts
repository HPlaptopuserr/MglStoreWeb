import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { createClubGoldRouter } from "./mgl-club-gold.routes";
import { activeGoldInvoice } from "./mgl-club-gold.test-support";
const id = "00000000-0000-4000-8000-000000000001";
const token = jwt.sign(
  { userId: "admin", email: "admin@example.test", role: "ADMIN" },
  process.env.JWT_SECRET || "dev-secret-change-me",
);
let server: Server, base: string;
const restores: Array<() => void> = [];
function stub(target: object, key: string, replacement: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, replacement);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
before(async () => {
  const app = express();
  app.use(express.json(), createClubGoldRouter());
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
function post(path: string) {
  return fetch(`${base}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
test("active paid membership cannot create another admin invoice or mutate profile", async () => {
  stub(prisma.qPayInvoice, "findMany", async () => [activeGoldInvoice(id)]);
  let profileTouched = false;
  stub(prisma.formResponse, "findFirst", async () => {
    profileTouched = true;
    throw new Error("unexpected profile access");
  });
  const response = await post(`${id}/gold-invoice`);
  assert.equal(response.status, 409);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const data: { access: { eligible: boolean } } = await response.json();
  assert.equal(data.access.eligible, true);
  assert.equal(profileTouched, false);
});
test("admin billing rejects invalid identifiers and hides storage failures", async () => {
  assert.equal((await post("invalid/gold-invoice")).status, 400);
  assert.equal((await post(`${id}/gold-invoices/invalid/check`)).status, 400);
  stub(prisma.qPayInvoice, "findMany", async () => {
    throw new Error("private connection secret");
  });
  const response = await post(`${id}/gold-invoice`);
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private connection secret/);
});
