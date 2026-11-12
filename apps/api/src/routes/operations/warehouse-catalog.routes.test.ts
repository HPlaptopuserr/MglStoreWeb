import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { prisma } from "@mgl/database";
import router from "./warehouse-catalog.routes";
import { createCatalogTicket } from "../../services/warehouse-catalog-ticket";

test("native POST rejects missing credentials and streams attachment headers before the inventory query finishes", async (t) => {
  let releaseInventory: () => void = () => {};
  const inventoryReady = new Promise<void>((resolve) => {
    releaseInventory = resolve;
  });
  const originalFindWarehouse = prisma.warehouse.findUnique;
  const originalFindInventory = prisma.warehouseInventory.findMany;
  Object.assign(prisma.warehouse, {
    findUnique: async () => ({ name: "Төв агуулах" }),
  });
  Object.assign(prisma.warehouseInventory, {
    findMany: async () => {
      await inventoryReady;
      return [];
    },
  });
  t.after(() => {
    Object.assign(prisma.warehouse, { findUnique: originalFindWarehouse });
    Object.assign(prisma.warehouseInventory, {
      findMany: originalFindInventory,
    });
  });
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(router);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}/warehouses/central/inventory/catalog.pdf`;
  try {
    assert.equal(
      (await fetch(url, { method: "POST", body: new URLSearchParams() }))
        .status,
      401,
    );
    const ticket = createCatalogTicket({
      warehouseId: "central",
      userId: "test-user",
      role: "ADMIN",
      search: "",
      status: "all",
      inStockOnly: true,
    });
    const response = await fetch(url, {
      method: "POST",
      body: new URLSearchParams({ ticket }),
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.match(
      response.headers.get("content-disposition") || "",
      /^attachment;/,
    );
    assert.match(response.headers.get("cache-control") || "", /no-store/);
    releaseInventory();
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
    assert.ok(bytes.length > 1000);
  } finally {
    releaseInventory();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
