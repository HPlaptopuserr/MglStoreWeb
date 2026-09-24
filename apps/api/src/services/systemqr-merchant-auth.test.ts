import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeSystemQrMerchantAuth,
  encodeSystemQrMerchantAuth,
  isSystemQrMerchantKey,
} from "./systemqr-merchant-auth";

test("versioned SystemQR credentials preserve a distinct username", () => {
  const value = encodeSystemQrMerchantAuth("minu-user-123", "secret-password");

  assert.equal(isSystemQrMerchantKey(value), true);
  assert.deepEqual(decodeSystemQrMerchantAuth(value, "merchant-code"), {
    username: "minu-user-123",
    password: "secret-password",
  });
});

test("legacy systemqr password remains readable", () => {
  assert.deepEqual(
    decodeSystemQrMerchantAuth("systemqr:legacy-secret", "merchant-code"),
    { username: "merchant-code", password: "legacy-secret" },
  );
});

test("plain SystemQR marker falls back to master credentials", () => {
  assert.deepEqual(decodeSystemQrMerchantAuth("SYSTEMQR", "merchant-code"), {
    username: "merchant-code",
  });
});

test("invalid versioned credentials never become a password", () => {
  assert.deepEqual(
    decodeSystemQrMerchantAuth("systemqr:v1:not-valid-base64", "merchant-code"),
    { username: "merchant-code" },
  );
});
