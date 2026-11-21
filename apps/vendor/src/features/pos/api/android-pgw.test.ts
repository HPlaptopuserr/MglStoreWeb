import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { runAndroidPgwCommand } from "./android-pgw";
import { closeShiftWithSettlement } from "./close-shift-with-settlement";
import {
  chargeClientBridge,
  getCardAttemptStatus,
  submitClientBridgeResult,
} from "./card-terminal";

afterEach(() => mock.restoreAll());

test("an enrolled signature cannot downgrade to a legacy bridge when capabilities are absent", async () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "window",
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { setTimeout, clearTimeout },
  });
  const calls: string[] = [];
  mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    calls.push(String(url));
    return Response.json({ message: "Not found" }, { status: 404 });
  });
  try {
    await assert.rejects(
      chargeClientBridge({
        bridgeUrl: "http://127.0.0.1:7420",
        attemptId: "paired-attempt",
        amount: 100,
        terminalId: "terminal-1",
        requestSignature: "server-paired-signature",
      }),
    );
    assert.deepEqual(calls, ["http://127.0.0.1:7420/capabilities"]);
  } finally {
    if (windowDescriptor)
      Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("a protocol 2 signing bridge cannot be used as an unsigned legacy terminal", async () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "window",
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { setTimeout, clearTimeout },
  });
  const calls: string[] = [];
  mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    calls.push(String(url));
    return Response.json({
      ok: true,
      provider: "android-pgw",
      protocolVersion: 2,
      signingEnabled: true,
    });
  });
  try {
    await assert.rejects(
      chargeClientBridge({
        bridgeUrl: "http://127.0.0.1:7420",
        attemptId: "missing-token",
        amount: 100,
        terminalId: "terminal-1",
      }),
    );
    assert.deepEqual(calls, ["http://127.0.0.1:7420/health"]);
  } finally {
    if (windowDescriptor)
      Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("missing paired journal evidence remains pending and never falls back to a new charge", async () => {
  const calls: string[] = [];
  const original = {
    attemptId: "paired-attempt",
    status: "PENDING",
    amount: 100,
    terminalId: "terminal-1",
    bridgeUrl: "http://127.0.0.1:7420",
    bridgeRequestSignature: "server-paired-signature",
  };
  mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    calls.push(String(url));
    if (String(url).includes("/card/status/")) return Response.json(original);
    assert.ok(String(url).endsWith("/charge/status"));
    return Response.json(
      { message: "No local operation recorded" },
      { status: 404 },
    );
  });
  assert.deepEqual(await getCardAttemptStatus("paired-attempt"), original);
  assert.equal(calls.length, 2);
  assert.equal(
    calls.some(
      (url) => url.endsWith("/charge") || url.includes("client-bridge-result"),
    ),
    false,
  );
});

test("a signed Vendor payment never dispatches to an old or unsigned bridge", async () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "window",
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { setTimeout, clearTimeout },
  });
  try {
    for (const capabilities of [
      { ok: true, provider: "android-pgw", signingEnabled: true },
      {
        ok: true,
        provider: "android-pgw",
        signingEnabled: false,
        protocolVersion: 2,
      },
      { ok: true, provider: "mock", signingEnabled: true, protocolVersion: 2 },
    ]) {
      const requests: string[] = [];
      const fetchMock = mock.method(
        globalThis,
        "fetch",
        async (url: string | URL | Request) => {
          requests.push(String(url));
          return Response.json(capabilities);
        },
      );
      await assert.rejects(
        chargeClientBridge({
          bridgeUrl: "http://127.0.0.1:7420",
          attemptId: "a",
          terminalId: "t",
          amount: 100,
          requestSignature: "token",
        }),
      );
      assert.deepEqual(requests, ["http://127.0.0.1:7420/capabilities"]);
      fetchMock.mock.restore();
    }
  } finally {
    if (windowDescriptor)
      Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("Vendor relays a signed purchase and its exact response without knowing the secret", async () => {
  const calls: string[] = [];
  const text = '{"status":"APPROVED","attemptId":"a"}';
  mock.method(
    globalThis,
    "fetch",
    async (url: string | URL | Request, init?: RequestInit) => {
      calls.push(String(url));
      if (String(url).endsWith("/capabilities"))
        return Response.json({
          ok: true,
          provider: "android-pgw",
          signingEnabled: true,
          protocolVersion: 2,
        });
      if (String(url).endsWith("/charge")) {
        assert.equal(
          new Headers(init?.headers).get("x-mgl-bridge-signature"),
          "server-request-signature",
        );
        return new Response(text, {
          headers: { "x-mgl-bridge-signature": "bridge-result-signature" },
        });
      }
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(body.bridgeResponse, text);
      assert.equal(body.bridgeSignature, "bridge-result-signature");
      return Response.json({ status: "APPROVED" });
    },
  );
  const windowDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "window",
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { setTimeout, clearTimeout },
  });
  try {
    const result = await chargeClientBridge({
      attemptId: "a",
      amount: 100,
      terminalId: "t",
      bridgeUrl: "http://127.0.0.1:7420",
      requestSignature: "server-request-signature",
    });
    if (windowDescriptor)
      Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
    assert.equal(
      (
        await submitClientBridgeResult({
          attemptId: "a",
          result,
          cardFlowVersion: 2,
        })
      ).status,
      "APPROVED",
    );
    assert.equal(calls.length, 3);
    assert.ok(calls[1]?.endsWith("/charge"));
  } finally {
    if (windowDescriptor)
      Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("status restoration reads the bridge journal and never sends another purchase", async () => {
  const calls: string[] = [];
  mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    calls.push(String(url));
    if (String(url).includes("/card/status/"))
      return Response.json({
        attemptId: "a",
        status: "PENDING",
        amount: 100,
        terminalId: "t",
        bridgeUrl: "http://127.0.0.1:7420",
        bridgeRequestSignature: "token",
      });
    if (String(url).endsWith("/charge/status"))
      return Response.json(
        { status: "APPROVED" },
        { headers: { "x-mgl-bridge-signature": "result-token" } },
      );
    assert.ok(String(url).endsWith("/client-bridge-result-v2"));
    return Response.json({ status: "APPROVED" });
  });
  assert.equal((await getCardAttemptStatus("a")).status, "APPROVED");
  assert.equal(calls.length, 3);
  assert.equal(
    calls.some((url) => url.endsWith("/charge")),
    false,
  );
});

