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
  stub(
    prisma.organizationMember,
    "findFirst",
    async ({ where }: { where: { organizationId: string } }) =>
      where.organizationId === "store"
        ? { organizationId: "store", role: "OWNER", capabilities: [] }
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
