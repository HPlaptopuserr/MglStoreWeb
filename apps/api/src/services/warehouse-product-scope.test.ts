import test from "node:test";
import assert from "node:assert/strict";
import { warehouseCatalogOwner, warehouseProductReadScope, warehouseProductOwnerScope } from "./warehouse-product-scope";

test("distribution assignments never expose a customer's editable catalog", () => {
  assert.deepEqual(warehouseProductReadScope("central", ["store-a", "store-b"]), {
    organizationId: null, managedByWarehouseId: "central",
  });
  assert.equal(warehouseCatalogOwner({ catalogOrganizationId: null, organizations: [{ organizationId: "store-a" }] }), null);
  assert.deepEqual(warehouseProductOwnerScope("central", null), { organizationId: null, managedByWarehouseId: "central" });
});

test("legacy shared catalogs cannot override independent warehouse ownership", () => {
  assert.equal(warehouseCatalogOwner({ catalogOrganizationId: "hypermarket", organizations: [{ organizationId: "customer" }] }), null);
  assert.deepEqual(warehouseProductReadScope("central", ["customer"], "hypermarket"), { organizationId: null, managedByWarehouseId: "central" });
});
