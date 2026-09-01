import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCurrentShiftScope,
  buildOpenShiftConflictScopes,
} from "./shift-organization-scope";

test("current POS shift is scoped to the organization selected in the token", () => {
  assert.deepEqual(
    buildCurrentShiftScope({ id: "cashier-1", organizationId: "org-current" }),
    { cashierId: "cashier-1", organizationId: "org-current" },
  );
});

test("opening a shift only conflicts with the cashier in the current organization", () => {
  assert.deepEqual(
    buildOpenShiftConflictScopes("cashier-1", "org-current", "register-1"),
    [
      { cashierId: "cashier-1", organizationId: "org-current" },
      { registerId: "register-1" },
    ],
  );
});
