import assert from "node:assert/strict";
import test from "node:test";
import { paymentProviderFetch } from "./payment-provider-fetch";

test("provider timeout aborts the request without retrying", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const keepAlive = setInterval(() => {}, 100);
  globalThis.fetch = async (_input, init) => {
    calls += 1;
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    });
  };
  try {
    await assert.rejects(paymentProviderFetch("https://provider.invalid", {}, 10), { name: "TimeoutError" });
    assert.equal(calls, 1);
  } finally {
    clearInterval(keepAlive);
    globalThis.fetch = original;
  }
});

test("caller cancellation is preserved", async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async (_input, init) => {
    init?.signal?.throwIfAborted();
    return new Response();
  };
  try {
    await assert.rejects(paymentProviderFetch("https://provider.invalid", { signal: controller.signal }), { name: "AbortError" });
  } finally {
    globalThis.fetch = original;
  }
});
