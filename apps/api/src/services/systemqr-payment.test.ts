import assert from "node:assert/strict";
import test from "node:test";
import { checkSystemQrPayment, cancelSystemQrInvoice } from "./systemqr";

test("SystemQR distinguishes paid, pending, provider errors and cancellation failure", async () => {
  const original = globalThis.fetch;
  let response: object = { status: "000", entity: { status: "000" } };
  globalThis.fetch = async input => Response.json(String(input).endsWith("/login")
    ? { status: "000", entity: "test-token" } : response);
  const invoice = { merchantCode: "test", invoiceNumber: "test-invoice" };
  try {
    assert.deepEqual(await checkSystemQrPayment(invoice, "test-user", "test-password"), { paid: true });
    response = { status: "000", entity: { status: null } };
    assert.deepEqual(await checkSystemQrPayment(invoice, "test-user", "test-password"), { paid: false });
    response = { status: "500", message: "provider unavailable" };
    await assert.rejects(checkSystemQrPayment(invoice, "test-user", "test-password"));
    await assert.rejects(cancelSystemQrInvoice(invoice, "test-user", "test-password"));
  } finally { globalThis.fetch = original; }
});
