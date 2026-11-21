import assert from "node:assert/strict";
import test from "node:test";
import {
  readSignedBridgeResult,
  signBridgePayload,
} from "./android-pgw-bridge";

test("a signed PGW result is authenticated without sharing a key with the browser", () => {
  const body = JSON.stringify({
    attemptId: "a",
    requestAmount: 100,
    requestedTerminalId: "t",
    status: "APPROVED",
  });
  const signature = signBridgePayload(body, "test-secret");
  assert.equal(
    readSignedBridgeResult(body, signature, "test-secret").attemptId,
    "a",
  );
  const invalidCases: Array<[unknown, unknown, string]> = [
    [body.replace("100", "200"), signature, "test-secret"],
    [body, signature, "wrong-key"],
    [body, "bad", "test-secret"],
    [body, signature, ""],
    [body, undefined, "test-secret"],
  ];
  for (const [payload, token, secret] of invalidCases)
    assert.throws(() => readSignedBridgeResult(payload, token, secret));
});

test("even signed malformed or oversized results cannot be accepted", () => {
  for (const body of ["[]", "null", "{", "x".repeat(256_001)])
    assert.throws(() =>
      readSignedBridgeResult(body, signBridgePayload(body, "secret"), "secret"),
    );
});
