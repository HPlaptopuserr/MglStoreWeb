import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type KitchenTicketStatus, type Prisma } from "@mgl/database";
import router from "./restaurant.routes";
import { JWT_SECRET } from "./_shared";

let server: Server;
let url: string;
const restores: Array<() => void> = [];
const headers = {
  Authorization: `Bearer ${jwt.sign({ userId: "owner", organizationId: "restaurant" }, JWT_SECRET)}`,
};

function stub(target: object, key: string, replacement: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, replacement);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}

function ticket(id: string, status: KitchenTicketStatus, branchId = "branch") {
  return {
    id,
    status,
    branchId,
    organizationId: "restaurant",
    kitchenTicketNo: id,
    sentAt: new Date("2026-10-22T02:23:25Z"),
    startedAt: null,
    readyAt: null,
    servedAt: null,
    restaurantTicket: {
      id: `order-${id}`,
      ticketNo: id,
      orderMode: "DINE_IN",
      status: "CLOSED",
      table: null,
    },
    items: [
      {
        id: `item-${id}`,
        productId: "meal",
        productName: "Meal",
        qty: 1,
        note: null,
        kitchenStation: "HOT_KITCHEN",
        preparationMinutes: 10,
      },
    ],
  };
}

function stubQueue(stored: ReturnType<typeof ticket>[]) {
  stub(
    prisma.kitchenTicket,
    "findMany",
    async (query: Prisma.KitchenTicketFindManyArgs) => {
      assert.equal(query.where?.branchId, "branch");
      assert.equal(query.where?.organizationId, "restaurant");
      assert.deepEqual(query.orderBy, [
        { sentAt: "asc" },
        { kitchenTicketNo: "asc" },
      ]);
      const statusFilter = query.where?.status;
      assert.ok(statusFilter && typeof statusFilter === "object");
      const statuses = statusFilter.in;
      assert.ok(Array.isArray(statuses));
      return stored
        .filter(
          (row) =>
            row.branchId === query.where?.branchId &&
            row.organizationId === query.where?.organizationId &&
            statuses.includes(row.status),
        )
        .slice(0, query.take ?? stored.length);
    },
  );
}

before(async () => {
  const app = express();
  app.use("/api", router);
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/restaurant/pos/kitchen-tickets`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
beforeEach(() => {
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
    name: "Kitchen",
  }));
});

test("100 older READY tickets cannot hide new paid self-service orders", async () => {
  const stored = [
    ...Array.from({ length: 100 }, (_, index) =>
      ticket(`ready-${index}`, "READY"),
    ),
    ticket("new-order", "NEW"),
    ticket("preparing-order", "PREPARING"),
    ticket("served-order", "SERVED"),
    ticket("cancelled-order", "CANCELLED"),
    ticket("other-branch", "NEW", "other-branch"),
    { ...ticket("other-org", "NEW"), organizationId: "other-org" },
  ];
  stubQueue(stored);
  const response = await fetch(`${url}?branchId=branch`, { headers });
  assert.equal(response.status, 200);
  const body: Array<{
    id: string;
    status: string;
    restaurantTicket: { status: string };
  }> = await response.json();
  assert.deepEqual(
    body.map(({ id }) => id),
    ["new-order", "preparing-order"],
  );
  assert.equal(body[0]?.restaurantTicket.status, "CLOSED");
});

test("a kitchen with only completed tickets returns an empty queue", async () => {
  stub(
    prisma.kitchenTicket,
    "findMany",
    async (query: Prisma.KitchenTicketFindManyArgs) => {
      assert.deepEqual(query.where?.status, { in: ["NEW", "PREPARING"] });
      return [];
    },
  );
  const response = await fetch(`${url}?branchId=branch`, { headers });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test("the live queue returns all 150 unfinished orders without a hidden cap", async () => {
  const stored = Array.from({ length: 150 }, (_, index) =>
    ticket(`waiting-${index}`, index % 2 === 0 ? "NEW" : "PREPARING"),
  );
  stubQueue(stored);
  const response = await fetch(`${url}?branchId=branch`, { headers });
  assert.equal(response.status, 200);
  const body: Array<{ id: string }> = await response.json();
  assert.deepEqual(
    body.map(({ id }) => id),
    stored.map(({ id }) => id),
  );
});

test("completed orders disappear on the next refresh without deleting their history", async () => {
  const stored = [ticket("order", "NEW")];
  stubQueue(stored);
  for (const status of [
    "NEW",
    "PREPARING",
    "READY",
    "SERVED",
    "CANCELLED",
  ] as const) {
    stored[0]!.status = status;
    const response = await fetch(`${url}?branchId=branch`, { headers });
    assert.equal(response.status, 200);
    const body: Array<{ id: string }> = await response.json();
    assert.deepEqual(
      body.map(({ id }) => id),
      status === "NEW" || status === "PREPARING" ? ["order"] : [],
    );
    assert.equal(stored.length, 1);
    assert.equal(stored[0]?.restaurantTicket.status, "CLOSED");
  }
});
