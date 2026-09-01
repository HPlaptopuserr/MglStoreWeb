import assert from "node:assert/strict";
import test from "node:test";
import { canAccessPosOrganization } from "./_shared";

test("POS vendor access is limited to the organization selected in the token", () => {
  const vendor = { role: "VENDOR", organizationId: "org-current" };

  assert.equal(canAccessPosOrganization(vendor, "org-current"), true);
  assert.equal(canAccessPosOrganization(vendor, "org-other"), false);
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
