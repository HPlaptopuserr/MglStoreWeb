import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_FEATURES, FEATURE_OPTIONS, hasFeatureDiff } from "./mgl-business.model";

test("checklist is opt-in and available alongside app features", () => {
  assert.equal(DEFAULT_FEATURES.checklist, false);
  assert.equal(FEATURE_OPTIONS.filter((feature) => feature.key === "checklist").length, 1);
});

test("checklist alone enables saving without mutating another organization", () => {
  const companyA = { ...DEFAULT_FEATURES, checklist: true };
  const companyB = { ...DEFAULT_FEATURES };
  assert.equal(hasFeatureDiff(companyA, DEFAULT_FEATURES), true);
  assert.equal(companyB.checklist, false);
  assert.equal(hasFeatureDiff(companyB, DEFAULT_FEATURES), false);
});
