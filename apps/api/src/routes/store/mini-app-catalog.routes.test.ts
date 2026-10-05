import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import {
  emptyStoreMiniAppSettings,
  STORE_MINI_APP_SETTINGS_KEY,
} from "@mgl/types";
import catalog from "./mini-app-catalog.routes";
import admin from "./mini-app-admin.routes";

let server: Server, base: string;
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
const settings = emptyStoreMiniAppSettings();
settings["shared-store"] = {
  enabled: true,
  sourceIds: ["warehouse-one", "warehouse-two"],
  allowedPhones: [],
};
settings["store-owners"] = {
  enabled: true,
  sourceIds: ["vendor"],
  allowedPhones: ["99112233"],
};
const configuration = {
  settings,
  grants: [{ phone: "99112233", userId: "allowed" }],
};
const token = (userId: string, role = "USER") =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET || "dev-secret-change-me");
before(async () => {
  const app = express();
  app.use(express.json(), catalog, admin);
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
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
  stub(
    prisma.siteSetting,
    "findUnique",
    async ({ where }: { where: { key: string } }) => ({
      value:
        where.key === STORE_MINI_APP_SETTINGS_KEY
          ? JSON.stringify(configuration)
          : "true",
    }),
  );
  stub(prisma.siteSetting, "findMany", async () => [
    { key: "web-products-enabled-vendor", value: "true" },
  ]);
  stub(prisma.organization, "findMany", async () => [
    { id: "vendor", name: "Vendor" },
  ]);
  stub(prisma.warehouse, "findMany", async () => [
    { id: "warehouse-one", name: "Warehouse" },
  ]);
  stub(prisma.warehouseStockRequestItem, "findMany", async () => []);
  stub(prisma.product, "count", async () => 0);
  stub(prisma.product, "findMany", async () => []);
  stub(
    prisma.user,
    "findFirst",
    async ({ where }: { where: { id: string } }) => ({ id: where.id }),
  );
});
test("warehouse catalog scopes each inventory to its managing warehouse without name matching", async () => {
  stub(
    prisma.product,
    "findMany",
    async ({
      where,
    }: {
      where: {
        AND: Array<{
          OR: Array<{
            managedByWarehouseId: string;
            warehouseInventories: {
              some: { warehouseId: string; showOnWeb: boolean };
            };
          }>;
        }>;
      };
    }) => {
      assert.deepEqual(
        where.AND[0].OR.map((row) => row.managedByWarehouseId),
        ["warehouse-one", "warehouse-two"],
      );
      for (const row of where.AND[0].OR) {
        assert.equal(
          row.warehouseInventories.some.warehouseId,
          row.managedByWarehouseId,
        );
        assert.equal(row.warehouseInventories.some.showOnWeb, true);
      }
      return [];
    },
  );
  const response = await fetch(`${base}/store/mini-apps/shared-store/products`);
  assert.equal(response.status, 200);
  const result = (await response.json()) as {
    configured: boolean;
    canOrder: boolean;
  };
  assert.equal(result.configured, true);
  assert.equal(result.canOrder, false);
});
test("vendor catalog only selects configured published vendors and never exposes the allowlist", async () => {
  stub(
    prisma.product,
    "findMany",
    async ({
      where,
    }: {
      where: {
        organizationId: { in: string[] };
        AND: Array<{ managedByWarehouseId: null }>;
      };
    }) => {
      assert.deepEqual(where.organizationId.in, ["vendor"]);
      assert.equal(where.AND[0].managedByWarehouseId, null);
      return [];
    },
  );
  const response = await fetch(`${base}/store/mini-apps/store-owners/products`);
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.equal(text.includes("99112233"), false);
  assert.equal(JSON.parse(text).canOrder, false);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
test("allowed user receives order access; another account and inactive user do not", async () => {
  for (const [userId, allowed] of [
    ["allowed", true],
    ["other", false],
  ] as const) {
    const response = await fetch(
      `${base}/store/mini-apps/store-owners/products`,
      { headers: { Authorization: `Bearer ${token(userId)}` } },
    );
    assert.equal(
      ((await response.json()) as { canOrder: boolean }).canOrder,
      allowed,
    );
  }
  stub(prisma.user, "findFirst", async () => null);
  const response = await fetch(
    `${base}/store/mini-apps/store-owners/products`,
    { headers: { Authorization: `Bearer ${token("allowed")}` } },
  );
  assert.equal(
    ((await response.json()) as { canOrder: boolean }).canOrder,
    false,
  );
});
test("unconfigured and unknown apps never fall back to the entire catalog", async () => {
  stub(prisma.siteSetting, "findUnique", async () => null);
  stub(prisma.product, "findMany", async () => {
    throw new Error("must not query catalog");
  });
  const response = await fetch(`${base}/store/mini-apps/shared-store/products`);
  assert.deepEqual(
    ((await response.json()) as { products: unknown[] }).products,
    [],
  );
  assert.equal(
    (await fetch(`${base}/store/mini-apps/hypermarket/products`)).status,
    404,
  );
});
test("admin catalog settings reject guests and consumer tokens", async () => {
  assert.equal(
    (await fetch(`${base}/admin/app-control/store-catalogs`)).status,
    401,
  );
  assert.equal(
    (
      await fetch(`${base}/admin/app-control/store-catalogs`, {
        headers: { Authorization: `Bearer ${token("allowed")}` },
      })
    ).status,
    403,
  );
});
test("admin save validates sources before writing", async () => {
  stub(prisma.warehouse, "count", async () => 1); // two requested
  stub(prisma.organization, "count", async () => 1);
  stub(prisma.profile, "findMany", async () => [
    { userId: "allowed", phoneNumber: "99112233" },
  ]);
  stub(prisma.siteSetting, "upsert", async () => {
    throw new Error("must not save invalid sources");
  });
  const response = await fetch(`${base}/admin/app-control/store-catalogs`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token("admin", "ADMIN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });
  assert.equal(response.status, 400);
});
test("admin save persists account-bound grants and both warehouse selections", async () => {
  stub(prisma.warehouse, "count", async () => 2);
  stub(prisma.organization, "count", async () => 1);
  stub(prisma.profile, "findMany", async () => [
    { userId: "allowed", phoneNumber: "+97699112233" },
  ]);
  let saved = false;
  stub(
    prisma.siteSetting,
    "upsert",
    async ({ update }: { update: { value: string } }) => {
      const parsed = JSON.parse(update.value) as typeof configuration;
      assert.deepEqual(parsed.grants, configuration.grants);
      assert.deepEqual(
        parsed.settings["shared-store"].sourceIds,
        settings["shared-store"].sourceIds,
      );
      saved = true;
      return {};
    },
  );
  const response = await fetch(`${base}/admin/app-control/store-catalogs`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token("admin", "ADMIN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });
  assert.equal(response.status, 200);
  assert.equal(saved, true);
});

test("unassigned warehouse goods remain visible but cannot be ordered before seller setup", async () => {
  stub(prisma.product, "count", async () => 1);
  stub(
    prisma.product,
    "findMany",
    async ({
      where,
    }: {
      where: { OR: Array<{ organizationId: unknown }> };
    }) => {
      assert.equal(where.OR[0].organizationId, null);
      return [
        {
          id: "unassigned",
          name: "Rice",
          price: 2000,
          unit: "pcs",
          organization: null,
          managedByWarehouseId: "warehouse-one",
          stock: 9,
          warehouseInventories: [{ warehouseId: "warehouse-one", quantity: 9 }],
          images: [],
          discounts: [],
        },
      ];
    },
  );
  const response = await fetch(`${base}/store/mini-apps/shared-store/products`);
  const body = (await response.json()) as {
    products: Array<{ id: string; stock: number; orderable: boolean }>;
  };
  assert.equal(response.status, 200);
  assert.equal(body.products[0].id, "unassigned");
  assert.equal(body.products[0].stock, 9);
  assert.equal(body.products[0].orderable, false);
});

 test("mini app catalogs include products without images while preserving publication and price rules", async () => {
  stub(prisma.product, "findMany", async ({where}: {where: Record<string, unknown>}) => {
    assert.equal(where.images, undefined);
    assert.equal(where.isActive, true);
    assert.equal(where.deletedAt, null);
    assert.deepEqual(where.price, {gte: 100});
    return [{id: "no-photo", name: "Milk", unit: "pcs", price: 4500, stock: 2, managedByWarehouseId: null, warehouseInventories: [], images: [], organization: {id: "vendor", name: "Vendor"}}];
  });
  for (const id of ["store-owners", "shared-store"]) {
    const response = await fetch(`${base}/store/mini-apps/${id}/products`);
    const body = await response.json() as {products: Array<{images: unknown[]}>};
    assert.equal(response.status, 200);
    assert.deepEqual(body.products[0].images, []);
  }
});
