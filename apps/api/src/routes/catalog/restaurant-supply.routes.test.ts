import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import type { SupplyMonth } from "@mgl/types";
import router from "./restaurant-supply.routes";

let server: Server;
let base: string;
let role = "OWNER";
let capabilities: string[] = [];
let ownedCount = 1;
const saved = new Map<
  string,
  { data: SupplyMonth; version: number; updatedAt: Date }
>();
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const old: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, old);
  });
}
const headers = {
  Authorization: `Bearer ${jwt.sign({ userId: "manager", role: "USER" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
  "Content-Type": "application/json",
};
const data: SupplyMonth = {
  materials: [
    {
      id: "mutton",
      name: "Хонины мах",
      unit: "kg",
      openingQuantity: 0,
      receipts: [
        {
          id: "r",
          date: "2026-11-01",
          quantity: 150,
          unitPrice: 10000,
          supplier: "",
        },
      ],
      usages: [
        {
          id: "u",
          date: "2026-11-02",
          productId: "food",
          dishName: "Бууз",
          quantity: 130,
        },
      ],
    },
  ],
};
before(async () => {
  const app = express();
  app.use(express.json(), router);
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/restaurant/supply-month`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
beforeEach(() => {
  role = "OWNER";
  capabilities = [];
  ownedCount = 1;
  saved.clear();
  stub(
    prisma.organizationMember,
    "findFirst",
    async (input: { where: { organizationId: string } }) =>
      input.where.organizationId === "store"
        ? { role, capabilities, organizationId: "store" }
        : null,
  );
  stub(
    prisma,
    "$transaction",
    async (run: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      run(prisma),
  );
  stub(prisma, "$queryRaw", async () => []);
  stub(prisma.posSaleRecipeSnapshot, "groupBy", async () => []);
  stub(prisma.posSaleLine, "count", async () => 0);
  stub(prisma.posSaleRecipeSnapshot, "updateMany", async () => ({ count: 0 }));
  stub(
    prisma.restaurantSupplyMonth,
    "findUnique",
    async (input: {
      where: {
        organizationId_month: { organizationId: string; month: string };
      };
    }) => saved.get(input.where.organizationId_month.month) ?? null,
  );
  stub(
    prisma.restaurantSupplyMonth,
    "upsert",
    async (input: {
      create: { month: string; data: SupplyMonth };
      update: { data: SupplyMonth };
    }) => {
      const previous = saved.get(input.create.month);
      const record = {
        data: input.update.data,
        version: (previous?.version ?? 0) + 1,
        updatedAt: new Date("2026-11-08T00:00:00Z"),
      };
      saved.set(input.create.month, record);
      return record;
    },
  );
  stub(
    prisma.product,
    "count",
    async (input: { where: { organizationId: string } }) => {
      assert.equal(input.where.organizationId, "store");
      return ownedCount;
    },
  );
  stub(
    prisma.product,
    "findMany",
    async (input: { where: { organizationId: string } }) => {
      assert.equal(input.where.organizationId, "store");
      return [{ id: "food", name: "Бууз" }];
    },
  );
  stub(prisma.inventoryLedger, "create", () => {
    throw new Error("Monthly manual report must never deduct POS inventory");
  });
  stub(prisma.product, "update", () => {
    throw new Error("Monthly report must never alter products");
  });
});
const url = (month = "2026-11", organizationId = "store") =>
  `${base}?organizationId=${organizationId}&month=${month}`;
const put = (payload: object, month = "2026-11", organizationId = "store") =>
  fetch(url(month, organizationId), {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });

test("owner saves 150 kg minus 130 kg as 20 kg and reopens it with server-calculated costs", async () => {
  const response = await put({
    data,
    expectedVersion: 0,
    totalPurchaseCost: 1,
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.summary[0].remainingQuantity, 20);
  assert.equal(result.totalPurchaseCost, 1500000);
  assert.equal(result.version, 1);
  const read = await fetch(url(), { headers });
  assert.equal(read.headers.get("cache-control"), "no-store");
  assert.deepEqual((await read.json()).data, data);
});
test("anonymous, cashier, chef, stock staff and another organization's members cannot access the monthly costs", async () => {
  assert.equal((await fetch(url())).status, 401);
  for (const caps of [
    [],
    ["POS_CASHIER"],
    ["KITCHEN_CHEF"],
    ["STOCK_MANAGER"],
  ]) {
    role = "STAFF";
    capabilities = caps;
    assert.equal((await fetch(url(), { headers })).status, 403);
    assert.equal((await put({ data, expectedVersion: 0 })).status, 403);
  }
  role = "OWNER";
  assert.equal((await fetch(url("2026-11", "other"), { headers })).status, 403);
  assert.equal(saved.size, 0);
});
test("stale updates cannot replace newer monthly supply entries", async () => {
  assert.equal((await put({ data, expectedVersion: 0 })).status, 200);
  assert.equal(
    (await put({ data: { materials: [] }, expectedVersion: 0 })).status,
    409,
  );
  assert.deepEqual(saved.get("2026-11")?.data, data);
});
test("months remain independent and a new month does not silently carry over records", async () => {
  assert.equal((await put({ data, expectedVersion: 0 })).status, 200);
  const empty = await fetch(url("2026-12"), { headers });
  const result = await empty.json();
  assert.equal(result.version, 0);
  assert.deepEqual(result.data.materials, []);
  assert.equal(
    (await put({ data: { materials: [] }, expectedVersion: 0 }, "2026-12"))
      .status,
    200,
  );
  assert.equal(
    saved.get("2026-11")?.data.materials[0].receipts[0].quantity,
    150,
  );
});
test("foreign product references and dates outside the selected month are rejected", async () => {
  ownedCount = 0;
  assert.equal((await put({ data, expectedVersion: 0 })).status, 409);
  ownedCount = 1;
  assert.equal(
    (await put({ data, expectedVersion: 0 }, "2026-12")).status,
    400,
  );
  assert.equal((await fetch(url("2026-13"), { headers })).status, 400);
  assert.equal(saved.size, 0);
});

test("monthly material balances include mapped POS recipe portions and preserve bindings for older clients", async () => {
  const recipe = {
    kind: "FOOD",
    yieldQuantity: 1,
    servingLabel: "1 порц",
    laborCost: 0,
    overheadCost: 0,
    instructions: "",
    ingredients: [
      {
        name: "Мах",
        quantity: 200,
        unit: "g",
        packageQuantity: 1,
        packageUnit: "kg",
        packagePrice: null,
      },
    ],
  };
  stub(
    prisma.posSaleRecipeSnapshot,
    "groupBy",
    async (input: {
      where: {
        saleLine: {
          sale: { organizationId: string; status: string; voidedAt: null };
        };
      };
    }) => {
      assert.equal(input.where.saleLine.sale.organizationId, "store");
      assert.equal(input.where.saleLine.sale.status, "COMPLETED");
      assert.equal(input.where.saleLine.sale.voidedAt, null);
      return [
        {
          productId: "food",
          productName: "Бууз",
          recipeVersion: 1,
          bindings: null,
          recipe,
          _sum: { servings: 50 },
        },
      ];
    },
  );
  const value = structuredClone(data);
  value.materials[0].usages = [];
  value.posBindings = [
    {
      productId: "food",
      ingredientIndex: 0,
      ingredientName: "Мах",
      materialId: "mutton",
      unit: "kg",
    },
  ];
  const response = await put({ data: value, expectedVersion: 0 });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.summary[0].posUsedQuantity, 10);
  assert.equal(result.summary[0].remainingQuantity, 140);
  const olderClientData = { materials: value.materials };
  const older = await put({ data: olderClientData, expectedVersion: 1 });
  assert.equal(older.status, 200);
  assert.deepEqual((await older.json()).data.posBindings, value.posBindings);
});

test("materials referenced by completed sale snapshots cannot be deleted or change units", async () => {
  stub(prisma.posSaleRecipeSnapshot, "groupBy", async () => [
    {
      productId: "food",
      productName: "Бууз",
      recipeVersion: 1,
      recipe: {
        kind: "FOOD",
        yieldQuantity: 1,
        servingLabel: "1 порц",
        laborCost: 0,
        overheadCost: 0,
        instructions: "",
        ingredients: [
          {
            name: "Мах",
            quantity: 200,
            unit: "g",
            packageQuantity: 1,
            packageUnit: "kg",
            packagePrice: null,
          },
        ],
      },
      bindings: [
        {
          productId: "food",
          ingredientIndex: 0,
          ingredientName: "Мах",
          materialId: "mutton",
          unit: "kg",
        },
      ],
      _sum: { servings: 50 },
    },
  ]);
  assert.equal(
    (
      await put({
        data: { materials: [], posBindings: [] },
        expectedVersion: 0,
      })
    ).status,
    409,
  );
  const wrongUnit = structuredClone(data);
  wrongUnit.materials[0].unit = "l";
  assert.equal(
    (await put({ data: wrongUnit, expectedVersion: 0 })).status,
    409,
  );
  assert.equal(saved.size, 0);
});

test("saved material names and units are immutable while receipts and new materials remain editable", async () => {
  assert.equal((await put({ data, expectedVersion: 0 })).status, 200);
  const renamed = structuredClone(data);
  renamed.materials[0].name = "Үхрийн мах";
  assert.equal((await put({ data: renamed, expectedVersion: 1 })).status, 409);
  const changedUnit = structuredClone(data);
  changedUnit.materials[0].unit = "l";
  assert.equal(
    (await put({ data: changedUnit, expectedVersion: 1 })).status,
    409,
  );
  assert.equal(saved.get("2026-11")?.version, 1);
  const edited = structuredClone(data);
  edited.materials[0].receipts[0].unitPrice = 12000;
  edited.materials.push({
    id: "carrot",
    name: "Лууван",
    unit: "kg",
    openingQuantity: 70,
    receipts: [],
    usages: [],
  });
  assert.equal((await put({ data: edited, expectedVersion: 1 })).status, 200);
  assert.equal(
    saved.get("2026-11")?.data.materials[0].name,
    data.materials[0].name,
  );
  assert.equal(
    saved.get("2026-11")?.data.materials[0].receipts[0].unitPrice,
    12000,
  );
  const renamedNew = structuredClone(edited);
  renamedNew.materials[1].name = "Төмс";
  assert.equal(
    (await put({ data: renamedNew, expectedVersion: 2 })).status,
    409,
  );
});

test("materials selected directly in a recipe cannot be removed from its saved supply month", async () => {
  assert.equal((await put({ data, expectedVersion: 0 })).status, 200);
  stub(prisma.productRecipe, "findMany", async () => [
    {
      data: {
        kind: "FOOD",
        yieldQuantity: 1,
        servingLabel: "1 порц",
        laborCost: 0,
        overheadCost: 0,
        instructions: "",
        ingredients: [
          {
            materialId: "mutton",
            name: "Хонины мах",
            quantity: 200,
            unit: "g",
            packageQuantity: 1,
            packageUnit: "kg",
            packagePrice: null,
          },
        ],
      },
    },
  ]);
  assert.equal(
    (await put({ data: { materials: [] }, expectedVersion: 1 })).status,
    409,
  );
  assert.equal(saved.get("2026-11")?.version, 1);
});

test("material unit prices persist and older clients cannot silently erase them", async () => {
  const priced = structuredClone(data);
  priced.materials[0].openingQuantity = 60;
  priced.materials[0].openingUnitPrice = 18000;
  assert.equal((await put({ data: priced, expectedVersion: 0 })).status, 200);
  const reopened = await (await fetch(url(), { headers })).json();
  assert.equal(reopened.data.materials[0].openingUnitPrice, 18000);
  const oldClient = structuredClone(priced);
  delete oldClient.materials[0].openingUnitPrice;
  assert.equal(
    (await put({ data: oldClient, expectedVersion: 1 })).status,
    200,
  );
  assert.equal(saved.get("2026-11")?.data.materials[0].openingUnitPrice, 18000);
  priced.materials[0].openingUnitPrice = null;
  assert.equal((await put({ data: priced, expectedVersion: 2 })).status, 200);
  assert.equal(saved.get("2026-11")?.data.materials[0].openingUnitPrice, null);
});
