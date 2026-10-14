import assert from "node:assert/strict";
import test from "node:test";
import { warehouseOwnsProduct } from "./warehouse-product-ownership";
import { warehouseCatalogOwner, warehouseProductReadScope, vendorProductReadScope } from "./warehouse-product-scope";
import { stocktakeWarehouseFilter } from "./stocktake-scope";

const central = {
  id: "central", type: "CENTRAL" as const, isActive: true, deletedAt: null,
  catalogOrganizationId: "vendor-a", organizations: [{ organizationId: "vendor-a" }],
};
const vendor = { ...central, id: "internal", type: "VENDOR_INTERNAL" as const };

test("legacy shared links and recipient assignment cannot authorize vendor stock in a central warehouse", () => {
  assert.equal(warehouseOwnsProduct(central, { organizationId: "vendor-a", managedByWarehouseId: null }), false);
  assert.equal(warehouseOwnsProduct(central, { organizationId: "vendor-a", managedByWarehouseId: "central" }), false);
  assert.equal(warehouseOwnsProduct(central, { organizationId: null, managedByWarehouseId: "central" }), true);
  assert.equal(warehouseOwnsProduct(central, { organizationId: null, managedByWarehouseId: "other" }), false);
});

test("vendor internal stock belongs to exactly one vendor and cannot contain managed warehouse products", () => {
  const product = { organizationId: "vendor-a", managedByWarehouseId: null };
  assert.equal(warehouseOwnsProduct(vendor, product), true);
  assert.equal(warehouseOwnsProduct(vendor, { ...product, organizationId: "vendor-b" }), false);
  assert.equal(warehouseOwnsProduct(vendor, { ...product, managedByWarehouseId: "internal" }), false);
  assert.equal(warehouseOwnsProduct({ ...vendor, organizations: [...vendor.organizations, { organizationId: "vendor-b" }] }, product), false);
  assert.equal(warehouseOwnsProduct({ ...vendor, isActive: false }, product), false);
  assert.equal(warehouseOwnsProduct({ ...vendor, deletedAt: new Date() }, product), false);
});

test("recipient order and legacy shared links cannot change catalog ownership or visibility", () => {
  for (const organizations of [[{ organizationId: "a" }, { organizationId: "b" }], [{ organizationId: "b" }, { organizationId: "a" }]]) {
    assert.equal(warehouseCatalogOwner({ catalogOrganizationId: "a", organizations }), null);
    assert.deepEqual(warehouseProductReadScope("central", organizations.map(x => x.organizationId), "a"), { organizationId: null, managedByWarehouseId: "central" });
  }
  assert.deepEqual(stocktakeWarehouseFilter("a"), { isActive: true, deletedAt: null, type: "VENDOR_INTERNAL", organizations: { some: { organizationId: "a" }, every: { organizationId: "a" } } });
});

test("vendor visibility excludes central stock even without a legacy manager ID", () => {
  assert.deepEqual(vendorProductReadScope(), { managedByWarehouseId: null, warehouseInventories: { none: { warehouse: { type: "CENTRAL" } } } });
});
