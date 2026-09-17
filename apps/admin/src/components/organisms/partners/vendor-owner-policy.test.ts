import assert from "node:assert/strict";
import { test } from "node:test";
import { canBecomeVendorOwner } from "./vendor-owner-policy";
import type { VendorLoginMember } from "./vendor-login-types";

const member: VendorLoginMember = {
  id: "membership",
  userId: "user",
  role: "ADMIN",
  isPrimary: true,
  memberActive: true,
  isActive: true,
};

test("a user's primary organization does not prevent assigning ownership", () => {
  assert.equal(canBecomeVendorOwner(member), true);
  assert.equal(canBecomeVendorOwner({ ...member, isPrimary: false }), true);
});

test("existing owners and inactive accounts cannot be assigned ownership", () => {
  assert.equal(canBecomeVendorOwner({ ...member, role: "OWNER" }), false);
  assert.equal(canBecomeVendorOwner({ ...member, memberActive: false }), false);
  assert.equal(canBecomeVendorOwner({ ...member, isActive: false }), false);
});
