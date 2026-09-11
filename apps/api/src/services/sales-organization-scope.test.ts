import assert from "node:assert/strict";
import test from "node:test";
import { salesLocationScope, salesVendorScope } from "./sales-organization-scope";

test("sales locations always require active membership in the selected network", () => {
  assert.deepEqual(salesLocationScope("nama"), { organizationId: "nama", isActive: true });
  assert.deepEqual(salesLocationScope("other"), { organizationId: "other", isActive: true });
});
test("missing organization never broadens sales queries", () => {
  for (const id of ["", " "]) {
    assert.throws(() => salesLocationScope(id));
    assert.throws(() => salesVendorScope(id));
  }
});
test("vendor scope does not depend on staff assignment or management role", () => {
  assert.deepEqual(salesVendorScope("nama"), {
    deletedAt: null, status: "ACTIVE",
    representedSalesLocations: { some: { organizationId: "nama", isActive: true } },
  });
});
