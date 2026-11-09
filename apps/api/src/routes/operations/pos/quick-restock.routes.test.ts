import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import { restrictKitchenMember } from "../../../middleware/kitchen-access";
import router from "./quick-restock.routes";
import { JWT_SECRET } from "./_shared";

let server: Server;
let base: string;
let capabilities = ["POS_CASHIER"];
let stock = 10;
let unit = "pcs";
let registerOrg = "store";
let receipt: {
  registerId: string;
  receivedById: string;
  receiptNo: string;
  items: Array<{ productId: string; quantity: number }>;
} | null = null;
let changes = 0;
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const original: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, original);
  });
}
const headers = {
  Authorization: `Bearer ${jwt.sign({ userId: "cashier", organizationId: "store" }, JWT_SECRET)}`,
  "Content-Type": "application/json",
};
before(async () => {
  const app = express();
  app.use(express.json(), restrictKitchenMember, router);
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/pos/quick-restock`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
beforeEach(() => {
  capabilities = ["POS_CASHIER"];
  stock = 10;
  unit = "pcs";
  registerOrg = "store";
  receipt = null;
  changes = 0;
  stub(prisma.user, "findUnique", async () => ({
    id: "cashier",
    role: "USER",
    isActive: true,
    deletedAt: null,
  }));
  stub(prisma.organizationMember, "findFirst", async () => ({
    organizationId: "store",
    role: "STAFF",
    capabilities,
  }));
  stub(prisma.posRegister, "findFirst", async () => ({
    organizationId: registerOrg,
    branchId: "branch",
  }));
  stub(
    prisma,
    "$transaction",
    async (run: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      run(prisma),
  );
  stub(prisma, "$queryRaw", async () => []);
  stub(prisma, "$executeRaw", async () => 1);
  stub(
    prisma.product,
    "findFirst",
    async ({ where }: { where: Record<string, unknown> }) => {
      // Existing menu items and preorder items must be receivable without catalog edits.
      assert.equal(where.isRestaurantMenuItem, undefined);
      assert.equal(where.supplyType, undefined);
      assert.equal(where.organizationId, "store");
      return {
        id: "meal",
        stock,
        unit,
        costPrice: 100,
        isRestaurantMenuItem: true,
      };
    },
  );
  stub(prisma.product, "findMany", async () => [
    {
      id: "meal",
      organizationId: "store",
      managedByWarehouseId: null,
      warehouseInventories: [],
    },
  ]);
  stub(prisma.product, "findUniqueOrThrow", async () => ({ stock }));
  stub(
    prisma.product,
    "update",
    async ({ data }: { data: { stock: { increment: number } } }) => {
      assert.deepEqual(Object.keys(data), ["stock"]);
      stock += data.stock.increment;
      changes++;
    },
  );
  stub(prisma.posGoodsReceipt, "findUnique", async () => receipt);
  stub(
    prisma.posGoodsReceipt,
    "create",
    async ({
      data,
    }: {
      data: {
        registerId: string;
        receivedById: string;
        receiptNo: string;
        items: { create: { productId: string; quantity: number } };
      };
    }) => {
      receipt = { ...data, items: [data.items.create] };
    },
  );
  stub(prisma.warehouseInventory, "findMany", async () => []);
  stub(prisma.inventoryLedger, "create", async () => ({}));
});
const send = (body: Record<string, unknown>) =>
  fetch(base, { method: "POST", headers, body: JSON.stringify(body) });
const input = () => ({
  requestId: randomUUID(),
  registerId: "register",
  productId: "meal",
  quantity: 3,
});

test("cashier receives existing meals, preserves catalog fields and retries without double stock", async () => {
  const body = { ...input(), price: 1, name: "must be ignored" };
  const first = await send(body);
  assert.equal(first.status, 200);
  const second = await send(body);
  assert.equal(second.status, 200);
  assert.equal(stock, 13);
  assert.equal(changes, 1);
  assert.equal((await send({ ...body, quantity: 4 })).status, 409);
  assert.equal(stock, 13);
});
test("piece quantities are whole; weighed food preserves gram precision", async () => {
  assert.equal((await send({ ...input(), quantity: 0.125 })).status, 400);
  unit = "kg";
  assert.equal((await send({ ...input(), quantity: 0.125 })).status, 200);
  assert.equal(stock, 135);
});
test("cashier cannot receive stock into a different organization", async () => {
  registerOrg = "other";
  assert.equal((await send(input())).status, 403);
  assert.equal(changes, 0);
});

test("chef receives meals idempotently and cannot restock another organization", async () => {
  capabilities = ["KITCHEN_CHEF"];
  const body = input();
  assert.equal((await send(body)).status, 200);
  assert.equal((await send(body)).status, 200);
  assert.equal(stock, 13);
  assert.equal(changes, 1);
  registerOrg = "other";
  assert.equal((await send(input())).status, 403);
});
