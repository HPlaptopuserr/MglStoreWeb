import assert from "node:assert/strict";
import test from "node:test";
import {
  assertRetailRegister,
  assertRetailCheckoutContext,
} from "./retail-register-policy";

const register = {
  id: "retail",
  name: "Дэлгүүр",
  mode: "RETAIL" as const,
  organizationId: "store",
  branchId: "branch",
  isActive: true,
};
const shift = {
  id: "shift",
  mode: "RETAIL" as const,
  status: "OPEN" as const,
  organizationId: "store",
  branchId: "branch",
  registerId: "retail",
};

test("store POS never accepts restaurant or self-service register configurations", () => {
  assert.doesNotThrow(() => assertRetailRegister(register));
  for (const mode of ["RESTAURANT", "SELF_SERVICE"] as const)
    assert.throws(
      () => assertRetailRegister({ ...register, mode }),
      /Дэлгүүрийн касс сонгоно уу/,
    );
});
test("prepayment validation rejects closed, other-mode, and other-register shifts", () => {
  assert.doesNotThrow(() =>
    assertRetailCheckoutContext(register, shift, "store"),
  );
  for (const invalid of [
    { ...shift, mode: "RESTAURANT" as const },
    { ...shift, status: "CLOSED" as const },
    { ...shift, registerId: "other" },
  ]) {
    assert.throws(
      () => assertRetailCheckoutContext(register, invalid, "store"),
      /касс|Касс|ээлж/,
    );
  }
});
test("checkout revalidation enforces store, branch, and activation boundaries", () => {
  for (const invalid of [
    { ...register, organizationId: "other" },
    { ...register, branchId: "other" },
    { ...register, isActive: false },
  ]) {
    assert.throws(
      () => assertRetailCheckoutContext(invalid, shift, "store"),
      /касс|Касс|ээлж/,
    );
  }
  assert.throws(
    () =>
      assertRetailCheckoutContext(
        register,
        { ...shift, organizationId: "other" },
        "store",
      ),
    /касс|Касс|ээлж/,
  );
});
