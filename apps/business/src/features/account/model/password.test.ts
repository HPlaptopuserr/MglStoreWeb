import assert from "node:assert/strict";
import test from "node:test";
import {
  accountContext,
  loginPath,
  normalizeRecoveryPhone,
  passwordError,
} from "./password";
test("normalizes Mongolian local and international phones and rejects other input", () => {
  assert.equal(normalizeRecoveryPhone("+976 (9911) 2233"), "99112233");
  assert.equal(normalizeRecoveryPhone("9911-2233"), "99112233");
  for (const value of [
    "9911223",
    "991122333",
    "abcdefgh",
    "99.112233",
    "+861234567890",
  ])
    assert.equal(normalizeRecoveryPhone(value), null);
});
test("password confirmation and bcrypt byte limit are enforced", () => {
  assert.equal(passwordError("secure-password", "secure-password"), null);
  assert.ok(passwordError("12345", "12345"));
  assert.ok(passwordError("secure-password", "different"));
  assert.ok(passwordError("я".repeat(40), "я".repeat(40)));
  assert.equal(passwordError("я".repeat(36), "я".repeat(36)), null);
});
test("navigation only accepts known account contexts", () => {
  assert.equal(accountContext("https://example.com"), "building");
  assert.equal(loginPath(accountContext("buyer")), "/building/buyer-login");
  assert.equal(loginPath(accountContext("workforce")), "/attendance/login");
});
