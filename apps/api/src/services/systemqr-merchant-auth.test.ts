import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeSystemQrMerchantAuth,
  encodeSystemQrMerchantAuth,
  isSystemQrMerchantKey,
  resolveRegisterSystemQrMerchantCode,
  shouldRetrySystemQrWithMaster,
} from "./systemqr-merchant-auth";

test("existing POS register SystemQR merchant remains the primary merchant", () => {
  assert.equal(
    resolveRegisterSystemQrMerchantCode({
      qpayEnabled: true,
      qpayMerchantId: " REGISTER-MERCHANT ",
      qpayTerminalId: "SYSTEMQR",
    }),
    "REGISTER-MERCHANT",
  );
  assert.equal(
    resolveRegisterSystemQrMerchantCode({
      qpayEnabled: false,
      qpayMerchantId: "REGISTER-MERCHANT",
      qpayTerminalId: "SYSTEMQR",
    }),
    null,
  );
});

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

test("SystemQR auth and explicit 002 create failures retry with the master token", () => {
  assert.equal(
    shouldRetrySystemQrWithMaster(
      new Error("SystemQR Login_Error: Хэрэглэгчийн нэр эсвэл нууц үг буруу байна"),
    ),
    true,
  );
  assert.equal(
    shouldRetrySystemQrWithMaster(
      Object.assign(new Error("Merchant is not authorized"), {
        code: "SYSTEMQR_INVOICE_CREATE_FAILED",
        providerStatus: "002",
      }),
    ),
    true,
  );
  assert.equal(
    shouldRetrySystemQrWithMaster(new Error("fetch failed")),
    false,
  );
});
