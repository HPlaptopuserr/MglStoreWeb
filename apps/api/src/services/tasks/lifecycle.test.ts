import assert from "node:assert/strict";
import test from "node:test";
import { taskStatus } from "./lifecycle";
for (const [statuses, expected] of [
  [[], "PENDING"],
  [["CANCELLED"], "CANCELLED"],
  [["DONE", "CANCELLED"], "DONE"],
  [["DONE", "PENDING_REVIEW"], "PENDING_REVIEW"],
  [["DONE", "PENDING"], "IN_PROGRESS"],
  [["PENDING", "CANCELLED"], "PENDING"],
  [["IN_PROGRESS"], "IN_PROGRESS"],
] as const)
  test(`${statuses.join("+") || "empty"} => ${expected}`, () => {
    assert.equal(taskStatus(statuses.map((status) => ({ status }))), expected);
  });
