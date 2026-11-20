import assert from "node:assert/strict";
import test from "node:test";
import { createQPayInvoice } from "./qpay";
import { PosApiError } from "./_pos-client";

for (const create of [createQPayInvoice]) {
  test(`${create.name}: incompatible API never receives financial POST`, async () => {
    const original = globalThis.fetch;
    const methods: string[] = [];
    globalThis.fetch = async (_url, init) => {
      methods.push(init?.method || "GET");
      return new Response("not found", { status: 404 });
    };
    try {
      await assert.rejects(create({ amount: 100, requestId: "12345678-1234-1234-1234-123456789abc" }),
        (error: unknown) => error instanceof PosApiError && error.code === "PAYMENT_NOT_STARTED");
      assert.deepEqual(methods, ["GET"]);
    } finally { globalThis.fetch = original; }
  });
}
test("compatible API receives the same recovery ID and structured config error survives", async () => {
  const original = globalThis.fetch;
  const id = "12345678-1234-1234-1234-123456789abc";
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    if (calls === 1) return Response.json({ paymentRecoveryVersion: 1 });
    assert.equal(JSON.parse(String(init?.body)).requestId, id);
    return Response.json({ code: "PAYMENT_NOT_STARTED", message: "config missing" }, { status: 409 });
  };
  try {
    await assert.rejects(createQPayInvoice({ amount: 100, requestId: id }),
      (error: unknown) => error instanceof PosApiError && error.code === "PAYMENT_NOT_STARTED" && error.status === 409);
    assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});

test("QR baskets require API reservation support before dispatch", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  const checkout = { clientSaleId: "sale", branchId: "branch", shiftId: "shift", lines: [{ productId: "product", qty: 1, unitPrice: 100, taxRate: 0, priceType: "UNIT" as const, discountAmount: 0 }] };
  globalThis.fetch = async (_url, init) => {
    calls.push(init?.method || "GET");
    return Response.json({ paymentRecoveryVersion: 1 });
  };
  try {
    await assert.rejects(createQPayInvoice({ amount: 100, checkout }), (error: unknown) => error instanceof PosApiError && error.code === "PAYMENT_NOT_STARTED");
    assert.deepEqual(calls, ["GET"]);
    globalThis.fetch = async (_url, init) => {
      if (init?.method !== "POST") return Response.json({ paymentRecoveryVersion: 1, qrCheckoutVersion: 1 });
      assert.deepEqual(JSON.parse(String(init.body)).checkout, checkout);
      return Response.json({ invoiceId: "invoice" });
    };
    assert.equal((await createQPayInvoice({ amount: 100, checkout })).invoiceId, "invoice");
  } finally { globalThis.fetch = original; }
});
