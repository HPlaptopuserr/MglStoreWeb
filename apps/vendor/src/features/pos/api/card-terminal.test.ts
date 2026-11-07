import assert from "node:assert/strict";
import test from "node:test";
import {
  chargeClientBridge,
  ClientBridgeNotStartedError,
} from "./card-terminal";

test("only bridge preflight failures permit standalone manual card recording", async () => {
  const oldFetch = globalThis.fetch;
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { setTimeout, clearTimeout },
  });
  const payload = {
    bridgeUrl: "http://127.0.0.1:8787",
    attemptId: "attempt",
    terminalId: "local",
    amount: 1000,
  };
  const calls: string[] = [];
  try {
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      throw new TypeError("Failed to fetch");
    };
    await assert.rejects(
      chargeClientBridge(payload),
      ClientBridgeNotStartedError,
    );
    assert.deepEqual(calls, ["http://127.0.0.1:8787/health"]);
    calls.length = 0;
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      if (String(url).endsWith("/health"))
        return Response.json({ ok: true, provider: "android-pgw" });
      throw new TypeError("Failed to fetch");
    };
    await assert.rejects(
      chargeClientBridge(payload),
      (error: unknown) =>
        error instanceof Error &&
        !(error instanceof ClientBridgeNotStartedError),
    );
    assert.equal(
      calls.length,
      2,
      "a lost charge response must not be approved as manual",
    );
    assert.ok(calls[1].endsWith("/charge"));
    calls.length = 0;
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      return Response.json({ ok: false, message: "No serial connection" });
    };
    await assert.rejects(
      chargeClientBridge(payload),
      ClientBridgeNotStartedError,
    );
    assert.equal(calls.length, 1);
    const abort = new AbortController();
    abort.abort();
    await assert.rejects(
      chargeClientBridge({ ...payload, signal: abort.signal }),
      (error: unknown) => !(error instanceof ClientBridgeNotStartedError),
    );
  } finally {
    globalThis.fetch = oldFetch;
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
