import assert from "node:assert/strict";
import test from "node:test";
import { Capability } from "@mgl/database";
import { Permission } from "@mgl/types";
import { buildPermissionSet } from "./permission.service";

test("owner receives the complete store management permission set", () => {
  const permissions = buildPermissionSet("OWNER", []);
  assert.equal(permissions.has(Permission.MANAGE_ORG_MEMBERS), true);
  assert.equal(permissions.has(Permission.MANAGE_PRODUCTS), true);
  assert.equal(permissions.has(Permission.OPERATE_POS), true);
});

test("cashier receives POS permission without management permissions", () => {
  const permissions = buildPermissionSet("STAFF", [Capability.POS_CASHIER]);
  assert.deepEqual([...permissions], [Permission.OPERATE_POS]);
  assert.equal(permissions.has(Permission.VIEW_ORDERS), false);
  assert.equal(permissions.has(Permission.REQUEST_STOCK), false);
  assert.equal(permissions.has(Permission.VIEW_ORG_DASHBOARD), false);
});

test("staff permissions are composed only from explicit capabilities", () => {
  const permissions = buildPermissionSet("STAFF", [
    Capability.POS_CASHIER,
    Capability.STOCK_MANAGER,
  ]);
  assert.equal(permissions.has(Permission.OPERATE_POS), true);
  assert.equal(permissions.has(Permission.MANAGE_STOCK), true);
  assert.equal(permissions.has(Permission.MANAGE_PRODUCTS), false);
});
