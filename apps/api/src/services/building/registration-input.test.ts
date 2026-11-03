import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBuildingRegistration } from "./registration-input";
const input = {
  mode: "new",
  email: " Test@Example.mn ",
  password: "a-long-password",
  fullName: "Test",
  organizationName: "New Company",
  taxId: "1234567",
  phone: "9911 2233",
  role: "ADMIN",
  organizationId: "victim",
};
test("building signup normalizes contact details and discards privilege/organization overrides", () => {
  const result = parseBuildingRegistration(input);
  assert.equal(result.email, "test@example.mn");
  assert.equal(result.phone, "99112233");
  assert.equal("role" in result, false);
  assert.equal("organizationId" in result, false);
});
test("new accounts enforce password byte limits while existing account passwords are not changed", () => {
  assert.throws(() =>
    parseBuildingRegistration({ ...input, password: "short" }),
  );
  assert.throws(() =>
    parseBuildingRegistration({ ...input, password: "ү".repeat(40) }),
  );
  assert.equal(
    parseBuildingRegistration({
      ...input,
      mode: "existing",
      password: "oldpass",
      fullName: undefined,
    }).password,
    "oldpass",
  );
});
test("registration rejects invalid contacts, tax identifiers and unknown mode", () => {
  for (const patch of [
    { email: "not-email" },
    { phone: "letters" },
    { taxId: "x" },
    { mode: "admin" },
  ])
    assert.throws(() => parseBuildingRegistration({ ...input, ...patch }));
});
