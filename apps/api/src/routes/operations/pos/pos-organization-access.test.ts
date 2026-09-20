import assert from "node:assert/strict";
import test from "node:test";
import { Capability } from "@mgl/database";
import { canAccessPosOrganization, canOperatePos } from "./_shared";

test("POS vendor access is limited to the organization selected in the token", () => {
  const vendor = { role: "VENDOR", organizationId: "org-current" };

  assert.equal(canAccessPosOrganization(vendor, "org-current"), true);
  assert.equal(canAccessPosOrganization(vendor, "org-other"), false);
});

test("only owners and explicitly assigned cashiers can operate POS", () => {
  const base = {
    role: "USER",
    organizationId: "org-current",
    orgRole: "STAFF",
    capabilities: [] as Capability[],
  };

  assert.equal(canOperatePos(base), false);
  assert.equal(
    canOperatePos({ ...base, capabilities: [Capability.POS_CASHIER] }),
    true,
  );
  assert.equal(canOperatePos({ ...base, orgRole: "OWNER" }), true);
  assert.equal(
    canOperatePos({ ...base, organizationId: null, capabilities: [Capability.POS_CASHIER] }),
    false,
  );
});

test("platform admins can inspect POS organizations", () => {
  assert.equal(
    canAccessPosOrganization(
      { role: "ADMIN", organizationId: null },
      "org-other",
    ),
    true,
  );
  assert.equal(
    canAccessPosOrganization(
      { role: "SUPER_ADMIN", organizationId: null },
      "org-other",
    ),
    true,
  );
});
