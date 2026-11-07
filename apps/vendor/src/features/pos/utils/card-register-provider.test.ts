import assert from "node:assert/strict";
import test from "node:test";
import {
  configuredCardProvider,
  effectiveCardProvider,
} from "./card-register-provider";

const configured = {
  cardEnabled: true,
  hasOwnCardTerminal: true,
  cardProviderType: "MINU_AGENT",
  cardTerminalId: "own-terminal",
  terminalBridgeUrl: null,
};
test("unconfigured tills use manual cards without borrowing another till's terminal", () => {
  assert.equal(configuredCardProvider(null), null);
  assert.equal(
    configuredCardProvider({ ...configured, cardEnabled: false }),
    null,
  );
  assert.equal(
    configuredCardProvider({ ...configured, hasOwnCardTerminal: false }),
    null,
  );
  assert.equal(
    configuredCardProvider({ ...configured, cardTerminalId: "" }),
    null,
  );
  assert.equal(
    configuredCardProvider({ ...configured, cardProviderType: "ANDROID_PGW" }),
    null,
  );
});
test("configured own Minu and local HTTP loopback bridges keep their automatic flow", () => {
  assert.equal(configuredCardProvider(configured), "MINU_AGENT");
  assert.equal(
    configuredCardProvider({
      ...configured,
      cardProviderType: "ANDROID_PGW",
      terminalBridgeUrl: "http://127.0.0.1:8787",
    }),
    "ANDROID_PGW",
  );
});

test("old API configurations preserve legacy routing until the new contract is advertised", () => {
  const inherited = { ...configured, hasOwnCardTerminal: false };
  assert.equal(effectiveCardProvider(inherited), "MINU_AGENT");
  assert.equal(
    effectiveCardProvider({ ...inherited, cardFlowVersion: 2 }),
    null,
  );
  assert.equal(
    effectiveCardProvider({ ...configured, cardFlowVersion: 2 }),
    "MINU_AGENT",
  );
  assert.equal(
    effectiveCardProvider({
      ...configured,
      cardProviderType: null,
      minuAgentEnabled: true,
    }),
    "MINU_AGENT",
  );
});
