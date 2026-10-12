import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseAccessPinForScope,
  isValidAccessPin,
  parseProtectedSectionScope,
} from "./org-access-pin";

test("organization access PIN must contain exactly four digits", () => {
  assert.equal(isValidAccessPin("1234"), true);
  assert.equal(isValidAccessPin("0000"), true);
  assert.equal(isValidAccessPin("123"), false);
  assert.equal(isValidAccessPin("12345"), false);
  assert.equal(isValidAccessPin("12a4"), false);
  assert.equal(isValidAccessPin(1234), false);
});

test("protected section scope parsing rejects unknown sections", () => {
  assert.equal(parseProtectedSectionScope("restaurant_pos"), "RESTAURANT_POS");
  assert.equal(parseProtectedSectionScope("reports"), "REPORTS");
  assert.equal(parseProtectedSectionScope("settings"), null);
});

test("owner and admin PIN access is available for every protected section", () => {
  for (const orgRole of ["OWNER", "ADMIN"]) {
    assert.equal(
      canUseAccessPinForScope("PRODUCTS", { orgRole }),
      true,
    );
    assert.equal(canUseAccessPinForScope("REPORTS", { orgRole }), true);
  }
});

test("staff PIN access is limited to the restaurant cash register", () => {
  const staff = { orgRole: "STAFF" };
  assert.equal(canUseAccessPinForScope("RESTAURANT_POS", staff), true);
  assert.equal(canUseAccessPinForScope("PRODUCTS", staff), false);
  assert.equal(canUseAccessPinForScope("REPORTS", staff), false);
});

test("an explicitly assigned cashier can unlock the restaurant cash register", () => {
  assert.equal(
    canUseAccessPinForScope("RESTAURANT_POS", {
      orgRole: "VIEWER",
      capabilities: ["POS_CASHIER"],
    }),
    true,
  );
});
