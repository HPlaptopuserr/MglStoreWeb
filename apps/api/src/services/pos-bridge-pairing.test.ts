import assert from "node:assert/strict";
import test from "node:test";
import type { PosBridgeBinding } from "@prisma/client";
import { deriveBridgeSecret, hashPairingCode } from "./pos-bridge-keys";
import { publicBridgeStatus } from "./pos-bridge-pairing";

test("each register and pairing generation has an independent key", () => {
  const key = deriveBridgeSecret("register-a", "random-salt", "root-secret");
  assert.equal(key.length, 64);
  assert.equal(
    key,
    deriveBridgeSecret("register-a", "random-salt", "root-secret"),
  );
  assert.notEqual(
    key,
    deriveBridgeSecret("register-b", "random-salt", "root-secret"),
  );
  assert.notEqual(
    key,
    deriveBridgeSecret("register-a", "new-salt", "root-secret"),
  );
  assert.notEqual(
    key,
    deriveBridgeSecret("register-a", "random-salt", "rotated-root"),
  );
});

test("one-time codes normalize formatting while only their hash is stored", () => {
  assert.equal(
    hashPairingCode("ABCDE-12345-ABCDE-12345"),
    hashPairingCode(" abcde12345abcde12345 "),
  );
  assert.notEqual(
    hashPairingCode("ABCDE-12345-ABCDE-12345"),
    hashPairingCode("ABCDE-12345-ABCDE-12346"),
  );
});

const now = new Date("2026-11-21T08:00:00Z");
const binding: PosBridgeBinding = {
  id: "binding",
  registerId: "register",
  credentialSalt: "private-salt",
  deviceId: "device",
  pairingCodeHash: "private-code-hash",
  pairingExpiresAt: null,
  pairedAt: now,
  revokedAt: null,
  lastSeenAt: now,
  lastHeartbeatAt: now,
  terminalConnected: true,
  terminalId: "000001",
  serialPath: "COM3",
  bridgeVersion: "2",
  lastError: null,
  activeCommandId: null,
  hasUnresolvedOperation: false,
  createdAt: now,
  updatedAt: now,
};

test("Admin status distinguishes fresh terminal health from stale/offline reports and exposes no key material", () => {
  assert.equal(publicBridgeStatus(null, now).state, "UNPAIRED");
  assert.equal(publicBridgeStatus(binding, now).state, "CONNECTED");
  assert.equal(
    publicBridgeStatus({ ...binding, terminalConnected: false }, now).state,
    "TERMINAL_OFFLINE",
  );
  assert.equal(
    publicBridgeStatus(binding, new Date(now.getTime() + 150_000)).state,
    "OFFLINE",
  );
  assert.equal(
    publicBridgeStatus({ ...binding, revokedAt: now }, now).state,
    "REVOKED",
  );
  assert.equal(
    publicBridgeStatus(
      {
        ...binding,
        pairedAt: null,
        pairingExpiresAt: new Date(now.getTime() + 1000),
      },
      now,
    ).state,
    "PAIRING",
  );
  assert.equal(
    publicBridgeStatus(
      { ...binding, pairedAt: null, pairingExpiresAt: now },
      now,
    ).state,
    "UNPAIRED",
  );
  assert.equal(
    publicBridgeStatus({ ...binding, activeCommandId: "void" }, now)
      .hasUnresolvedOperation,
    true,
  );
  const serialized = JSON.stringify(publicBridgeStatus(binding, now));
  for (const hidden of [
    "private-salt",
    "private-code-hash",
    "deviceId",
    "credentialSalt",
  ])
    assert.ok(!serialized.includes(hidden));
});
