import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nativeCallUuid,
  signCallAction,
  verifyCallAction,
} from "./call-push.service";

test("native call IDs are stable across app lifecycle changes", () => {
  assert.equal(nativeCallUuid("call-123"), nativeCallUuid("call-123"));
  assert.match(
    nativeCallUuid("call-123"),
    /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/,
  );
  assert.notEqual(nativeCallUuid("call-123"), nativeCallUuid("call-124"));
});
test("call actions are scoped, signed and expire", () => {
  const previous = process.env.CALL_ACTION_SECRET;
  process.env.CALL_ACTION_SECRET = "unit-test-only-call-action-secret";
  try {
    const claims = {
      callId: "call-123",
      conversationId: "conversation-1",
      userId: "recipient-1",
      expires: Date.now() + 60000,
    };
    const token = signCallAction(claims);
    assert.deepEqual(verifyCallAction(token), claims);
    assert.equal(verifyCallAction(token + "tampered"), null);
    assert.equal(
      verifyCallAction(signCallAction({ ...claims, expires: Date.now() - 1 })),
      null,
    );
    const [body, signature] = token.split(".");
    const forgedBody = Buffer.from(
      JSON.stringify({ ...claims, userId: "other-user" }),
    ).toString("base64url");
    assert.equal(verifyCallAction(`${forgedBody}.${signature}`), null);
    assert.equal(verifyCallAction(`${body}.`), null);
  } finally {
    if (previous === undefined) delete process.env.CALL_ACTION_SECRET;
    else process.env.CALL_ACTION_SECRET = previous;
  }
});
