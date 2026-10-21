import assert from "node:assert/strict";
import test from "node:test";
import { canSkipSectionPin } from "./section-access";

const owner = { id: "owner-1", organizationId: "org-1", orgRole: "OWNER" };

test("the current organization's owner skips the extra section PIN", () => {
  assert.equal(canSkipSectionPin(owner, "org-1", "owner-1"), true);
});
test("other organization roles retain their existing PIN requirement", () => {
  for (const orgRole of ["ADMIN", "STAFF", "VIEWER", undefined, null]) {
    assert.equal(canSkipSectionPin({ ...owner, orgRole }, "org-1", "owner-1"), false);
  }
});
test("owner access does not carry across organizations or identities", () => {
  assert.equal(canSkipSectionPin(owner, "org-2", "owner-1"), false);
  assert.equal(canSkipSectionPin(owner, "org-1", "another-user"), false);
  assert.equal(canSkipSectionPin({ ...owner, organizationId: null }, "org-1", "owner-1"), false);
  assert.equal(canSkipSectionPin(owner, "", "owner-1"), false);
});
