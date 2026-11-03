import assert from "node:assert/strict";
import test from "node:test";
import { canAssignTaskToRole } from "./task-assignment-policy";
for (const caller of [
  "OWNER",
  "CEO",
  "ADMIN",
  "MANAGER",
  "STAFF",
  "VIEWER",
  "HR",
]) {
  test(`${caller} follows the assignment hierarchy`, () => {
    for (const target of [
      "OWNER",
      "CEO",
      "ADMIN",
      "MANAGER",
      "STAFF",
      "VIEWER",
      "HR",
    ]) {
      const expected =
        caller === "OWNER"
          ? ["ADMIN", "STAFF"].includes(target)
          : caller === "ADMIN" && target === "STAFF";
      assert.equal(
        canAssignTaskToRole(caller, target),
        expected,
        `${caller} -> ${target}`,
      );
    }
  });
}
