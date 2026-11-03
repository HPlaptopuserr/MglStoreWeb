import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import cardRoutes from "./card-payments.routes";
import { JWT_SECRET } from "./_shared";

let server: Server;
let url: string;
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const original: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => { Reflect.set(target, key, original); });
}
const headers = { Authorization: `Bearer ${jwt.sign({ userId: "cashier", organizationId: "store" }, JWT_SECRET)}` };
const disconnected = () => Object.assign(new Error("Server has closed the connection."), { code: "P1017" });
before(async () => {
  const app = express();
  app.use(cardRoutes);
  server = await new Promise<Server>(resolve => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/pos/payments/card/status/attempt`;
});
after(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
afterEach(() => { while (restores.length) restores.pop()?.(); });
beforeEach(() => {
  stub(console, "error", () => undefined);
  stub(prisma.user, "findUnique", async () => ({ id: "cashier", role: "USER", isActive: true, deletedAt: null }));
  stub(prisma.organizationMember, "findFirst", async () => ({ organizationId: "store", role: "OWNER", capabilities: [] }));
  stub(prisma.organizationMember, "count", async () => 1);
});

test("a payment status read resumes after a single closed connection without authorizing another charge", async () => {
  let calls = 0;
  stub(prisma.cardPaymentAttempt, "findUnique", async () => {
    if (++calls === 1) throw disconnected();
    return { id: "attempt", organizationId: "store", amount: 4300, terminalId: "terminal", status: "APPROVED", providerPayload: null, createdAt: new Date(), updatedAt: new Date() };
  });
  const response = await fetch(url, { headers });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "APPROVED");
  assert.equal(calls, 2);
});

test("a persistent status outage is retryable and does not report a failed payment", async () => {
  stub(prisma.cardPaymentAttempt, "findUnique", async () => { throw disconnected(); });
  const response = await fetch(url, { headers });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), "5");
  const body = await response.json();
  assert.equal(body.code, "SERVICE_UNAVAILABLE");
  assert.equal(body.status, undefined);
  assert.match(body.message, /дахин карт уншуулахгүй/);
});

test("a disconnect during route authentication is also a service outage", async () => {
  stub(prisma.user, "findUnique", async () => { throw disconnected(); });
  const response = await fetch(url, { headers });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "SERVICE_UNAVAILABLE");
});
