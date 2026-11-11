import assert from "node:assert/strict";
import test from "node:test";
import { Capability, prisma } from "@mgl/database";
import { Permission } from "@mgl/types";
import { buildPermissionSet, resolvePermissionsForOrg } from "./permission.service";

test("owner receives the complete store management permission set", () => {
  const permissions = buildPermissionSet("OWNER", []);
  assert.equal(permissions.has(Permission.MANAGE_ORG_MEMBERS), true);
  assert.equal(permissions.has(Permission.CREATE_PRODUCTS), true);
  assert.equal(permissions.has(Permission.MANAGE_PRODUCTS), true);
  assert.equal(permissions.has(Permission.OPERATE_POS), true);
});

test("cashier can register new store products without editing existing products", () => {
  const permissions = buildPermissionSet("STAFF", [Capability.POS_CASHIER]);
  assert.deepEqual([...permissions], [Permission.OPERATE_POS, Permission.CREATE_PRODUCTS]);
  assert.equal(permissions.has(Permission.MANAGE_PRODUCTS), false);
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

test("staff without cashier capability cannot create or delete products", () => {
  const permissions = buildPermissionSet("STAFF", []);
  assert.equal(permissions.has(Permission.CREATE_PRODUCTS), false);
  assert.equal(permissions.has(Permission.MANAGE_PRODUCTS), false);
});


test("cashier product creation is limited to stores with active membership", async () => {
  const original = prisma.organizationMember.findFirst;
  Reflect.set(prisma.organizationMember, "findFirst", async ({ where }: {
    where: { userId: string; organizationId: string; isActive: boolean };
  }) => {
    assert.equal(where.userId, "cashier");
    assert.equal(where.isActive, true);
    return where.organizationId === "own-store"
      ? { organizationId: "own-store", role: "STAFF", capabilities: [Capability.POS_CASHIER] }
      : null;
  });
  try {
    const ownStore = await resolvePermissionsForOrg("cashier", "USER", "own-store");
    assert.equal(ownStore.permissions.has(Permission.CREATE_PRODUCTS), true);
    assert.equal(ownStore.permissions.has(Permission.MANAGE_PRODUCTS), false);
    const otherStore = await resolvePermissionsForOrg("cashier", "USER", "other-store");
    assert.equal(otherStore.permissions.has(Permission.CREATE_PRODUCTS), false);
    assert.equal(otherStore.orgRole, null);
  } finally {
    Reflect.set(prisma.organizationMember, "findFirst", original);
  }
});
