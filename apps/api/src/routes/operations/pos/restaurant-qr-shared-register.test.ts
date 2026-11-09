import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import express from "express";
import { prisma } from "@mgl/database";
import router from "./restaurant.routes";

test("table QR ordering uses a staffed shift on either compatible register, never a kiosk shift", async (t) => {
  const stub = (target: object, key: string, replacement: unknown) => {
    const object = target as Record<string, unknown>;
    const previous = object[key];
    object[key] = replacement;
    t.after(() => {
      object[key] = previous;
    });
  };
  stub(prisma.restaurantMenuCategory, "count", async () => 1);
  stub(prisma.product, "groupBy", async () => []);
  stub(prisma.restaurantTable, "findUnique", async () => ({
    id: "table",
    code: "A1",
    label: "A1",
    zone: "Гол заал",
    seats: 4,
    isActive: true,
    organizationId: "restaurant",
    branchId: "branch",
    organization: { id: "restaurant", name: "Test restaurant" },
    branch: { id: "branch", name: "Branch", deletedAt: null },
  }));
  stub(prisma.product, "findMany", async () => []);
  stub(prisma.restaurantMenuCategory, "findMany", async () => [
    { code: "CUSTOM_TEST", name: "Drinks", sortOrder: 0 },
  ]);
  let open = true;
  stub(prisma.posShift, "findFirst", async (args: unknown) => {
    assert.ok(args && typeof args === "object" && "where" in args);
    const where = args.where as Record<string, unknown>;
    assert.equal(where.mode, "RESTAURANT");
    assert.equal(where.organizationId, "restaurant");
    assert.equal(where.branchId, "branch");
    assert.deepEqual(where.register, {
      is: { mode: { in: ["RESTAURANT", "SELF_SERVICE"] } },
    });
    return open ? { id: "staffed-shift" } : null;
  });
  const app = express();
  app.use(router);
  const server = createServer(app).listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const url = `http://127.0.0.1:${address.port}/restaurant/menu/table-token`;
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.equal(
      ((await response.json()) as { orderingAvailable: boolean })
        .orderingAvailable,
      true,
    );
    open = false;
    assert.equal(
      (
        (await fetch(url).then((r) => r.json())) as {
          orderingAvailable: boolean;
        }
      ).orderingAvailable,
      false,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
