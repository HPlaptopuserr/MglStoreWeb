import assert from "node:assert/strict";
import test from "node:test";
import { hasPlatformWarehouseAccess } from "./warehouse-access.service";

test("full admins can manage warehouse workflows", () => {
  assert.equal(hasPlatformWarehouseAccess("SUPER_ADMIN"), true);
  assert.equal(hasPlatformWarehouseAccess("ADMIN"), true);
});

test("ordinary users require a warehouse operator assignment", () => {
  assert.equal(hasPlatformWarehouseAccess("USER"), false);
  assert.equal(hasPlatformWarehouseAccess(undefined), false);
});
