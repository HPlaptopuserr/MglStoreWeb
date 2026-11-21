import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaxA35Connection } from "./PaxA35Connection";
import {
  currentBridgeState,
  getBridgeStatus,
  issuePairingCode,
  pairingActivationLink,
  pairingSecondsRemaining,
  parseBridgeStatus,
  parsePairingCode,
  revokeBridge,
  type BridgeStatus,
} from "./pax-a35-connection";

afterEach(() => mock.restoreAll());

const status: BridgeStatus = {
  state: "CONNECTED",
  pairedAt: "2026-11-21T08:00:00.000Z",
  lastSeenAt: "2026-11-21T08:15:00.000Z",
  pairingExpiresAt: null,
  serialPath: "COM3",
  terminalId: "00123456",
  bridgeVersion: "2.0.0",
  lastError: null,
  hasUnresolvedOperation: false,
};
const code = {
  code: "01234-ABCDE-56789-F0123",
  expiresAt: "2026-11-21T08:25:00.000Z",
};

test("status parsing retains public display fields and drops credential-like extras", () => {
  assert.deepEqual(
    parseBridgeStatus({
      ...status,
      secret: "must-never-enter-ui",
      pairingCodeHash: "private",
    }),
    status,
  );
  for (const invalid of [
    null,
    [],
    {},
    { ...status, state: "anything" },
    { ...status, hasUnresolvedOperation: "false" },
    { ...status, terminalId: 123 },
    { ...status, lastSeenAt: "invalid date" },
  ])
    assert.throws(() => parseBridgeStatus(invalid));
});

test("the badge stops claiming online after the heartbeat freshness window", () => {
  const seen = Date.parse(status.lastSeenAt!);
  assert.equal(currentBridgeState(status, seen + 149_999), "CONNECTED");
  assert.equal(currentBridgeState(status, seen + 150_000), "OFFLINE");
  assert.equal(
    currentBridgeState({ ...status, lastSeenAt: null }, seen),
    "OFFLINE",
  );
  assert.equal(
    currentBridgeState({ ...status, state: "REVOKED" }, seen),
    "REVOKED",
  );
  assert.equal(
    currentBridgeState(
      { ...status, state: "TERMINAL_OFFLINE" },
      seen + 150_001,
    ),
    "OFFLINE",
  );
});

test("pairing codes and expiry are validated and countdown never becomes negative", () => {
  assert.deepEqual(parsePairingCode(code), code);
  for (const invalid of [
    {},
    { ...code, code: "12345" },
    { ...code, expiresAt: "not a date" },
    { ...code, code: 123 },
  ])
    assert.throws(() => parsePairingCode(invalid));
  const expiry = Date.parse(code.expiresAt);
  assert.equal(pairingSecondsRemaining(code.expiresAt, expiry - 10_000), 10);
  assert.equal(pairingSecondsRemaining(code.expiresAt, expiry - 1), 1);
  assert.equal(pairingSecondsRemaining(code.expiresAt, expiry + 1), 0);
});

test("activation links use the configured API, with plaintext allowed only on loopback", () => {
  assert.equal(
    pairingActivationLink("https://api.example/api", code.code),
    `https://api.example/api/pos/bridge/pair#${code.code}`,
  );
  assert.equal(
    pairingActivationLink("http://localhost:4000/api/", code.code),
    `http://localhost:4000/api/pos/bridge/pair#${code.code}`,
  );
  assert.equal(
    new URL(pairingActivationLink("http://127.0.0.1:4000/api", code.code))
      .hostname,
    "127.0.0.1",
  );
  assert.equal(
    new URL(pairingActivationLink("http://[::1]:4000/api", code.code)).hostname,
    "[::1]",
  );
  for (const base of [
    "http://api.example/api",
    "http://localhost.evil/api",
    "https://user:pass@api.example/api",
    "https://api.example/api?query=1",
    "https://api.example/api#fragment",
    "file:///api",
  ])
    assert.throws(() => pairingActivationLink(base, code.code));
});

test("admin status and issuing a code use the existing register endpoints without caching", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), init });
      return Response.json(requests.length === 1 ? status : code, {
        status: requests.length === 1 ? 200 : 201,
      });
    },
  );
  assert.deepEqual(await getBridgeStatus("register/one"), status);
  assert.deepEqual(await issuePairingCode("register/one"), code);
  assert.ok(
    requests[0]!.url.endsWith("/admin/pos-registers/register%2Fone/bridge"),
  );
  assert.equal(requests[0]!.init?.method, "GET");
  assert.equal(requests[0]!.init?.cache, "no-store");
  assert.ok(
    requests[1]!.url.endsWith(
      "/admin/pos-registers/register%2Fone/bridge/pairing-code",
    ),
  );
  assert.equal(requests[1]!.init?.method, "POST");
  assert.equal(requests[1]!.init?.body, "{}");
});

test("pending-operation errors remain actionable and never fabricate a pairing code", async () => {
  mock.method(globalThis, "fetch", async () =>
    Response.json(
      { message: "Хүлээгдэж буй төлбөрийг эхлээд шийдвэрлэнэ үү" },
      { status: 409 },
    ),
  );
  await assert.rejects(issuePairingCode("register"), /Хүлээгдэж буй төлбөрийг/);
  await assert.rejects(revokeBridge("register"), /Хүлээгдэж буй төлбөрийг/);
});

test("revocation accepts an empty 204 response without parsing it as JSON", async () => {
  const request = mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      assert.ok(String(input).endsWith("/admin/pos-registers/register/bridge"));
      assert.equal(init?.method, "DELETE");
      return new Response(null, { status: 204 });
    },
  );
  await revokeBridge("register");
  assert.equal(request.mock.callCount(), 1);
});

test("cancelling a panel request passes the abort signal and never retries a mutation", async () => {
  const controller = new AbortController();
  controller.abort();
  const request = mock.method(
    globalThis,
    "fetch",
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(init?.signal, controller.signal);
      throw new DOMException("Aborted", "AbortError");
    },
  );
  await assert.rejects(issuePairingCode("register", controller.signal), {
    name: "AbortError",
  });
  assert.equal(request.mock.callCount(), 1);
});

test("the per-register UI starts collapsed and names the intended PAX A35 workflow", () => {
  const html = renderToStaticMarkup(
    createElement(PaxA35Connection, {
      registerId: "register",
      registerName: "Vendor касс 1",
      eligible: true,
      cardEnabled: false,
      cardProviderType: null,
      onConfigured: () => undefined,
    }),
  );
  assert.match(html, /Vendor касс 1 · PAX A35 холболт/);
  assert.match(html, /PAX A35 холбох/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /BRIDGE_SHARED_SECRET|POS_BRIDGE_SHARED_SECRET/);
});
