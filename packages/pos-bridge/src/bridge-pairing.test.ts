import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { postJson } from "./bridge-http";
import { BridgeHeartbeat } from "./bridge-heartbeat";
import {
  assertPairingSafe,
  pairBridge,
  parsePairingInput,
  readBridgeCredentials,
  stableDeviceId,
  writeBridgeCredentials,
  writeBridgeState,
  type BridgeCredentials,
} from "./bridge-pairing";

const code = "ABCDE-12345-ABCDE-12345";
const temporary = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "mgl-bridge-pair-"));

function installPairingCli(directory: string, apiUrl: string, input: string, args = ["--if-needed"]) {
  return new Promise<{ exitCode: number | null; output: string }>(
    (resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "-r",
          require.resolve("ts-node/register"),
          path.join(__dirname, "pair.ts"),
          ...args,
        ],
        {
          cwd: directory,
          env: {
            ...process.env,
            BRIDGE_DATA_DIR: directory,
            BRIDGE_SHARED_SECRET: "legacy-key-must-not-skip-pairing",
            BRIDGE_API_URL: apiUrl,
            TS_NODE_PROJECT: path.resolve(__dirname, "../tsconfig.json"),
          },
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      let output = "";
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("Pairing CLI did not finish"));
      }, 8_000);
      child.stdout.on("data", (chunk) => {
        output += String(chunk);
      });
      child.stderr.on("data", (chunk) => {
        output += String(chunk);
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("close", (exitCode) => {
        clearTimeout(timer);
        resolve({ exitCode, output });
      });
      child.stdin.end(input);
    },
  );
}

