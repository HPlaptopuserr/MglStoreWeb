import assert from "node:assert/strict";
import test from "node:test";
import {
  catalogIdentityConflicts,
  type CatalogProductIdentity,
} from "./policy";
import {
  warehouseCatalogOwner,
  warehouseProductReadScope,
} from "../warehouse-product-scope";

const product = (
  id: string,
  overrides: Partial<CatalogProductIdentity> = {},
): CatalogProductIdentity => ({
  id,
  name: id,
  sku: null,
  barcode: null,
  barcodeAliases: [],
  masterProductId: null,
  deletedAt: null,
  ...overrides,
});
test("linking rejects aliases, SKU, and master identity collisions without merging records", () => {
  assert.equal(
    catalogIdentityConflicts([
      product("a", { barcode: "123" }),
      product("b", { barcodeAliases: ["123"] }),
    ]).length,
    1,
  );
  assert.equal(
    catalogIdentityConflicts([
      product("a", { sku: "A" }),
      product("b", { sku: "A", deletedAt: new Date() }),
    ]).length,
    1,
  );
  assert.equal(
    catalogIdentityConflicts([
      product("a", { masterProductId: "m" }),
      product("b", { masterProductId: "m" }),
    ]).length,
    1,
  );
  assert.deepEqual(
    catalogIdentityConflicts([
      product("a", { barcode: "123", barcodeAliases: ["123"] }),
    ]),
    [],
  );
});
test("shared catalogs ignore recipient ordering; other warehouses keep their existing scope", () => {
  const organizations = [{ organizationId: "recipient" }];
  assert.equal(
    warehouseCatalogOwner({ catalogOrganizationId: "owner", organizations }),
    "owner",
  );
  assert.equal(
    warehouseCatalogOwner({ catalogOrganizationId: null, organizations }),
    "recipient",
  );
  assert.equal(
    warehouseCatalogOwner({ catalogOrganizationId: null, organizations: [] }),
    null,
  );
  assert.deepEqual(warehouseProductReadScope("w", ["recipient"], "owner"), {
    organizationId: "owner",
  });
  assert.deepEqual(
    warehouseProductReadScope("w", ["recipient"], null),
    warehouseProductReadScope("w", ["recipient"]),
  );
});
