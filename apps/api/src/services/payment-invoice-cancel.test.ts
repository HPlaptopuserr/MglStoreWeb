import assert from "node:assert/strict";
import test from "node:test";
import { cancelQPayInvoice, clearTokenCache } from "./qpay";
import { cancelSystemQrInvoice } from "./systemqr";

test("cancelQPayInvoice deletes the exact provider invoice", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = process.env.QPAY_BASE_URL;
  const originalClientId = process.env.QPAY_CLIENT_ID;
  const originalClientSecret = process.env.QPAY_CLIENT_SECRET;
  const requests: Array<{ url: string; method: string }> = [];

  process.env.QPAY_BASE_URL = "https://qpay.example/v2";
  process.env.QPAY_CLIENT_ID = "test-client";
  process.env.QPAY_CLIENT_SECRET = "test-secret";
  clearTokenCache();
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, method: String(init?.method || "GET") });
    if (url.endsWith("/auth/token")) {
      return Response.json({
        access_token: "test-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "refresh-token",
      });
    }
    return Response.json({ ok: true });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    clearTokenCache();
    if (originalBaseUrl === undefined) delete process.env.QPAY_BASE_URL;
    else process.env.QPAY_BASE_URL = originalBaseUrl;
    if (originalClientId === undefined) delete process.env.QPAY_CLIENT_ID;
    else process.env.QPAY_CLIENT_ID = originalClientId;
    if (originalClientSecret === undefined) delete process.env.QPAY_CLIENT_SECRET;
    else process.env.QPAY_CLIENT_SECRET = originalClientSecret;
  });

  await cancelQPayInvoice("INV/123");

  assert.deepEqual(requests, [
    { url: "https://qpay.example/v2/auth/token", method: "POST" },
    { url: "https://qpay.example/v2/invoice/INV%2F123", method: "DELETE" },
  ]);
});

test("cancelSystemQrInvoice cancels the exact Minu invoice", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = process.env.SYSTEMQR_BASE_URL;
  const requests: Array<{ url: string; body: unknown }> = [];

  process.env.SYSTEMQR_BASE_URL = "https://systemqr.example/qrpay";
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({
      url,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    if (url.endsWith("/login")) {
      return Response.json({ status: "000", entity: "test-token" });
    }
    return Response.json({ status: "000", message: "success" });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalBaseUrl === undefined) delete process.env.SYSTEMQR_BASE_URL;
    else process.env.SYSTEMQR_BASE_URL = originalBaseUrl;
  });

  await cancelSystemQrInvoice(
    { invoiceNumber: "MINU-123" },
    "merchant-user",
    "merchant-password",
  );

  assert.deepEqual(requests, [
    {
      url: "https://systemqr.example/qrpay/login",
      body: { username: "merchant-user", password: "merchant-password" },
    },
    {
      url: "https://systemqr.example/qrpay/cancelQr",
      body: { invoiceNumber: "MINU-123" },
    },
  ]);
});
