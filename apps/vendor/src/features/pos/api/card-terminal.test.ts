import assert from "node:assert/strict";
import test from "node:test";
import {
  chargeClientBridge,
  clientBridgeFailureResult,
  ClientBridgeNotStartedError,
  createCardAttempt,
  submitClientBridgeResult,
} from "./card-terminal";
import { cardPaymentOutcome } from "../utils/card-payment-outcome";

test("versioned card requests never fall back to a legacy bank endpoint on an old server", async () => {
  const previous = globalThis.fetch;
  const calls: string[] = [];
  try {
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      return Response.json(
        { message: "Unsupported endpoint" },
        { status: 404 },
      );
    };
    await assert.rejects(
      createCardAttempt({ amount: 1000, cardFlowVersion: 2 }),
    );
    assert.equal(calls.length, 1);
    assert.ok(calls[0].endsWith("/pos/payments/card/authorize-v2"));
    await assert.rejects(
      submitClientBridgeResult({
        attemptId: "attempt",
        cardFlowVersion: 2,
        result: { status: "APPROVED", manualCard: true },
      }),
    );
    assert.equal(calls.length, 2);
    assert.ok(calls[1].endsWith("/pos/payments/card/client-bridge-result-v2"));
    await assert.rejects(createCardAttempt({ amount: 1000 }));
    assert.ok(calls[2].endsWith("/pos/payments/card/authorize"));
  } finally {
    globalThis.fetch = previous;
  }
});

test("a lost authorization response retries the same invoice identity on the same versioned endpoint", async () => {
  const previous = globalThis.fetch;
  const calls: { url: string; body: string }[] = [];
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), body: String(options?.body) });
      if (calls.length === 1)
        throw new TypeError("Connection closed during deployment");
      return Response.json({ attemptId: "fixed-id", status: "PENDING" });
    };
    const result = await createCardAttempt({
      attemptId: "fixed-id",
      amount: 1000,
      registerId: "till",
      cardFlowVersion: 2,
    });
    assert.equal(result.attemptId, "fixed-id");
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0], calls[1]);
    assert.ok(calls[0].url.endsWith("/authorize-v2"));
    calls.length = 0;
    await assert.rejects(
      createCardAttempt({ amount: 1000, cardFlowVersion: 2 }),
    );
    assert.equal(
      calls.length,
      1,
      "an untracked authorization must never be retried",
    );
    calls.length = 0;
    const abort = new AbortController();
    globalThis.fetch = async () => {
      calls.push({ url: "cancelled", body: "" });
      abort.abort();
      throw new TypeError("Connection closed");
    };
    await assert.rejects(
      createCardAttempt({
        attemptId: "cancelled-id",
        amount: 1000,
        signal: abort.signal,
        cardFlowVersion: 2,
      }),
    );
    assert.equal(
      calls.length,
      1,
      "cancelling the caller must suppress an authorization retry",
    );
  } finally {
    globalThis.fetch = previous;
  }
});

test("bridge failures never approve payment and distinguish not-started from an unknown charge", async () => {
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
      (error: unknown) => {
        assert.ok(error instanceof ClientBridgeNotStartedError);
        const result = clientBridgeFailureResult(error);
        assert.equal(result.status, "DECLINED");
        assert.equal(result.manualCard, undefined);
        assert.equal(cardPaymentOutcome("DECLINED", result.message), "failed");
        return true;
      },
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
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(!(error instanceof ClientBridgeNotStartedError));
        const result = clientBridgeFailureResult(error);
        assert.equal(result.status, "PENDING");
        assert.equal(result.manualCard, undefined);
        assert.equal(cardPaymentOutcome("PENDING", result.message), "pending");
        return true;
      },
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
      (error: unknown) => {
        assert.ok(error instanceof ClientBridgeNotStartedError);
        assert.equal(clientBridgeFailureResult(error).status, "DECLINED");
        return true;
      },
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
