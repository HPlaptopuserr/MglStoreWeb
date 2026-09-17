import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { closeShiftWithSettlement } from "./close-shift-with-settlement";

afterEach(() => mock.restoreAll());
const payload = { shiftId: "shift", closingCash: 1000, note: "Counted" };
test("failed terminal settlement never sends a shift-close request", async () => {
  const requests: string[] = [];
  mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    requests.push(String(url));
    return Response.json({ succeed: false, message: "Terminal unavailable" });
  });
  await assert.rejects(
    closeShiftWithSettlement(payload, "terminal"),
    /Terminal unavailable/,
  );
  assert.equal(requests.length, 1);
  assert.ok(requests[0]?.endsWith("/settlement"));
});
test("successful settlement precedes closure and preserves counted cash and reason", async () => {
  const requests: string[] = [];
  mock.method(
    globalThis,
    "fetch",
    async (url: string | URL | Request, init: RequestInit) => {
      requests.push(String(url));
      if (requests.length === 1) return Response.json({ succeed: true });
      assert.deepEqual(JSON.parse(String(init.body)), payload);
      return Response.json({ id: "shift", status: "CLOSED" });
    },
  );
  const result = await closeShiftWithSettlement(payload, "terminal");
  assert.equal(result.status, "CLOSED");
  assert.ok(requests[0]?.endsWith("/settlement"));
  assert.ok(requests[1]?.endsWith("/shifts/close"));
});
test("registers without a card terminal close without requesting settlement", async () => {
  const request = mock.method(
    globalThis,
    "fetch",
    async (url: string | URL | Request) => {
      assert.ok(String(url).endsWith("/shifts/close"));
      return Response.json({ id: "shift", status: "CLOSED" });
    },
  );
  await closeShiftWithSettlement(payload);
  assert.equal(request.mock.callCount(), 1);
});
