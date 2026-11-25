import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import {
  prisma,
  type Prisma,
  type RestaurantTicketStatus,
} from "@mgl/database";
import router from "./restaurant.routes";
import { JWT_SECRET } from "./_shared";

let server: Server;
let url: string;
const restores: Array<() => void> = [];
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${jwt.sign({ userId: "owner", organizationId: "restaurant" }, JWT_SECRET)}`,
};
function stub(target: object, key: string, replacement: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, replacement);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
const table = {
  id: "table",
  branchId: "branch",
  organizationId: "restaurant",
  isActive: true,
};
let stored: typeof table | null;
let occupiedStatus: RestaurantTicketStatus | null;
let lockTaken: boolean;
let updates: Prisma.RestaurantTableUpdateArgs[];
let createdDefaults: number;
let existingCount: number;

before(async () => {
  const app = express();
  app.use(express.json(), router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/restaurant/pos/tables`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
beforeEach(() => {
  stored = { ...table };
  occupiedStatus = null;
  lockTaken = false;
  updates = [];
  createdDefaults = 0;
  existingCount = 1;
  stub(prisma.user, "findUnique", async () => ({
    id: "owner",
    role: "USER",
    isActive: true,
    deletedAt: null,
  }));
  stub(prisma.organizationMember, "findFirst", async () => ({
    organizationId: "restaurant",
    role: "OWNER",
    capabilities: [],
  }));
  stub(prisma.organizationMember, "count", async () => 1);
  stub(prisma.branch, "findFirst", async () => ({
    id: "branch",
    organizationId: "restaurant",
    name: "Restaurant",
  }));
  stub(
    prisma,
    "$transaction",
    async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      callback(prisma),
  );
  stub(prisma, "$queryRaw", async () => {
    lockTaken = true;
    return [];
  });
  stub(
    prisma.restaurantTable,
    "findFirst",
    async (query: Prisma.RestaurantTableFindFirstArgs) => {
      assert.equal(
        lockTaken,
        true,
        "lock table before reading its active state",
      );
      const where = query.where;
      return stored &&
        where?.id === stored.id &&
        where.branchId === stored.branchId &&
        where.organizationId === stored.organizationId &&
        where.isActive === stored.isActive
        ? stored
        : null;
    },
  );
  stub(
    prisma.restaurantTicket,
    "findFirst",
    async (query: Prisma.RestaurantTicketFindFirstArgs) => {
      assert.equal(query.where?.tableId, "table");
      const filter = query.where?.status;
      assert.ok(
        filter && typeof filter === "object" && Array.isArray(filter.in),
      );
      return occupiedStatus && filter.in.includes(occupiedStatus)
        ? { id: "occupied" }
        : null;
    },
  );
  stub(
    prisma.restaurantTable,
    "update",
    async (query: Prisma.RestaurantTableUpdateArgs) => {
      updates.push(query);
      return table;
    },
  );
  stub(
    prisma.restaurantTable,
    "count",
    async (query: Prisma.RestaurantTableCountArgs) => {
      assert.deepEqual(
        query.where,
        { branchId: "branch" },
        "count inactive tables too",
      );
      return existingCount;
    },
  );
  stub(prisma.qPayInvoice, "findFirst", async () => null);
  stub(prisma.restaurantTable, "createMany", async () => {
    createdDefaults += 1;
    return { count: 6 };
  });
});

const remove = (branchId = "branch", id = "table", authenticated = true) =>
  fetch(`${url}/${id}`, {
    method: "DELETE",
    headers: authenticated ? headers : { "Content-Type": "application/json" },
    body: JSON.stringify({ branchId }),
  });

test("removes a free table without deleting order history and invalidates its QR", async () => {
  const response = await remove();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(updates, [
    { where: { id: "table" }, data: { isActive: false, qrToken: null } },
  ]);
});

for (const status of ["OPEN", "KITCHEN", "READY", "SERVED", "PAID"] as const) {
  test(`cannot remove a table with a ${status} ticket, including an empty ticket`, async () => {
    occupiedStatus = status;
    const response = await remove();
    assert.equal(response.status, 409);
    assert.equal(updates.length, 0);
  });
}

for (const status of ["CLOSED", "CANCELLED"] as const) {
  test(`completed ${status} history does not prevent removal`, async () => {
    occupiedStatus = status;
    assert.equal((await remove()).status, 200);
  });
}

test("another branch's table cannot be removed", async () => {
  stored = { ...table, branchId: "another-branch" };
  assert.equal((await remove()).status, 404);
  assert.equal(updates.length, 0);
});
test("another organization's table cannot be removed", async () => {
  stored = { ...table, organizationId: "another-org" };
  assert.equal((await remove()).status, 404);
  assert.equal(updates.length, 0);
});
test("inactive or missing tables cannot be removed", async () => {
  stored = { ...table, isActive: false };
  assert.equal((await remove()).status, 404);
  stored = null;
  assert.equal((await remove()).status, 404);
  assert.equal(updates.length, 0);
});
test("requires authentication and branch membership", async () => {
  assert.equal((await remove("branch", "table", false)).status, 401);
  stub(prisma.organizationMember, "count", async () => 0);
  assert.equal((await remove()).status, 403);
  assert.equal(updates.length, 0);
});
test("requires a branch id", async () => {
  assert.equal((await remove("")).status, 400);
  assert.equal(updates.length, 0);
});
test("concurrent order conflicts return a retryable response", async () => {
  stub(prisma, "$transaction", async () => {
    throw Object.assign(new Error("conflict"), { code: "P2034" });
  });
  assert.equal((await remove()).status, 409);
  assert.equal(updates.length, 0);
});
test("bootstrap preserves an intentionally empty floor plan with inactive tables", async () => {
  const response = await fetch(`${url}/bootstrap`, {
    method: "POST",
    headers,
    body: JSON.stringify({ branchId: "branch" }),
  });
  assert.equal(response.status, 201);
  assert.equal(createdDefaults, 0);
});
test("bootstrap still creates default tables for a new branch", async () => {
  existingCount = 0;
  const response = await fetch(`${url}/bootstrap`, {
    method: "POST",
    headers,
    body: JSON.stringify({ branchId: "branch" }),
  });
  assert.equal(response.status, 201);
  assert.equal(createdDefaults, 1);
});

test("pending or paid QR invoices must be resolved before table removal", async () => {
  stub(
    prisma.qPayInvoice,
    "findFirst",
    async (query: Prisma.QPayInvoiceFindFirstArgs) => {
      assert.equal(query.where?.organizationId, "restaurant");
      assert.equal(query.where?.consumedAt, null);
      assert.deepEqual(query.where?.AND, [
        { webhookPayload: { path: ["source"], equals: "RESTAURANT_QR_MENU" } },
        { webhookPayload: { path: ["tableId"], equals: "table" } },
      ]);
      const conditions = query.where?.OR;
      assert.ok(Array.isArray(conditions));
      assert.equal(conditions[0]?.status, "PENDING");
      assert.equal(conditions[1]?.status, "PAID");
      return { id: "unresolved-qr-payment" };
    },
  );
  assert.equal((await remove()).status, 409);
  assert.equal(updates.length, 0);
});
