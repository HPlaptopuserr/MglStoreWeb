import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeSystemQrMerchantAuth,
  encodeSystemQrMerchantAuth,
  isSystemQrMerchantKey,
} from "./systemqr-merchant-auth";

test("SystemQR merchant auth preserves a username that differs from merchant code", () => {
  const stored = encodeSystemQrMerchantAuth("aru-login", "secret-password");

  assert.equal(isSystemQrMerchantKey(stored), true);
  assert.deepEqual(decodeSystemQrMerchantAuth(stored, "merchant-001"), {
    username: "aru-login",
    password: "secret-password",
  });
});

test("legacy SystemQR merchant keys remain readable", () => {
  assert.deepEqual(
    decodeSystemQrMerchantAuth("systemqr:old-password", "merchant-001"),
    { username: "merchant-001", password: "old-password" },
  );
  assert.deepEqual(decodeSystemQrMerchantAuth("systemqr", "merchant-001"), {
    username: "merchant-001",
  });
});

test("invalid versioned SystemQR auth never exposes a bogus password", () => {
  assert.deepEqual(
    decodeSystemQrMerchantAuth("systemqr:v1:not-base64-json", "merchant-001"),
    { username: "merchant-001" },
  );
});
