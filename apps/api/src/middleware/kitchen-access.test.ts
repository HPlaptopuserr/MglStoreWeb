import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { buildPermissionSet } from "../services/permission.service";
import { isKitchenRequest } from "@mgl/types";
import { requirePosUser } from "../routes/operations/pos/_shared";
import { restrictKitchenMember } from "./kitchen-access";

let server: Server;
let url: string;
let role = "STAFF";
let capabilities = ["KITCHEN_CHEF"];
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const old: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, old);
  });
}
const headers = {
  Authorization: `Bearer ${jwt.sign({ userId: "chef", organizationId: "restaurant", role: "USER" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
};
before(async () => {
  const app = express();
  app.use(express.json(), restrictKitchenMember);
  app.use(async (req, res) => {
    if (
      isKitchenRequest(req.method, req.path) &&
      !(await requirePosUser(req, res))
    )
      return;
    res.json({ ok: true });
  });
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
beforeEach(() => {
  role = "STAFF";
  capabilities = ["KITCHEN_CHEF"];
  stub(prisma.user, "findUnique", async () => ({
    id: "chef",
    role: "USER",
    isActive: true,
    deletedAt: null,
  }));
  stub(prisma.organizationMember, "findFirst", async () => ({
    role,
    capabilities,
    organizationId: "restaurant",
  }));
  stub(
    prisma.branch,
    "findFirst",
    async ({ where }: { where: { id: string; organizationId: string } }) =>
      where.id === "own-branch" && where.organizationId === "restaurant"
        ? { id: where.id }
        : null,
  );
});
test("chef can load kitchen, advance orders and hydrate session", async () => {
  for (const path of [
    "/restaurant/pos/kitchen-branches",
    "/restaurant/pos/kitchen-tickets?branchId=own-branch",
    "/auth/me",
    "/site-settings",
  ]) {
    assert.equal((await fetch(url + path, { headers })).status, 200, path);
  }
  assert.equal(
    (
      await fetch(url + "/restaurant/pos/kitchen-tickets/ticket/status", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: "own-branch", status: "READY" }),
      })
    ).status,
    200,
  );
});
test("chef cannot access members, inventory, sales or alternate mobile routes", async () => {
  for (const path of [
    "/org/members?organizationId=restaurant",
    "/products",
    "/pos/sales",
    "/mobile/pos/registers",
    "/restaurant/pos/tables?branchId=own-branch",
    "/auth/users",
  ]) {
    assert.equal((await fetch(url + path, { headers })).status, 403, path);
  }
});
test("chef cannot operate another organization's kitchen branch", async () => {
  assert.equal(
    (
      await fetch(url + "/restaurant/pos/kitchen-tickets?branchId=other", {
        headers,
      })
    ).status,
    403,
  );
});
test("legacy mixed capabilities never expand a chef's permission set", async () => {
  capabilities = ["KITCHEN_CHEF", "POS_CASHIER", "STOCK_MANAGER"];
  assert.equal(buildPermissionSet(role, capabilities).size, 0);
  assert.equal((await fetch(url + "/pos/sales", { headers })).status, 403);
});
test("owner and other employees retain their existing access", async () => {
  role = "OWNER";
  assert.equal((await fetch(url + "/org/members", { headers })).status, 200);
  role = "STAFF";
  capabilities = ["POS_CASHIER"];
  assert.equal((await fetch(url + "/pos/sales", { headers })).status, 200);
});

test("a transient database disconnect retries access checks without bypassing chef restrictions", async () => {
  let calls = 0;
  stub(prisma.organizationMember, "findFirst", async () => {
    if (++calls === 1) throw Object.assign(new Error("Server has closed the connection."), { code: "P1017" });
    return { role: "STAFF", capabilities: ["KITCHEN_CHEF"], organizationId: "restaurant" };
  });
  assert.equal((await fetch(url + "/pos/sales", { headers })).status, 403);
  assert.equal(calls, 2);
});

test("persistent database disconnect returns retryable 503 and never allows the protected route", async () => {
  stub(console, "error", () => undefined);
  let calls = 0;
  stub(prisma.organizationMember, "findFirst", async () => {
    calls++;
    throw Object.assign(new Error("Server has closed the connection."), { code: "P1017" });
  });
  const response = await fetch(url + "/pos/sales", { headers });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), "5");
  assert.equal(calls, 2);
  assert.equal((await response.json()).code, "SERVICE_UNAVAILABLE");
});
