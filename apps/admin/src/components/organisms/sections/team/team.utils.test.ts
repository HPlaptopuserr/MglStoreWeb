import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDepartments,
  parseCompanyNodes,
  parseDepartmentConnections,
  reorderItems,
  uniqueDepartmentNames,
} from "./team.utils";
import type { TeamMember } from "./team.types";

test("department names are normalized and deduplicated", () => {
  assert.deepEqual(uniqueDepartmentNames([" Tech ", "Tech", null, "HR"]), [
    "Tech",
    "HR",
  ]);
});

test("department counts include stored and member departments", () => {
  const members = [
    { department: "Tech" },
    { department: "Tech" },
    { department: "Sales" },
  ] as TeamMember[];
  assert.deepEqual(buildDepartments(["Tech", "HR"], members), [
    { name: "Tech", count: 2 },
    { name: "HR", count: 0 },
    { name: "Sales", count: 1 },
  ]);
});

test("invalid organization settings fall back safely", () => {
  assert.equal(parseCompanyNodes("invalid", "MGL", "Store")[0].name, "MGL");
  assert.deepEqual(parseDepartmentConnections("[]"), {});
  assert.deepEqual(reorderItems(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
});
