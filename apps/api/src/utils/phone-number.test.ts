import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhoneNumber } from "./phone-number";

test("normalizes local and international Mongolian phone formats", () => {
  assert.equal(normalizePhoneNumber("90696900"), "90696900");
  assert.equal(normalizePhoneNumber("9069-6900"), "90696900");
  assert.equal(normalizePhoneNumber("+976 90696900"), "90696900");
});

test("returns null for an empty phone number", () => {
  assert.equal(normalizePhoneNumber("  "), null);
  assert.equal(normalizePhoneNumber(null), null);
});
