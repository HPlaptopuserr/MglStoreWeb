import test from "node:test";
import assert from "node:assert/strict";
import { parseCreditWorkDetails } from "./credit-work-details";

test("older checkout clients preserve work details and explicit blanks clear them", () => {
  assert.deepEqual(parseCreditWorkDetails({}), {});
  assert.deepEqual(parseCreditWorkDetails({ workplace: " ", department: null, jobTitle: "" }),
    { workplace: null, department: null, jobTitle: null });
});
test("checkout employment details are trimmed and malformed data rejected", () => {
  assert.deepEqual(parseCreditWorkDetails({ workplace: " МГЛ ", department: " Борлуулалт ", jobTitle: " Менежер " }),
    { workplace: "МГЛ", department: "Борлуулалт", jobTitle: "Менежер" });
  assert.throws(() => parseCreditWorkDetails({ workplace: 3 }));
  assert.throws(() => parseCreditWorkDetails({ workplace: "x".repeat(201) }));
  assert.throws(() => parseCreditWorkDetails({ department: "x".repeat(121) }));
  assert.throws(() => parseCreditWorkDetails({ jobTitle: "x".repeat(121) }));
});
