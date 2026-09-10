import assert from "node:assert/strict";
import test from "node:test";
import { cancelSystemQrInvoice } from "./systemqr";

test("cancelSystemQrInvoice cancels the exact provider invoice", async (t) => {
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
    if (url.endsWith("/cancelQr")) {
      assert.match(
        String((init?.headers as Record<string, string>)?.Authorization),
        /^Bearer /,
      );
      return Response.json({ status: "000", message: "success" });
    }
    return Response.json({ status: "404", message: "not found" }, { status: 404 });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalBaseUrl === undefined) delete process.env.SYSTEMQR_BASE_URL;
    else process.env.SYSTEMQR_BASE_URL = originalBaseUrl;
  });

  const result = await cancelSystemQrInvoice(
    { invoiceNumber: "INV-123" },
    "merchant-user",
    "merchant-password",
  );

  assert.equal(result.cancelled, true);
  assert.equal(result.status, "000");
  assert.deepEqual(requests, [
    {
      url: "https://systemqr.example/qrpay/login",
      body: { username: "merchant-user", password: "merchant-password" },
    },
    {
      url: "https://systemqr.example/qrpay/cancelQr",
      body: { invoiceNumber: "INV-123" },
    },
  ]);
});

test("cancelSystemQrInvoice rejects a provider cancellation failure", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = process.env.SYSTEMQR_BASE_URL;

  process.env.SYSTEMQR_BASE_URL = "https://systemqr-failure.example/qrpay";
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/login")) {
      return Response.json({ status: "000", entity: "test-token" });
    }
    return Response.json({ status: "002", message: "cannot cancel" });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalBaseUrl === undefined) delete process.env.SYSTEMQR_BASE_URL;
    else process.env.SYSTEMQR_BASE_URL = originalBaseUrl;
  });

  await assert.rejects(
    cancelSystemQrInvoice(
      { invoiceNumber: "INV-LOCKED" },
      "other-merchant-user",
      "other-merchant-password",
    ),
    /cancelQr failed \(002\): cannot cancel/,
  );
});
