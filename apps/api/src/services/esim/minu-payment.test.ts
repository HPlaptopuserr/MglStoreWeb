import test from "node:test";
import assert from "node:assert/strict";
import {
  esimMinuConfig,
  createEsimMinuInvoice,
  checkEsimMinuPayment,
} from "./minu-payment";
import type { Purchase } from "./purchase-store";

test("eSIM Minu never falls back to QPay or treats a bank number as a configured merchant", () => {
  assert.throws(() =>
    esimMinuConfig({ QPAY_CLIENT_ID: "qpay", QPAY_CLIENT_SECRET: "secret" }),
  );
  assert.throws(() =>
    esimMinuConfig({
      SYSTEMQR_USERNAME: "master",
      SYSTEMQR_PASSWORD: "secret",
    }),
  );
  assert.throws(() =>
    esimMinuConfig({
      ESIM_MINU_MERCHANT_CODE: "master",
      SYSTEMQR_USERNAME: "master",
      SYSTEMQR_PASSWORD: "secret",
    }),
  );
});
test("Minu creation pins the amount/merchant; verification uses stored invoice and ignores current merchant selection", async () => {
  const saved = { ...process.env };
  const original = globalThis.fetch;
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  let settled = false;
  Object.assign(process.env, {
    SYSTEMQR_USERNAME: "esim-test-master",
    SYSTEMQR_PASSWORD: "test-secret",
    ESIM_MINU_MERCHANT_CODE: "current-merchant",
    API_PUBLIC_URL: "https://api.example.com",
  });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    requests.push({ url, body });
    return Response.json(
      url.endsWith("/login")
        ? { status: "000", entity: "fake-token" }
        : url.endsWith("/createInvoice")
          ? {
              status: "000",
              entity: {
                invoiceNumber: "minu-123",
                mainQr: "qr",
                deeplinkList: [],
              },
            }
          : { status: "000", entity: { status: settled ? "000" : null } },
    );
  };
  const order = {
    id: "order-id",
    totalMnt: 4900,
    merchantCode: "original-merchant",
    invoiceId: "minu-123",
  } as Purchase;
  try {
    const invoice = await createEsimMinuInvoice(order);
    assert.equal(invoice.invoice_id, "minu-123");
    assert.deepEqual(
      requests.find((r) => r.url.endsWith("/createInvoice"))?.body,
      {
        merchantCode: "original-merchant",
        amount: 4900,
        referenceNumber: "order-id",
        webhook: "https://api.example.com/api/esim/minu/callback",
      },
    );
    assert.equal(await checkEsimMinuPayment(order), false);
    settled = true;
    assert.equal(await checkEsimMinuPayment(order), true);
    assert.deepEqual(requests.at(-1)?.body, {
      merchantCode: "original-merchant",
      invoiceNumber: "minu-123",
    });
  } finally {
    globalThis.fetch = original;
    process.env = saved;
  }
});
