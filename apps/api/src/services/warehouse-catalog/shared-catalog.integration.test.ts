import assert from "node:assert/strict";
import test from "node:test";
import { linkWarehouseCatalog, WarehouseCatalogConflict } from "./link";

test("legacy catalog merge commands refuse both preview and apply without touching data", async () => {
  for (const apply of [false, true]) {
    await assert.rejects(
      linkWarehouseCatalog({ warehouseId: "warehouse", organizationId: "vendor", apply }),
      WarehouseCatalogConflict,
    );
  }
});
