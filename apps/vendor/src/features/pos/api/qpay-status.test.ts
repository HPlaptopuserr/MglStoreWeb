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
