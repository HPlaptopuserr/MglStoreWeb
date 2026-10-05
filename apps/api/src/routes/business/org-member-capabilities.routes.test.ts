import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import router from "./org-members.routes";

let server: Server;
let url: string;
let pos = false;
let callerRole = "OWNER";
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${jwt.sign({ userId: "owner", role: "USER" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
};
before(async () => {
  const app = express();
  app.use(express.json(), router);
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/org/members`;
});
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
beforeEach(() => {
  pos = false;
  callerRole = "OWNER";
  stub(
    prisma.organizationMember,
    "findFirst",
    async ({ where }: { where: { organizationId: string } }) =>
      where.organizationId === "store"
        ? { organizationId: "store", role: callerRole, capabilities: [] }
        : null,
  );
  stub(prisma.organization, "findUnique", async () => ({
    id: "store",
    maxMembers: 10,
  }));
  stub(prisma.organization, "findFirst", async () => ({
    businessPosEnabled: pos,
    businessSalesEnabled: false,
    businessOrdersEnabled: false,
    businessInventoryEnabled: false,
    businessAttendanceEnabled: false,
    businessTasksEnabled: false,
    businessDeliveryEnabled: false,
  }));
  stub(prisma.siteSetting, "findUnique", async () => null);
});
test("picker reads current organization settings and cannot read another organization", async () => {
  let response = await fetch(
    `${url}/available-capabilities?organizationId=store`,
    { headers },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { capabilities: [] });
  pos = true;
  response = await fetch(`${url}/available-capabilities?organizationId=store`, {
    headers,
  });
  assert.deepEqual(await response.json(), { capabilities: ["POS_CASHIER"] });
  assert.equal(
    (
      await fetch(`${url}/available-capabilities?organizationId=other`, {
        headers,
      })
    ).status,
    403,
  );
});
test("owner cannot add staff with a disabled app capability", async () => {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      organizationId: "store",
      fullName: "Employee",
      email: "employee@example.com",
      role: "STAFF",
      capabilities: ["POS_CASHIER"],
    }),
  });
  assert.equal(response.status, 409);
});

for (const role of ["OWNER", "ADMIN"]) {
  test(`${role} can add an ordinary employee from a legacy request`, async () => {
    callerRole = role;
    stub(prisma.organizationMember, "count", async () => 1);
    stub(prisma.user, "findUnique", async () => ({ id: "employee" }));
    stub(prisma.organizationMember, "findUnique", async () => null);
    stub(prisma, "$transaction", async (run: (tx: object) => Promise<unknown>) => run({
      profile: { upsert: async () => ({}) },
      organizationMember: { create: async ({ data }: { data: { role: string; organizationId: string; capabilities: string[] } }) => {
        assert.equal(data.role, "STAFF");
        assert.equal(data.organizationId, "store");
        assert.deepEqual(data.capabilities, []);
        return { id: "member" };
      } },
    }));
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify({
      organizationId: "store", fullName: "Employee", email: "employee@example.com", role: "STAFF",
    }) });
    assert.equal(response.status, 201);
  });
}
for (const targetRole of ["OWNER", "ADMIN"]) {
  test(`manager cannot assign ${targetRole}`, async () => {
    callerRole = "ADMIN";
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify({
      organizationId: "store", fullName: "Employee", email: "employee@example.com", role: targetRole,
    }) });
    assert.equal(response.status, 403);
  });
}
test("ordinary staff cannot add members", async () => {
  callerRole = "STAFF";
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify({
    organizationId: "store", fullName: "Employee", email: "employee@example.com", role: "STAFF",
  }) });
  assert.equal(response.status, 403);
});
test("manager capability picker respects organization app settings", async () => {
  callerRole = "ADMIN";
  const response = await fetch(`${url}/available-capabilities?organizationId=store`, { headers });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { capabilities: [] });
});
