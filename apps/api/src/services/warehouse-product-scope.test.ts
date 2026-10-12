import test from "node:test";
import assert from "node:assert/strict";
import { warehouseCatalogOwner, warehouseProductReadScope, warehouseProductOwnerScope } from "./warehouse-product-scope";

test("distribution assignments never expose a customer's editable catalog", () => {
  assert.deepEqual(warehouseProductReadScope("central", ["store-a", "store-b"]), {
    OR: [{ managedByWarehouseId: "central" }, { warehouseInventories: { some: { warehouseId: "central" } } }],
  });
  assert.equal(warehouseCatalogOwner({ catalogOrganizationId: null, organizations: [{ organizationId: "store-a" }] }), null);
  assert.deepEqual(warehouseProductOwnerScope("central", null), { managedByWarehouseId: "central" });
});

test("explicit shared catalogs keep their intended organization owner", () => {
  assert.equal(warehouseCatalogOwner({ catalogOrganizationId: "hypermarket", organizations: [{ organizationId: "customer" }] }), "hypermarket");
  assert.deepEqual(warehouseProductReadScope("central", ["customer"], "hypermarket"), { organizationId: "hypermarket" });
});
