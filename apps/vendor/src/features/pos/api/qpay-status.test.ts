import test from "node:test";
import assert from "node:assert/strict";
import { getQPayInvoiceStatus } from "./qpay";

test("automatic local reads and provider reconciliation both expose confirmed payment", async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return Response.json({ invoiceId: "invoice", status: "PAID", amount: 100 });
  };
  try {
    assert.equal((await getQPayInvoiceStatus("invoice", undefined, false)).status, "PAID");
    assert.equal((await getQPayInvoiceStatus("invoice")).status, "PAID");
    assert.ok(urls[0].endsWith("/invoice?refresh=0"));
    assert.ok(urls[1].endsWith("/invoice?refresh=1"));
  } finally { globalThis.fetch = original; }
});

test("checkout recovery reads the original scoped invoices without creating or checking a bank payment", async () => {
  const { getQPayCheckoutRecovery } = await import("./qpay");
  const original = globalThis.fetch;
  const requests: Array<{ url: string; method: string }> = [];
  globalThis.fetch = async (url, init) => { requests.push({ url: String(url), method: String(init?.method) }); return Response.json({ invoices: [] }); };
  try {
    assert.deepEqual(await getQPayCheckoutRecovery("register one", "sale/original"), { invoices: [] });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].method, "GET");
    assert.ok(requests[0].url.endsWith("/pos/payments/qpay/recovery?registerId=register+one&clientSaleId=sale%2Foriginal"));
  } finally { globalThis.fetch = original; }
});
