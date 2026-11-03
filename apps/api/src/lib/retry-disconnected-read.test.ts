import assert from "node:assert/strict";
import test from "node:test";
import { retryDisconnectedRead } from "./retry-disconnected-read";

test("a stale connection can recover without losing the read result", async () => {
  let calls = 0;
  const result = await retryDisconnectedRead(async () => {
    if (++calls === 1) throw { code: "P1017" };
    return { status: "APPROVED" };
  });
  assert.equal(result.status, "APPROVED");
  assert.equal(calls, 2);
});

test("a continuing outage stops after one retry and preserves the error", async () => {
  let calls = 0;
  const failure = Object.assign(new Error("Server has closed the connection."), { code: "P1017" });
  await assert.rejects(retryDisconnectedRead(async () => { calls++; throw failure; }), error => error === failure);
  assert.equal(calls, 2);
});

test("pool exhaustion, schema errors and application errors are never retried", async () => {
  for (const failure of [{ code: "P2024" }, { code: "P2022" }, new Error("Forbidden")]) {
    let calls = 0;
    await assert.rejects(retryDisconnectedRead(async () => { calls++; throw failure; }), error => error === failure);
    assert.equal(calls, 1);
  }
});
