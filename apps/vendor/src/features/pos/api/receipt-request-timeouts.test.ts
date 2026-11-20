import test from "node:test";
import assert from "node:assert/strict";
import { attachEbarimtReceipt } from "./ebarimt";
import { createSale } from "./create-sale";

test("sale creation and fiscal attachment have bounded waits", async () => {
  const originalFetch = globalThis.fetch;
  const originalTimeout = AbortSignal.timeout;
  const timeouts: number[] = [];
  AbortSignal.timeout = (milliseconds: number) => {
    timeouts.push(milliseconds);
    return new AbortController().signal;
  };
  globalThis.fetch = async (_url, init) => {
    assert.ok(init?.signal instanceof AbortSignal);
    return Response.json({ ebarimt: { status: "SUCCESS" } });
  };
  try {
    await createSale({
      shiftId: "shift",
      branchId: "branch",
      clientSaleId: "client-sale",
      paymentMethod: "CASH",
      lines: [],
    });
    await attachEbarimtReceipt("sale", { status: "SUCCESS", billId: "bill" });
    assert.deepEqual(timeouts, [60_000, 15_000]);
  } finally {
    globalThis.fetch = originalFetch;
    AbortSignal.timeout = originalTimeout;
  }
});
