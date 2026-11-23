import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { cancelQPayInvoice, getQPayInvoiceStatus } from "./qpay";

afterEach(() => mock.restoreAll());
for (const operation of ["status", "cancel"] as const) {
  test(`${operation} stops waiting at its 15 second deadline without another bank request`, async () => {
    const deadlines: number[] = [];
    let requests = 0;
    mock.method(AbortSignal, "timeout", (milliseconds: number) => {
      deadlines.push(milliseconds);
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), 1);
      return controller.signal;
    });
    mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
      requests += 1;
      assert.ok(String(url).includes(operation === "status" ? "/status/" : "/cancel"));
      assert.ok(init?.signal);
      return new Promise<Response>((_resolve, reject) => {
        const signal = init.signal!;
        if (signal.aborted) reject(signal.reason);
        else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    });
    await assert.rejects(operation === "status" ? getQPayInvoiceStatus("invoice") : cancelQPayInvoice("invoice", true), { name: "TimeoutError" });
    assert.deepEqual(deadlines, [15_000]);
    assert.equal(requests, 1);
  });
}

test("an operation deadline also aborts a later cancellation request rather than starting a new wait", async () => {
  const controller = new AbortController();
  controller.abort(new DOMException("Operation expired", "TimeoutError"));
  const request = mock.method(globalThis, "fetch", async (_url: string | URL | Request, init?: RequestInit) => {
    assert.equal(init?.signal?.aborted, true);
    throw init?.signal?.reason;
  });
  await assert.rejects(cancelQPayInvoice("invoice", true, controller.signal), { name: "TimeoutError" });
  assert.equal(request.mock.callCount(), 1);
});
