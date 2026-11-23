import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import router from "./borrower-credit-account.routes";
let server: Server;
let base: string;
let active: boolean;
let scopes: unknown[];
const restore: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restore.push(() => {
    Reflect.set(target, key, previous);
  });
}
before(async () => {
  const app = express();
  app.use(router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
afterEach(() => {
  while (restore.length) restore.pop()?.();
});
beforeEach(() => {
  active = true;
  scopes = [];
  stub(prisma.user, "findFirst", async () => (active ? { id: "self" } : null));
  stub(
    prisma.posCreditSale,
    "findMany",
    async ({ where }: { where: unknown }) => {
      scopes.push(where);
      return [
        {
          id: "own-credit",
          status: "OPEN",
          principalAmount: 100000,
          paidAmount: 30000,
          monthlyInterestRate: 0.012,
          termMonths: 12,
          totalInterest: 0,
          totalDue: 100000,
          paidAt: null,
          dueDate: new Date("2030-01-01"),
          createdAt: new Date("2026-01-01"),
          organization: { id: "store", name: "Local store" },
          sale: { createdAt: new Date("2026-01-01"), receiptNo: "own-receipt" },
        },
      ];
    },
  );
});
test("personal debt always uses the authenticated subject and ignores a requested foreign user", async () => {
  const token = jwt.sign(
    { userId: "self", email: "self@local.invalid", role: "USER" },
    process.env.JWT_SECRET || "dev-secret-change-me",
  );
  const response = await fetch(
    `${base}/credit-account?userId=other&organizationId=foreign`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.totalRemaining, 70000);
  assert.equal(body.credits[0].id, "own-credit");
  assert.deepEqual(scopes, [
    { borrowerUserId: "self", status: { in: ["OPEN", "OVERDUE"] } },
  ]);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("anonymous and inactive accounts cannot read personal debt", async () => {
  assert.equal((await fetch(`${base}/credit-account`)).status, 401);
  active = false;
  const token = jwt.sign(
    { userId: "self" },
    process.env.JWT_SECRET || "dev-secret-change-me",
  );
  assert.equal(
    (
      await fetch(`${base}/credit-account`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).status,
    401,
  );
  assert.equal(scopes.length, 0);
});
