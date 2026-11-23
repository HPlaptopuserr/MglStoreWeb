import assert from "node:assert/strict";
import test from "node:test";
import { checkSystemQrPayment, checkSystemQrPaymentEvidence, cancelSystemQrInvoice } from "./systemqr";

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

test("SystemQR rejects a successful response that contradicts invoice identity or amount", async () => {
  const original = globalThis.fetch;
  let entity: Record<string, unknown> = {};
  globalThis.fetch = async input => Response.json(String(input).endsWith("/login")
    ? { status: "000", entity: "verification-token" } : { status: "000", entity: { status: "000", ...entity } });
  const invoice = { merchantCode: "test", invoiceNumber: "expected", expectedAmount: 100 };
  try {
    for (const mismatch of [{ invoiceNumber: "wrong" }, { merchantCode: "wrong" }, { amount: 99 }, { amount: "bad" }]) {
      entity = mismatch;
      await assert.rejects(checkSystemQrPayment(invoice, "proof-user", "proof-password"), /зөрүүтэй/);
    }
    entity = { invoiceNumber: "expected", merchantCode: "test", amount: "100.00" };
    assert.deepEqual(await checkSystemQrPayment(invoice, "proof-user", "proof-password"), { paid: true });
  } finally { globalThis.fetch = original; }
});

test("unpaid evidence requires the exact invoice, amount and an explicit pending provider state", async () => {
  const original = globalThis.fetch;
  let entity: Record<string, unknown> | null = null;
  globalThis.fetch = async input => Response.json(String(input).endsWith("/login")
    ? { status: "000", entity: "unpaid-proof-token" } : { status: "000", entity });
  const invoice = { merchantCode: "test", invoiceNumber: "expected", expectedAmount: 100 };
  try {
    for (const unknown of [null, {}, { status: null }, { status: null, invoiceNumber: "wrong", amount: 100 },
      { status: null, invoiceNumber: "expected", amount: 99 },
      { status: "FAILED", invoiceNumber: "expected", amount: 100 }]) {
      entity = unknown;
      assert.equal((await checkSystemQrPaymentEvidence(invoice, "unpaid-user", "unpaid-password")).verifiedUnpaid, false);
    }
    entity = { status: null, invoiceNumber: "expected", amount: "100.00" };
    assert.deepEqual(await checkSystemQrPaymentEvidence(invoice, "unpaid-user", "unpaid-password"),
      { paid: false, verifiedUnpaid: true });
  } finally { globalThis.fetch = original; }
});