test("unreachable bridge status preserves PENDING without sending a purchase", async () => {
  mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    if (String(url).includes("/card/status/"))
      return Response.json({
        attemptId: "a",
        status: "PENDING",
        amount: 100,
        terminalId: "t",
        bridgeUrl: "http://127.0.0.1:7420",
        bridgeRequestSignature: "token",
      });
    assert.ok(String(url).endsWith("/charge/status"));
    throw new TypeError("offline");
  });
  assert.equal((await getCardAttemptStatus("a")).status, "PENDING");
});

test("PGW void uses the server-derived RRN and verifies the exact signed result", async () => {
  let count = 0;
  const command = {
    operation: "void",
    requestId: "void_a",
    terminalId: "t",
    rrn: "001234567890",
  };
  mock.method(
    globalThis,
    "fetch",
    async (_url: string | URL | Request, init?: RequestInit) => {
      count += 1;
      if (count === 1)
        return Response.json({
          command,
          bridgeUrl: "http://127.0.0.1:7420",
          signature: "server-token",
        });
      if (count === 2) {
        assert.deepEqual(JSON.parse(String(init?.body)), command);
        assert.equal(
          new Headers(init?.headers).get("x-mgl-bridge-signature"),
          "server-token",
        );
        return Response.json(
          { command, status: "APPROVED" },
          { headers: { "x-mgl-bridge-signature": "bridge-token" } },
        );
      }
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(body.bridgeSignature, "bridge-token");
      assert.equal(body.attemptId, "a");
      return Response.json({ succeed: true, status: "APPROVED" });
    },
  );
  assert.equal(
    (
      await runAndroidPgwCommand({
        operation: "void",
        registerId: "r",
        attemptId: "a",
      })
    ).succeed,
    true,
  );
  assert.equal(count, 3);
});

for (const approved of [true, false]) {
  test(`PGW settlement ${approved ? "allows" : "blocks"} shift closure using verified result`, async () => {
    const calls: string[] = [];
    mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
      calls.push(String(url));
      if (calls.length === 1)
        return Response.json({
          command: {
            operation: "settlement",
            requestId: "settlement_shift",
            terminalId: "t",
          },
          bridgeUrl: "http://127.0.0.1:7420",
          signature: "token",
        });
      if (calls.length === 2)
        return Response.json({ status: approved ? "APPROVED" : "FAILED" });
      if (calls.length === 3)
        return Response.json({
          succeed: approved,
          status: approved ? "APPROVED" : "FAILED",
          message: "Unresolved settlement",
        });
      assert.ok(String(url).endsWith("/shifts/close"));
      return Response.json({ status: "CLOSED" });
    });
    const request = closeShiftWithSettlement(
      { shiftId: "shift", closingCash: 100 },
      { pgwRegisterId: "r" },
    );
    if (approved) assert.equal((await request).status, "CLOSED");
    else await assert.rejects(request, /Unresolved settlement/);
    assert.equal(calls.length, approved ? 4 : 3);
    assert.equal(
      calls.some((url) => url.includes("push-ecr")),
      false,
    );
  });
}
