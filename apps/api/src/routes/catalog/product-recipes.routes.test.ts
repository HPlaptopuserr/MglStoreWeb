import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import type { ProductRecipe } from "@mgl/types";
import router from "./product-recipes.routes";

let server: Server;
let base: string;
let role = "OWNER";
let membership = true;
let capabilities: string[] = [];
let saved: { data: ProductRecipe; version: number; updatedAt: Date } | null =
  null;
let costPrice = 999;
let writes = 0;
const recipe: ProductRecipe = {
  kind: "BUBBLE_TEA",
  yieldQuantity: 2,
  servingLabel: "500 мл",
  laborCost: 100,
  overheadCost: 0,
  instructions: "Бэлтгээд холино.",
  ingredients: [
    {
      name: "Milk",
      quantity: 400,
      unit: "ml",
      packageQuantity: 1,
      packageUnit: "l",
      packagePrice: 5000,
    },
  ],
};
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const original: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, original);
  });
}
const headers = {
  Authorization: `Bearer ${jwt.sign({ userId: "manager", role: "USER" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
  "Content-Type": "application/json",
};
before(async () => {
  const app = express();
  app.use(express.json(), router);
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/products/product/recipe`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
beforeEach(() => {
  role = "OWNER";
  membership = true;
  capabilities = [];
  saved = null;
  costPrice = 999;
  writes = 0;
  stub(prisma.product, "findFirst", async () => ({
    id: "product",
    organizationId: "store",
    managedByWarehouseId: null,
  }));
  stub(
    prisma.organizationMember,
    "findFirst",
    async (input: { where: { organizationId: string } }) => {
      assert.equal(input.where.organizationId, "store");
      return membership
        ? { organizationId: "store", role, capabilities }
        : null;
    },
  );
  stub(
    prisma,
    "$transaction",
    async (run: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      run(prisma),
  );
  stub(prisma, "$queryRaw", async () => []);
  stub(prisma.productRecipe, "findUnique", async () => saved);
  stub(
    prisma.productRecipe,
    "upsert",
    async (input: {
      create: { data: ProductRecipe };
      update: { data: ProductRecipe };
    }) => {
      writes++;
      saved = {
        data: saved ? input.update.data : input.create.data,
        version: (saved?.version ?? 0) + 1,
        updatedAt: new Date("2026-11-08T04:00:00Z"),
      };
      return saved;
    },
  );
  stub(
    prisma.product,
    "update",
    async (input: { data: { costPrice: number } }) => {
      assert.deepEqual(Object.keys(input.data), ["costPrice"]);
      costPrice = input.data.costPrice;
    },
  );
  stub(prisma.inventoryLedger, "create", () => {
    throw new Error("Recipe editing must never mutate inventory");
  });
});
const put = (body: object) =>
  fetch(base, { method: "PUT", headers, body: JSON.stringify(body) });

test("recipe is private: anonymous, cashier, chef, viewer and non-members are denied", async () => {
  assert.equal((await fetch(base)).status, 401);
  for (const cap of [
    [],
    ["POS_CASHIER"],
    ["KITCHEN_CHEF"],
    ["STOCK_MANAGER"],
  ]) {
    role = "STAFF";
    capabilities = cap;
    assert.equal((await fetch(base, { headers })).status, 403);
    assert.equal(
      (await put({ recipe, expectedVersion: 0, updateProductCost: false }))
        .status,
      403,
    );
  }
  role = "OWNER";
  membership = false;
  assert.equal((await fetch(base, { headers })).status, 403);
  assert.equal(writes, 0);
});
test("owner can save and reopen a recipe without changing product cost or stock", async () => {
  assert.equal((await fetch(base, { headers })).status, 200);
  const response = await put({
    recipe,
    expectedVersion: 0,
    updateProductCost: false,
  });
  assert.equal(response.status, 200);
  const first = await response.json();
  assert.equal(first.version, 1);
  assert.equal(first.cost.unitCost, 1050);
  const read = await fetch(base, { headers });
  assert.equal(read.headers.get("cache-control"), "no-store");
  assert.deepEqual((await read.json()).recipe, recipe);
  assert.equal(costPrice, 999);
});
test("organization admin can explicitly apply server-calculated unit cost", async () => {
  role = "ADMIN";
  const response = await put({
    recipe,
    expectedVersion: 0,
    updateProductCost: true,
    unitCost: 1,
  });
  assert.equal(response.status, 200);
  assert.equal(costPrice, 1050);
});
test("stale or missing versions never overwrite a saved recipe", async () => {
  assert.equal(
    (await put({ recipe, expectedVersion: 0, updateProductCost: false }))
      .status,
    200,
  );
  assert.equal(
    (
      await put({
        recipe: { ...recipe, laborCost: 300 },
        expectedVersion: 0,
        updateProductCost: true,
      })
    ).status,
    409,
  );
  assert.equal(writes, 1);
  assert.equal(costPrice, 999);
  assert.equal((await put({ recipe, updateProductCost: false })).status, 400);
});
test("a partial-price recipe is saved as incomplete and cannot replace the product cost", async () => {
  const incomplete = {
    ...recipe,
    ingredients: recipe.ingredients.map((row) => ({
      ...row,
      packagePrice: null,
    })),
  };
  const response = await put({
    recipe: incomplete,
    expectedVersion: 0,
    updateProductCost: false,
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).cost.unitCost, null);
  assert.equal(
    (
      await put({
        recipe: incomplete,
        expectedVersion: 1,
        updateProductCost: true,
      })
    ).status,
    400,
  );
  assert.equal(costPrice, 999);
});
test("server rejects malformed recipe units and non-positive yields", async () => {
  for (const value of [
    { ...recipe, yieldQuantity: 0 },
    {
      ...recipe,
      ingredients: [{ ...recipe.ingredients[0], packageUnit: "kg" }],
    },
  ])
    assert.equal(
      (
        await put({
          recipe: value,
          expectedVersion: 0,
          updateProductCost: false,
        })
      ).status,
      400,
    );
  assert.equal(writes, 0);
});

test("recipe choices come from the selected organization's supply month and material links are validated", async () => {
  stub(
    prisma.restaurantSupplyMonth,
    "findUnique",
    async (input: {
      where: {
        organizationId_month: { organizationId: string; month: string };
      };
    }) => {
      assert.equal(input.where.organizationId_month.organizationId, "store");
      assert.equal(input.where.organizationId_month.month, "2026-11");
      return {
        data: {
          materials: [
            {
              id: "milk",
              name: "Milk",
              unit: "l",
              openingQuantity: 0,
              receipts: [
                {
                  id: "r",
                  date: "2026-11-01",
                  quantity: 10,
                  unitPrice: 5000,
                  supplier: "",
                },
              ],
              usages: [],
            },
          ],
        },
      };
    },
  );
  const read = await fetch(`${base}?supplyMonth=2026-11`, { headers });
  assert.equal(read.status, 200);
  assert.deepEqual((await read.json()).supply, {
    month: "2026-11",
    materials: [{ id: "milk", name: "Milk", unit: "l", unitPrice: 5000 }],
  });
  const linked = structuredClone(recipe);
  linked.ingredients[0].materialId = "milk";
  const payload = {
    recipe: linked,
    supplyMonth: "2026-11",
    expectedVersion: 0,
    updateProductCost: false,
  };
  assert.equal((await put(payload)).status, 200);
  assert.equal(saved?.data.ingredients[0].materialId, "milk");
  const foreign = structuredClone(linked);
  foreign.ingredients[0].materialId = "another-org-material";
  assert.equal(
    (await put({ ...payload, recipe: foreign, expectedVersion: 1 })).status,
    409,
  );
  const wrongUnit = structuredClone(linked);
  wrongUnit.ingredients[0].unit = "g";
  wrongUnit.ingredients[0].packageUnit = "kg";
  assert.equal(
    (await put({ ...payload, recipe: wrongUnit, expectedVersion: 1 })).status,
    409,
  );
  assert.equal(
    (await put({ ...payload, supplyMonth: undefined, expectedVersion: 1 }))
      .status,
    400,
  );
  assert.equal(writes, 1);
});

test("opening-stock unit price supplies the recipe cost: 200 g at 18000 per kg costs 3600", async () => {
  stub(prisma.restaurantSupplyMonth, "findUnique", async () => ({
    data: {
      materials: [
        {
          id: "meat",
          name: "Хонь",
          unit: "kg",
          openingQuantity: 60,
          openingUnitPrice: 18000,
          receipts: [],
          usages: [],
        },
      ],
    },
  }));
  const choices = await (
    await fetch(`${base}?supplyMonth=2026-11`, { headers })
  ).json();
  assert.equal(choices.supply.materials[0].unitPrice, 18000);
  const food = {
    ...recipe,
    kind: "FOOD",
    yieldQuantity: 1,
    laborCost: 0,
    ingredients: [
      {
        materialId: "meat",
        name: "Хонь",
        quantity: 200,
        unit: "g",
        packageQuantity: 1,
        packageUnit: "kg",
        packagePrice: choices.supply.materials[0].unitPrice,
      },
    ],
  };
  const response = await put({
    recipe: food,
    supplyMonth: "2026-11",
    expectedVersion: 0,
    updateProductCost: false,
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).cost.unitCost, 3600);
  assert.equal(costPrice, 999);
});
