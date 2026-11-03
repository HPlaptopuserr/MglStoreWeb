import assert from "node:assert/strict";
import test from "node:test";
import { readChallenge, signChallenge } from "./recovery-cookie";
test("signed challenge binds the phone and provider session", () => {
  const challenge = {
    phone: "99112233",
    sessionId: "session-one",
    expiresAt: Date.now() + 300000,
  };
  const cookie = signChallenge(challenge);
  assert.deepEqual(readChallenge(cookie), challenge);
  const [, signature] = cookie.split(".");
  const tampered = Buffer.from(
    JSON.stringify({ ...challenge, phone: "88112233" }),
  ).toString("base64url");
  assert.equal(readChallenge(`${tampered}.${signature}`), null);
});
test("expired, malformed and unsigned challenges fail closed", () => {
  assert.equal(
    readChallenge(
      signChallenge({
        phone: "99112233",
        sessionId: "session",
        expiresAt: Date.now() - 1,
      }),
    ),
    null,
  );
  for (const value of [undefined, "", "payload.signature", "a.b.c"])
    assert.equal(readChallenge(value), null);
});
