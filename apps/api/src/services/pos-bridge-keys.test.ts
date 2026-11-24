import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { prisma } from "@mgl/database";
import {
  bridgeRootKey,
  BridgePairingError,
  createBridgeCredentialSalt,
  deriveBridgeSecret,
  registerBridgeKey,
} from "./pos-bridge-keys";

const names = [
  "JWT_SECRET",
  "APP_ENV",
  "NODE_ENV",
  "POS_BRIDGE_PAIRING_SECRET",
] as const;
const original = new Map(names.map((name) => [name, process.env[name]]));
const jwtRoot = "existing-production-authentication-test-root";
const dedicatedRoot = "independent-production-pairing-test-root";
const restores: Array<() => void> = [];
const isConfigurationError = (error: unknown) =>
  error instanceof BridgePairingError &&
  error.status === 503 &&
  error.message === "PAX холболтын серверийн түлхүүр тохируулагдаагүй байна";

beforeEach(() => {
  process.env.APP_ENV = "production";
  process.env.JWT_SECRET = jwtRoot;
  delete process.env.POS_BRIDGE_PAIRING_SECRET;
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
  for (const name of names) {
    const value = original.get(name);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

function bindingFixture(salt: string) {
  const previous: unknown = Reflect.get(prisma.posBridgeBinding, "findUnique");
  Reflect.set(prisma.posBridgeBinding, "findUnique", async () => ({
    id: "binding",
    registerId: "register",
    credentialSalt: salt,
    revokedAt: null,
  }));
  restores.push(() => {
    Reflect.set(prisma.posBridgeBinding, "findUnique", previous);
  });
}

test("a valid dedicated pairing root enables production pairing without changing a weak existing JWT", () => {
  process.env.JWT_SECRET = "existing-short-jwt";
  process.env.POS_BRIDGE_PAIRING_SECRET = dedicatedRoot;
  assert.equal(bridgeRootKey(), dedicatedRoot);
  const salt = createBridgeCredentialSalt();
  assert.match(salt, /^v2:[a-f0-9]{64}$/);
  assert.equal(bridgeRootKey(salt), dedicatedRoot);
  assert.equal(process.env.JWT_SECRET, "existing-short-jwt");
});

test("legacy salts retain their original JWT-derived key after the dedicated root is added", async () => {
  const salt = "a".repeat(64);
  bindingFixture(salt);
  const expected = deriveBridgeSecret("register", salt, jwtRoot);
  assert.equal((await registerBridgeKey("register")).secret, expected);
  process.env.POS_BRIDGE_PAIRING_SECRET = dedicatedRoot;
  assert.equal(bridgeRootKey(), dedicatedRoot);
  assert.equal(bridgeRootKey(salt), jwtRoot);
  assert.equal((await registerBridgeKey("register")).secret, expected);
  assert.notEqual(
    expected,
    deriveBridgeSecret("register", salt, dedicatedRoot),
  );
});

test("versioned bindings derive from the dedicated root and ignore JWT rotation", async () => {
  const salt = `v2:${"b".repeat(64)}`;
  process.env.POS_BRIDGE_PAIRING_SECRET = dedicatedRoot;
  bindingFixture(salt);
  const expected = deriveBridgeSecret("register", salt, dedicatedRoot);
  assert.equal((await registerBridgeKey("register")).secret, expected);
  process.env.JWT_SECRET = "different-authentication-key";
  assert.equal((await registerBridgeKey("register")).secret, expected);
});

for (const configured of [
  undefined,
  "",
  "short",
  "replace-with-a-long-random-secret",
]) {
  test(`versioned bindings fail closed for an unavailable or invalid dedicated root (${configured === undefined ? "missing" : configured.length})`, async () => {
    if (configured === undefined) delete process.env.POS_BRIDGE_PAIRING_SECRET;
    else process.env.POS_BRIDGE_PAIRING_SECRET = configured;
    const salt = `v2:${"c".repeat(64)}`;
    bindingFixture(salt);
    assert.throws(() => bridgeRootKey(salt), isConfigurationError);
    await assert.rejects(registerBridgeKey("register"), isConfigurationError);
  });
}

test("new invalid dedicated configuration does not break a valid legacy binding", () => {
  process.env.POS_BRIDGE_PAIRING_SECRET = "short";
  assert.equal(bridgeRootKey("legacy-salt"), jwtRoot);
  assert.throws(() => bridgeRootKey(), isConfigurationError);
  assert.throws(() => createBridgeCredentialSalt(), isConfigurationError);
});

test("production guard is unchanged when no dedicated root is configured", () => {
  assert.equal(bridgeRootKey(), jwtRoot);
  assert.match(createBridgeCredentialSalt(), /^[a-f0-9]{64}$/);
  process.env.JWT_SECRET = "dev-secret-change-me";
  assert.throws(() => bridgeRootKey(), isConfigurationError);
  assert.throws(() => createBridgeCredentialSalt(), isConfigurationError);
});

test("an unknown salt version cannot silently use the JWT root", () => {
  process.env.POS_BRIDGE_PAIRING_SECRET = dedicatedRoot;
  assert.throws(() => bridgeRootKey("v3:future-salt"), /хувилбар/);
});
