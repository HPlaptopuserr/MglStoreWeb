import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { runAndroidPgwCommand } from "../api/android-pgw";
import type { CardAttempt } from "@mgl/types";
import {
  cancelPendingClientBridgePayment,
  waitForClientBridgePayment,
} from "./wait-for-client-bridge-payment";
const pending: CardAttempt = {
  attemptId: "purchase-1",
  amount: 4368,
  terminalId: "70012386",
  status: "PENDING",
  createdAt: "2026-11-24T00:00:00Z",
  updatedAt: "2026-11-24T00:00:00Z",
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
for (const status of ["DECLINED", "APPROVED"] as const) {
  test(`journal ${status} wins over open purchase HTTP and late opposite response`, async () => {
    const original = deferred<CardAttempt>();
    const controller = new AbortController();
    let purchases = 0;
    let reads = 0;
    const result = await waitForClientBridgePayment({
      attempt: pending,
      signal: controller.signal,
      intervalMs: 1,
      charge: () => {
        purchases++;
        return original.promise;
      },
      getStatus: async (id) => {
        reads++;
        assert.equal(id, pending.attemptId);
        return { ...pending, status };
      },
    });
    assert.equal(result.status, status);
    assert.equal(purchases, 1);
    assert.equal(controller.signal.aborted, false);
    original.resolve({
      ...pending,
      status: status === "DECLINED" ? "APPROVED" : "DECLINED",
    });
    await new Promise((resolve) => setTimeout(resolve, 8));
    assert.equal(result.status, status);
    assert.equal(reads, 1);
  });
}
test("FAILED and mismatched journal responses never become cancellation", async () => {
  let reads = 0;
  const result = await waitForClientBridgePayment({
    attempt: pending,
    signal: new AbortController().signal,
    intervalMs: 1,
    waitMs: 25,
    charge: () => new Promise<CardAttempt>(() => {}),
    getStatus: async () =>
      ++reads % 2
        ? { ...pending, status: "FAILED" }
        : { ...pending, attemptId: "other", status: "DECLINED" },
  });
  assert.ok(reads > 1);
  assert.equal(result.status, "PENDING");
  assert.equal(result.attemptId, pending.attemptId);
});
test("cashier cancellation is independent of unresolved charge and status read", async () => {
  const original = deferred<CardAttempt>();
  const journal = deferred<CardAttempt>();
  let purchases = 0;
  let cancels = 0;
  const waiting = waitForClientBridgePayment({
    attempt: pending,
    signal: new AbortController().signal,
    intervalMs: 1,
    charge: () => {
      purchases++;
      return original.promise;
    },
    getStatus: () => journal.promise,
  });
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async (url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      cancels++;
      if (cancels === 1) {
        assert.equal(body.operation, "cancel");
        assert.equal(body.attemptId, pending.attemptId);
        return Response.json({
          command: { operation: "cancel", requestId: "cancel-1" },
          bridgeUrl: "http://127.0.0.1:7420",
          signature: "token",
        });
      }
      if (cancels === 2) {
        assert.ok(String(url).endsWith("/terminal/command"));
        return Response.json(
          { status: "PENDING" },
          { headers: { "x-mgl-bridge-signature": "proof" } },
        );
      }
      journal.resolve({ ...pending, status: "DECLINED" });
      return Response.json({ succeed: true, status: "PENDING" });
    },
  );
  try {
    await runAndroidPgwCommand({
      registerId: "register",
      operation: "cancel",
      attemptId: pending.attemptId,
    });
  } finally {
    fetchMock.mock.restore();
  }
  assert.equal((await waiting).status, "DECLINED");
  assert.equal(cancels, 3);
  assert.equal(purchases, 1);
});
for (const status of ["DECLINED", "APPROVED"] as const) {
  test(`inactive cancellation recovers cached ${status} without hardware resend`, async () => {
    let cancels = 0;
    const result = await cancelPendingClientBridgePayment({
      attemptId: pending.attemptId,
      getStatus: async () => ({ ...pending, status }),
      cancel: async () => {
        cancels++;
      },
    });
    assert.equal(result.status, status);
    assert.equal(cancels, 0);
  });
}
test("inactive pending checkout cancels matching attempt once then reads final status", async () => {
  const calls: string[] = [];
  const result = await cancelPendingClientBridgePayment({
    attemptId: pending.attemptId,
    getStatus: async (id) => {
      calls.push(`status:${id}`);
      return {
        ...pending,
        status: calls.length === 1 ? "PENDING" : "DECLINED",
      };
    },
    cancel: async () => {
      calls.push("cancel");
    },
  });
  assert.deepEqual(calls, ["status:purchase-1", "cancel", "status:purchase-1"]);
  assert.equal(result.status, "DECLINED");
});
test("aborted caller never dispatches a purchase", async () => {
  const controller = new AbortController();
  controller.abort();
  let purchases = 0;
  await assert.rejects(
    waitForClientBridgePayment({
      attempt: pending,
      signal: controller.signal,
      charge: async () => {
        purchases++;
        return pending;
      },
      getStatus: async () => pending,
    }),
    { name: "AbortError" },
  );
  assert.equal(purchases, 0);
});