async function fakeApi(
  handler: (
    url: string,
    body: Record<string, unknown>,
    response: http.ServerResponse,
  ) => void,
) {
  const server = http.createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => {
      body += String(chunk);
    });
    request.on("end", () => {
      response.setHeader("Content-Type", "application/json");
      handler(
        request.url || "",
        JSON.parse(body) as Record<string, unknown>,
        response,
      );
    });
  });
  server.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return {
    apiUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

test("pairing accepts the Admin activation link, requires HTTPS remotely, and keeps the code out of the server URL", () => {
  assert.deepEqual(
    parsePairingInput(`https://api.example/api/pos/bridge/pair#${code}`),
    { code, apiUrl: "https://api.example/api" },
  );
  assert.equal(
    parsePairingInput(code.toLowerCase()).apiUrl,
    "https://mgl-api.onrender.com/api",
  );
  for (const invalid of [
    "123456",
    `http://api.example/api/pos/bridge/pair#${code}`,
    `https://user:password@api.example/api/pos/bridge/pair#${code}`,
    `https://api.example/api/unrelated#${code}`,
  ])
    assert.throws(() => parsePairingInput(invalid));
});

test("pairing writes private credentials outside installer and preserves a stable device identity", async () => {
  const directory = temporary();
  let calls = 0;
  const api = await fakeApi((url, body, response) => {
    calls += 1;
    assert.equal(url, "/api/pos/bridge/pair");
    assert.equal(body.code, code);
    response.end(
      JSON.stringify({
        bindingId: "binding",
        registerId: "register",
        deviceId: body.deviceId,
        secret: "a".repeat(64),
      }),
    );
  });
  try {
    const deviceId = stableDeviceId(directory);
    const paired = await pairBridge(
      directory,
      `${api.apiUrl}/pos/bridge/pair#${code}`,
    );
    assert.equal(paired.deviceId, deviceId);
    assert.deepEqual(readBridgeCredentials(directory), paired);
    assert.equal(stableDeviceId(directory), deviceId);
    assert.equal(calls, 1);
    if (process.platform !== "win32")
      assert.equal(
        fs.statSync(path.join(directory, "bridge-credentials.json")).mode &
          0o777,
        0o600,
      );
    assert.ok(!fs.readdirSync(directory).some((name) => name.endsWith(".tmp")));
  } finally {
    await api.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("installer requires Admin pairing despite a legacy environment key and skips only valid paired credentials", async () => {
  const directory = temporary();
  let calls = 0;
  const api = await fakeApi((_url, body, response) => {
    calls += 1;
    response.end(
      JSON.stringify({
        bindingId: "binding",
        registerId: "register",
        deviceId: body.deviceId,
        secret: "e".repeat(64),
      }),
    );
  });
  try {
    const first = await installPairingCli(directory, api.apiUrl, `${code}\n`);
    assert.equal(first.exitCode, 0, first.output);
    assert.equal(
      calls,
      1,
      "an environment key must not bypass enrollment during a software upgrade",
    );
    assert.ok(readBridgeCredentials(directory));
    assert.ok(
      !first.output.includes("e".repeat(64)),
      "the CLI never prints the child key",
    );
    const second = await installPairingCli(directory, api.apiUrl, "");
    assert.equal(second.exitCode, 0, second.output);
    assert.equal(
      calls,
      1,
      "a valid existing pairing must not consume another code",
    );
    assert.ok(!second.output.includes("Connection link or code:"));
  } finally {
    await api.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("expired/used codes and malformed API responses never replace existing credentials", async () => {
  const directory = temporary();
  const existing: BridgeCredentials = {
    bindingId: "old",
    registerId: "old",
    deviceId: "0".repeat(32),
    secret: "a".repeat(64),
    apiUrl: "https://api.example/api",
  };
  writeBridgeCredentials(directory, existing);
  const api = await fakeApi((_url, _body, response) => {
    response.statusCode = 410;
    response.end(JSON.stringify({ message: "Code expired or already used" }));
  });
  try {
    await assert.rejects(pairBridge(directory, code, api.apiUrl), /expired/);
    assert.deepEqual(readBridgeCredentials(directory), existing);
  } finally {
    await api.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("unresolved financial evidence prevents pairing before any network exchange", async () => {
  const directory = temporary();
  fs.writeFileSync(path.join(directory, "terminal.lock"), "pending");
  try {
    assert.throws(() => assertPairingSafe(directory), /unresolved/);
    await assert.rejects(
      pairBridge(directory, code, "http://127.0.0.1:1/api"),
      /unresolved/,
    );
    assert.equal(readBridgeCredentials(directory), null);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("an enrolled setup can upgrade around a verified cancellation while preserving its journal", async () => {
  const directory = temporary();
  const apiUrl = "https://api.example/api";
  try {
    writeBridgeCredentials(directory, {
      bindingId: "binding",
      registerId: "register",
      deviceId: "f".repeat(32),
      secret: "e".repeat(64),
      apiUrl,
    });
    const id = "charge:cancelled";
    const lockfile = path.join(directory, "terminal.lock");
    const journalFile = path.join(directory, crypto.createHash("sha256").update(id).digest("hex") + ".json");
    const parsed = { code: -22, desc: "Гүйлгээ цуцлагдсан", terminal: "70012386", rrn: "" };
    const fingerprint = JSON.stringify({ attemptId: "cancelled", amount: 4368, terminalId: "terminal-1" });
    const saved = JSON.stringify({
      fingerprint,
      terminalId: "terminal-1",
      result: {
        status: "FAILED", provider: "ANDROID_PGW", code: "-22",
        data: null, amount: null, terminal: "70012386",
        raw: JSON.stringify(parsed), parsed,
      },
    });
    fs.writeFileSync(lockfile, id);
    fs.writeFileSync(journalFile, saved);
    for (const args of [["--check-upgrade"], ["--if-needed"]]) {
      const check = await installPairingCli(directory, apiUrl, "", args);
      assert.equal(check.exitCode, 0, check.output);
      assert.doesNotMatch(check.output, /Connection link or code/);
      assert.equal(fs.readFileSync(lockfile, "utf8"), id);
      assert.equal(fs.readFileSync(journalFile, "utf8"), saved);
    }
    const rePair = await installPairingCli(directory, apiUrl, "", []);
    assert.equal(rePair.exitCode, 1);
    const strict = await installPairingCli(directory, apiUrl, "", ["--check-safe"]);
    assert.equal(strict.exitCode, 1);
    const unknown = JSON.stringify({ fingerprint, terminalId: "terminal-1" });
    fs.writeFileSync(journalFile, unknown);
    const blocked = await installPairingCli(directory, apiUrl, "", ["--check-upgrade"]);
    assert.equal(blocked.exitCode, 1);
    assert.match(blocked.output, /unresolved operation/);
    assert.equal(fs.readFileSync(journalFile, "utf8"), unknown);
    assert.equal(fs.readFileSync(lockfile, "utf8"), id);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("a pairing response for another device cannot replace the local credential", async () => {
  const directory = temporary();
  const api = await fakeApi((_url, _body, response) => {
    response.end(
      JSON.stringify({
        bindingId: "binding",
        registerId: "register",
        deviceId: "another-device",
        secret: "a".repeat(64),
      }),
    );
  });
  try {
    await assert.rejects(
      pairBridge(directory, code, api.apiUrl),
      /Invalid pairing response/,
    );
    assert.equal(readBridgeCredentials(directory), null);
  } finally {
    await api.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("a heartbeat network outage retains the pairing and local evidence", async () => {
  const directory = temporary();
  const api = await fakeApi((_url, _body, response) => {
    response.statusCode = 503;
    response.end(JSON.stringify({ message: "Temporarily unavailable" }));
  });
  const credentials: BridgeCredentials = {
    bindingId: "binding",
    registerId: "register",
    deviceId: "c".repeat(32),
    secret: "d".repeat(64),
    apiUrl: api.apiUrl,
  };
  writeBridgeCredentials(directory, credentials);
  fs.writeFileSync(
    path.join(directory, "terminal.lock"),
    "unresolved-operation",
  );
  const heartbeat = new BridgeHeartbeat(directory, credentials, () => ({
    terminalConnected: false,
    serialPath: "COM3",
    terminalId: null,
    error: "Disconnected",
    hasUnresolvedOperation: true,
  }));
  try {
    assert.equal(await heartbeat.sendNow(), false);
    assert.equal(heartbeat.isRevoked(), false);
    assert.deepEqual(readBridgeCredentials(directory), credentials);
    assert.equal(
      fs.readFileSync(path.join(directory, "terminal.lock"), "utf8"),
      "unresolved-operation",
    );
  } finally {
    heartbeat.stop();
    await api.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("damaged credentials fail closed instead of silently falling back to a shared legacy key", () => {
  const directory = temporary();
  try {
    fs.writeFileSync(
      path.join(directory, "bridge-credentials.json"),
      '{"secret":"private-key",',
    );
    assert.throws(
      () => readBridgeCredentials(directory),
      (error) =>
        error instanceof Error && !error.message.includes("private-key"),
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("signed heartbeat includes cached health and revocation survives bridge restart", async () => {
  const directory = temporary();
  const secret = "b".repeat(64);
  let revoke = false;
  let calls = 0;
  const api = await fakeApi((url, body, response) => {
    calls += 1;
    assert.equal(url, "/api/pos/bridge/heartbeat");
    assert.equal(
      body.signature,
      crypto
        .createHmac("sha256", secret)
        .update(String(body.body))
        .digest("hex"),
    );
    const payload = JSON.parse(String(body.body)) as Record<string, unknown>;
    assert.equal(payload.bindingId, "binding");
    assert.equal(payload.deviceId, "c".repeat(32));
    assert.equal(payload.terminalId, "000001");
    assert.equal(payload.hasUnresolvedOperation, true);
    assert.equal(payload.raw, undefined);
    assert.equal(payload.pan, undefined);
    response.statusCode = revoke ? 401 : 200;
    response.end(JSON.stringify({ ok: !revoke }));
  });
  const credentials: BridgeCredentials = {
    bindingId: "binding",
    registerId: "register",
    deviceId: "c".repeat(32),
    secret,
    apiUrl: api.apiUrl,
  };
  const snapshot = () => ({
    terminalConnected: true,
    serialPath: "COM3",
    terminalId: "000001",
    error: null,
    hasUnresolvedOperation: true,
  });
  writeBridgeCredentials(directory, credentials);
  const heartbeat = new BridgeHeartbeat(directory, credentials, snapshot);
  try {
    assert.equal(await heartbeat.sendNow(), true);
    assert.equal(heartbeat.isRevoked(), false);
    revoke = true;
    assert.equal(await heartbeat.sendNow(), false);
    assert.equal(heartbeat.isRevoked(), true);
    const saved = readBridgeCredentials(directory)!;
    assert.equal(saved.revoked, true);
    const restarted = new BridgeHeartbeat(directory, saved, snapshot);
    assert.equal(await restarted.sendNow(), false);
    assert.equal(calls, 2);
  } finally {
    heartbeat.stop();
    await api.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("HTTP redirects and oversized payloads cannot leak pairing credentials to a different endpoint", async () => {
  const api = await fakeApi((_url, _body, response) => {
    response.statusCode = 302;
    response.setHeader("Location", "https://untrusted.example");
    response.end(JSON.stringify({ message: "redirect" }));
  });
  try {
    assert.equal(
      (await postJson(`${api.apiUrl}/pos/bridge/pair`, {})).status,
      302,
    );
  } finally {
    await api.close();
  }
  const large = await fakeApi((_url, _body, response) => {
    response.end(JSON.stringify({ data: "x".repeat(70_000) }));
  });
  try {
    await assert.rejects(
      postJson(`${large.apiUrl}/pos/bridge/pair`, {}),
      /maximum size/,
    );
  } finally {
    await large.close();
  }
});

test("an old process's 401 and display updates cannot overwrite a new pairing generation", async () => {
  const directory = temporary();
  const api = await fakeApi((_url, _body, response) => {
    // A new CLI completed its one-time exchange while the old process awaited its heartbeat.
    writeBridgeCredentials(directory, replacement);
    response.statusCode = 401;
    response.end(JSON.stringify({ message: "Old generation revoked" }));
  });
  const original: BridgeCredentials = {
    bindingId: "binding",
    registerId: "register",
    deviceId: "1".repeat(32),
    secret: "a".repeat(64),
    apiUrl: api.apiUrl,
  };
  const replacement: BridgeCredentials = {
    ...original,
    secret: "b".repeat(64),
  };
  writeBridgeCredentials(directory, original);
  const heartbeat = new BridgeHeartbeat(directory, original, () => ({
    terminalConnected: false,
    serialPath: null,
    terminalId: null,
    error: null,
    hasUnresolvedOperation: false,
  }));
  try {
    assert.equal(await heartbeat.sendNow(), false);
    assert.equal(heartbeat.isRevoked(), true);
    assert.deepEqual(readBridgeCredentials(directory), replacement);
    writeBridgeState(directory, original, {
      terminalId: "OLD_TERMINAL",
      revoked: true,
    });
    assert.deepEqual(readBridgeCredentials(directory), replacement);
  } finally {
    heartbeat.stop();
    await api.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
