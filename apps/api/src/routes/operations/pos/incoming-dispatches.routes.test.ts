import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { restrictKitchenMember } from "../../../middleware/kitchen-access";
import router from "./incoming-dispatches.routes";
import { JWT_SECRET, requirePosUser } from "./_shared";

let server: Server;
let base: string;
let organizationId = "store";
let status = "DELIVERED";
let orgRole = "STAFF";
let capabilities = ["POS_CASHIER"];
let writes = 0;
const restored: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restored.push(() => {
    Reflect.set(target, key, previous);
  });
}
const headers = {
  Authorization: `Bearer ${jwt.sign({ userId: "cashier", organizationId: "store" }, JWT_SECRET)}`,
};
before(async () => {
  const app = express();
  app.use(express.json(), restrictKitchenMember, router);
  app.use(async (req, res) => {
    if (await requirePosUser(req, res)) res.json({ ok: true });
  });
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
afterEach(() => {
  while (restored.length) restored.pop()?.();
});
beforeEach(() => {
  organizationId = "store";
  status = "DELIVERED";
  orgRole = "STAFF";
  capabilities = ["POS_CASHIER"];
  writes = 0;
  stub(prisma.user, "findUnique", async () => ({
    id: "cashier",
    role: "USER",
    isActive: true,
    deletedAt: null,
  }));
  stub(prisma.organizationMember, "findFirst", async () => ({
    organizationId: "store",
    role: orgRole,
    capabilities,
  }));
  stub(prisma.stockDispatch, "findUnique", async () => ({
    id: "dispatch",
    organizationId,
    status,
  }));
  stub(
    prisma.stockDispatch,
    "findMany",
    async (input: { where: { organizationId: string } }) => {
      assert.equal(input.where.organizationId, "store");
      return [
        {
          id: "dispatch",
          dispatchNumber: "D-1",
          status,
          warehouse: { name: "Warehouse" },
          request: {
            items: [
              {
                id: "line",
                quantity: 1250,
                approvedQuantity: 1000,
                product: { name: "Food", unit: "kg" },
              },
            ],
          },
        },
      ];
    },
  );
  stub(prisma.auditLog, "findMany", async () => []);
  stub(
    prisma.auditLog,
    "upsert",
    async (input: { where: { id: string }; update: object }) => {
      assert.equal(input.where.id, "dispatch-received:dispatch");
      assert.deepEqual(input.update, {});
      writes++;
      return { createdAt: new Date("2026-11-08T00:00:00Z") };
    },
  );
  stub(prisma.product, "update", () => {
    throw new Error("Acknowledgement must never change stock");
  });
  stub(prisma.stockDispatch, "update", () => {
    throw new Error("Recipient must never change courier status");
  });
});
const receive = () =>
  fetch(`${base}/pos/incoming-dispatches/dispatch/receive`, {
    method: "POST",
    headers,
  });

test("cashier can list only the selected organization's incoming dispatches", async () => {
  const response = await fetch(
    `${base}/pos/incoming-dispatches?organizationId=store`,
    { headers },
  );
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json())[0].items, [
    { id: "line", name: "Food", quantity: 1, unit: "kg" },
  ]);
  assert.equal(
    (
      await fetch(`${base}/pos/incoming-dispatches?organizationId=other`, {
        headers,
      })
    ).status,
    403,
  );
});
test("acknowledgement reuses the same audit key without transferring stock or advancing courier status", async () => {
  const first = await receive();
  const second = await receive();
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.deepEqual(await first.json(), await second.json());
  assert.equal(writes, 2);
});
test("another organization's dispatch and undelivered goods cannot be acknowledged", async () => {
  organizationId = "other";
  assert.equal((await receive()).status, 403);
  organizationId = "store";
  status = "DISPATCHED";
  assert.equal((await receive()).status, 409);
  assert.equal(writes, 0);
});
test("staff without cashier assignment cannot receive goods", async () => {
  capabilities = [];
  assert.equal((await receive()).status, 403);
});
test("cashier can receive meals but cannot edit menu, daily stock or void receipts", async () => {
  for (const [method, path] of [
    ["POST", "/restaurant/pos/menu-categories"],
    ["PATCH", "/restaurant/pos/menu-categories/category"],
    ["PUT", "/restaurant/pos/discount-schedule"],
    ["PUT", "/restaurant/pos/cafe-daily-stock"],
    ["DELETE", "/restaurant/pos/cafe-daily-stock/receipts/receipt"],
  ])
    assert.equal(
      (await fetch(base + path, { method, headers })).status,
      403,
      path,
    );
  assert.equal(
    (
      await fetch(base + "/restaurant/pos/cafe-daily-stock/receipts", {
        method: "POST",
        headers,
      })
    ).status,
    200,
  );
  orgRole = "OWNER";
  assert.equal(
    (
      await fetch(base + "/restaurant/pos/menu-categories/category", {
        method: "PATCH",
        headers,
      })
    ).status,
    200,
  );
});

test("chef acknowledges own delivered stock without cashier or catalog permissions", async () => {
  capabilities = ["KITCHEN_CHEF"];
  assert.equal((await receive()).status, 200);
  organizationId = "other";
  assert.equal((await receive()).status, 403);
});

test("receiving register choices are scoped and contain no terminal configuration", async () => {
  capabilities = ["KITCHEN_CHEF"];
  stub(
    prisma.posRegister,
    "findMany",
    async (input: { where: { organizationId: string }; select: object }) => {
      assert.equal(input.where.organizationId, "store");
      assert.deepEqual(Object.keys(input.select).sort(), [
        "branch",
        "id",
        "label",
        "name",
      ]);
      return [
        {
          id: "register",
          name: "Kitchen",
          label: null,
          branch: { name: "Main" },
        },
      ];
    },
  );
  const response = await fetch(base + "/pos/receiving-registers", { headers });
  assert.equal(response.status, 200);
  assert.equal((await response.json())[0].id, "register");
});
