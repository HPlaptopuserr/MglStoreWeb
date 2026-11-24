/**
 * MGL POS Bridge — local HTTP server that runs on each cashier machine.
 *
 * The MGL cloud API forwards card payment requests to this bridge via
 * the `terminalBridgeUrl` stored in PosRegister config.
 * The bridge translates requests to the card terminal's native protocol.
 *
 * Usage:
 *   BRIDGE_PORT=7420 BRIDGE_PROVIDER=mock node dist/index.js
 *
 * Supported BRIDGE_PROVIDER values:
 *   mock     — simulated approval (default, for dev/testing)
 *   android-pgw - Android PGW serial terminal bridge
 */
import express, { type Request, type Response } from "express";
import crypto from "crypto";
import fs from "fs";
import nodeHttp from "http";
import nodeHttps from "https";
import path from "path";
import { bridgeDataDirectory, loadBridgeEnv } from "./bridge-config";
import { readBridgeCredentials, writeBridgeState } from "./bridge-pairing";
import { BridgeHeartbeat, type BridgeHealthSnapshot } from "./bridge-heartbeat";
import { OperationJournal } from "./operation-journal";
import type { CardTerminalProvider, ChargeResult, TerminalCommand } from "./providers/provider.interface";
import { AndroidPgwProvider, normalizeAndroidPgwCancellation } from "./providers/android-pgw.provider";
import { MockTerminalProvider } from "./providers/mock.provider";

loadBridgeEnv();

const dataDirectory = bridgeDataDirectory();
const pairedCredentials = readBridgeCredentials(dataDirectory);
const PORT = parseInt(process.env.BRIDGE_PORT ?? "7420", 10);
const PROVIDER = pairedCredentials ? "android-pgw" : (process.env.BRIDGE_PROVIDER ?? "mock").toLowerCase();
const BRIDGE_SHARED_SECRET = pairedCredentials?.secret || String(process.env.BRIDGE_SHARED_SECRET ?? "").trim();

const positiveIntEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const boolEnv = (name: string, fallback = true) => {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "y", "on"].includes(value);
};

const BRIDGE_STARTUP_HEALTH_CHECK = boolEnv("BRIDGE_STARTUP_HEALTH_CHECK", true);
const BRIDGE_STARTUP_HEALTH_DELAY_MS = positiveIntEnv("BRIDGE_STARTUP_HEALTH_DELAY_MS", 3_000);
const BRIDGE_STARTUP_HEALTH_RETRY_MS = positiveIntEnv("BRIDGE_STARTUP_HEALTH_RETRY_MS", 5_000);
const BRIDGE_STARTUP_HEALTH_MAX_ATTEMPTS = positiveIntEnv("BRIDGE_STARTUP_HEALTH_MAX_ATTEMPTS", 60);
const BRIDGE_HEALTH_KEEPALIVE_MS = positiveIntEnv("BRIDGE_HEALTH_KEEPALIVE_MS", 60_000);
const EBARIMT_INFO_API_URL = String(process.env.EBARIMT_INFO_API_URL || "https://api.ebarimt.mn").trim();
const EBARIMT_TIN_LOOKUP_TIMEOUT_MS = positiveIntEnv("EBARIMT_TIN_LOOKUP_TIMEOUT_MS", 10_000);

type HttpTextResult = {
  statusCode: number;
  contentType: string;
  body: string;
};

type TinLookupResponse = {
  status?: number;
  msg?: string;
  data?: string | number | null;
};

type TaxpayerInfoResponse = {
  status?: number;
  msg?: string;
  data?: {
    name?: string | null;
    found?: boolean;
  } | null;
};

const signPayload = (payload: string) =>
  crypto.createHmac("sha256", BRIDGE_SHARED_SECRET).update(payload).digest("hex");

const timingSafeEqualHex = (provided: string, expected: string): boolean => {
  if (!provided || !expected) return false;
  if (!/^[0-9a-f]+$/i.test(provided) || !/^[0-9a-f]+$/i.test(expected)) return false;
  const providedBuf = Buffer.from(provided, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
};

function buildInfoApiUrl(rawBaseUrl: string, endpointName: string) {
  const trimmed = rawBaseUrl.trim().replace(/\/+$/, "");
  const configured = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const baseUrl = configured.includes("/api/info/check/")
    ? configured.replace(/\/api\/info\/check\/[^/?#]+.*$/i, "")
    : configured;
  return new URL(`${baseUrl}/api/info/check/${endpointName}`);
}

function buildTinLookupUrl(rawBaseUrl: string, regNo: string) {
  const url = buildInfoApiUrl(rawBaseUrl, "getTinInfo");
  url.searchParams.set("regNo", regNo);
  return url;
}

function buildTaxpayerInfoUrl(rawBaseUrl: string, tin: string) {
  const url = buildInfoApiUrl(rawBaseUrl, "getInfo");
  url.searchParams.set("tin", tin);
  return url;
}

function requestText(url: URL, timeoutMs: number): Promise<HttpTextResult> {
  return new Promise((resolve, reject) => {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      reject(new Error(`Unsupported protocol: ${url.protocol}`));
      return;
    }

    const transport = url.protocol === "http:" ? nodeHttp : nodeHttps;
    const req = transport.request(
      url,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      },
      (response) => {
        response.setEncoding("utf8");
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({
            statusCode: response.statusCode || 0,
            contentType: String(response.headers["content-type"] || "application/json"),
            body,
          });
        });
      },
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`request timeout after ${timeoutMs}ms`));
    });
    req.on("error", reject);
    req.end();
  });
}

function buildProvider(): CardTerminalProvider {
  switch (PROVIDER) {
    case "android-pgw":
    case "android_pgw":
      console.log("[bridge] Using AndroidPgwProvider");
      return new AndroidPgwProvider();
    case "mock":
      console.log("[bridge] Using MockTerminalProvider — replace with hardware SDK for production");
      return new MockTerminalProvider();
    default: throw new Error(`Unsupported BRIDGE_PROVIDER: ${PROVIDER}`);
  }
}

const provider = buildProvider();
const app = express();
// Outside the installer directory so upgrades cannot delete payment evidence.
const journal = new OperationJournal(dataDirectory, (id, entry) => {
  const result = entry.result;
  if (PROVIDER !== "android-pgw" || !id.startsWith("charge:")) return result;
  let request: unknown;
  try { request = JSON.parse(entry.fingerprint); } catch { return result; }
  if (!request || typeof request !== "object" ||
      !("attemptId" in request) || typeof request.attemptId !== "string" ||
      id !== `charge:${request.attemptId}` ||
      !("amount" in request) || typeof request.amount !== "number" ||
      !Number.isFinite(request.amount) || request.amount <= 0 ||
      !("terminalId" in request) || typeof request.terminalId !== "string" ||
      request.terminalId !== entry.terminalId) return result;
  return normalizeAndroidPgwCancellation(result, {
    attemptId: request.attemptId, amount: request.amount, terminalId: request.terminalId,
  // Historical journals do not record the wire amount multiplier. Any present
  // terminal amount therefore remains unresolved rather than assuming x100.
  }, Number.NaN);
});
try {
  journal.recoverStoredOperation();
} catch {
  console.warn("[bridge] Stored operation could not be reconciled; terminal reservation retained.");
}
let cachedHealth: BridgeHealthSnapshot = { terminalConnected: false, serialPath: null, terminalId: pairedCredentials?.terminalId || null,
  error: "Terminal health has not been checked", hasUnresolvedOperation: false };
const heartbeat = pairedCredentials ? new BridgeHeartbeat(dataDirectory, pairedCredentials, () => ({ ...cachedHealth,
  hasUnresolvedOperation: fs.existsSync(path.join(dataDirectory, "terminal.lock")),
})) : null;
const isPairingRevoked = () => heartbeat?.isRevoked() === true;
const rememberHealth = (health: { ok: boolean; message?: string; serialPath?: string }) => {
  cachedHealth = { ...cachedHealth, terminalConnected: health.ok, serialPath: health.serialPath || cachedHealth.serialPath,
    error: health.ok ? null : health.message || "Terminal is not connected" };
};
const rememberResult = (result: ChargeResult) => {
  if (result.status === "FAILED") cachedHealth.error = result.message || "Original terminal operation requires verification";
  const terminalId = typeof result.terminal === "string" ? result.terminal : null;
  if (terminalId && /^[A-Za-z0-9_-]{1,64}$/.test(terminalId)) {
    cachedHealth.terminalId = terminalId;
    if (pairedCredentials && pairedCredentials.terminalId !== terminalId) {
      pairedCredentials.terminalId = terminalId;
      try { writeBridgeState(dataDirectory, pairedCredentials, { terminalId, revoked: isPairingRevoked() }); }
      catch { console.warn("[bridge] Could not persist terminal display metadata; payment evidence is retained in its journal."); }
    }
  }
};
let providerHealthInFlight = false;
let providerHealthKeepAliveStarted = false;

// Allow admin/vendor web apps to call local bridge health and charge endpoints.
app.use((_req: Request, res: Response, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,x-mgl-bridge-signature");
  res.header("Access-Control-Allow-Private-Network", "true");
  res.header("Access-Control-Expose-Headers", "x-mgl-bridge-signature");
  if (_req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json());

// Capability checks never wait behind an in-flight serial transaction.
app.get("/capabilities", (_req: Request, res: Response) => {
  res.json({ ok: true, provider: PROVIDER, protocolVersion: 2, signingEnabled: Boolean(BRIDGE_SHARED_SECRET) && !isPairingRevoked() });
});

/* ─── Health check ──────────────────────────────────────────────── */
app.get("/health", async (_req: Request, res: Response) => {
  const providerHealth = provider.health ? await provider.health() : { ok: true };
  rememberHealth(providerHealth);
  res.status(providerHealth.ok ? 200 : 503).json({
    ...providerHealth,
    ok: providerHealth.ok,
    provider: PROVIDER,
    port: PORT,
    signingEnabled: Boolean(BRIDGE_SHARED_SECRET) && !isPairingRevoked(),
    protocolVersion: 2,
  });
});

/* ─── Charge ────────────────────────────────────────────────────── */
/* eBarimt TIN lookup */
app.get("/ebarimt/tin", async (req: Request, res: Response) => {
  const regNo = String(req.query.regNo || "").replace(/\D/g, "");
  if (!/^\d{7}$/.test(regNo)) {
    res.status(400).json({ message: "regNo must be 7 digits" });
    return;
  }

  try {
    const upstream = await requestText(
      buildTinLookupUrl(EBARIMT_INFO_API_URL, regNo),
      EBARIMT_TIN_LOOKUP_TIMEOUT_MS,
    );

    let payload: TinLookupResponse;
    try {
      payload = JSON.parse(upstream.body) as TinLookupResponse;
    } catch {
      res.status(502).json({
        message: `eBarimt TIN lookup returned non-JSON (HTTP ${upstream.statusCode})`,
      });
      return;
    }

    const tin = String(payload.data ?? "").replace(/\D/g, "");
    if (
      upstream.statusCode < 200 ||
      upstream.statusCode >= 300 ||
      payload.status !== 200 ||
      !/^\d{11,14}$/.test(tin)
    ) {
      res.status(404).json({
        message: payload.msg || `TIN not found for regNo ${regNo}`,
      });
      return;
    }

    const infoUpstream = await requestText(
      buildTaxpayerInfoUrl(EBARIMT_INFO_API_URL, tin),
      EBARIMT_TIN_LOOKUP_TIMEOUT_MS,
    );
    let infoPayload: TaxpayerInfoResponse;
    try {
      infoPayload = JSON.parse(infoUpstream.body) as TaxpayerInfoResponse;
    } catch {
      res.status(502).json({
        message: `Organization name lookup returned non-JSON (HTTP ${infoUpstream.statusCode})`,
      });
      return;
    }

    const name = String(infoPayload.data?.name ?? "").trim();
    if (
      infoUpstream.statusCode < 200 ||
      infoUpstream.statusCode >= 300 ||
      infoPayload.status !== 200 ||
      infoPayload.data?.found === false ||
      !name
    ) {
      res.status(404).json({
        message: infoPayload.msg || `Organization name not found for TIN ${tin}`,
      });
      return;
    }

    res.json({ regNo, tin, name });
  } catch (error) {
    res.status(502).json({
      message: "eBarimt TIN lookup failed",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

function authenticateBridge(req: Request, res: Response, payload: string): boolean {
  if (isPairingRevoked() && req.path !== "/charge/status") {
    res.status(503).json({ message: "Pairing revoked; reconnect from Admin" });
    return false;
  }
  if (PROVIDER !== "mock" && !BRIDGE_SHARED_SECRET) {
    res.status(503).json({ message: "BRIDGE_SHARED_SECRET is required for terminal operations" });
    return false;
  }
  if (BRIDGE_SHARED_SECRET && !timingSafeEqualHex(String(req.header("x-mgl-bridge-signature") || ""), signPayload(payload))) {
    res.status(401).json({ message: "Bridge request signature хүчингүй байна" });
    return false;
  }
  return true;
}

function respondSigned(res: Response, result: ChargeResult) {
  if (BRIDGE_SHARED_SECRET) res.setHeader("x-mgl-bridge-signature", signPayload(JSON.stringify(result)));
  res.json(result);
}

app.post(["/charge", "/charge/status"], async (req: Request, res: Response) => {
  const body = (req.body || {}) as Record<string, unknown>;
  const { attemptId, amount, terminalId } = body;
  if (typeof attemptId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(attemptId) ||
      typeof terminalId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(terminalId) ||
      typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 ||
      !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) {
    res.status(400).json({ message: "Invalid attemptId, amount or terminalId" });
    return;
  }
  const payload = JSON.stringify({ attemptId, amount, terminalId });
  if (!authenticateBridge(req, res, payload)) return;
  try {
    const saved = journal.lookup(`charge:${attemptId}`, payload);
    if (req.path.endsWith("/status")) {
      if (!saved) { res.status(404).json({ message: "No local operation recorded" }); return; }
      respondSigned(res, { ...saved, attemptId, requestAmount: amount, requestedTerminalId: terminalId, provider: PROVIDER === "mock" ? "MOCK" : "ANDROID_PGW" });
      return;
    }
    const result = await journal.execute(`charge:${attemptId}`, payload, terminalId, async () => {
      const health = provider.health ? await provider.health() : { ok: true };
      rememberHealth(health);
      if (!health.ok) return { status: "DECLINED", message: health.message || "Terminal not connected; payment not started" };
      return provider.charge({ attemptId, amount, terminalId });
    });
    rememberResult(result);
    respondSigned(res, { ...result, attemptId, requestAmount: amount, requestedTerminalId: terminalId, provider: PROVIDER === "mock" ? "MOCK" : "ANDROID_PGW" });
  } catch (error: unknown) {
    res.status(409).json({ message: error instanceof Error ? error.message : "Bridge journal unavailable" });
  }
});

app.post("/terminal/command", async (req: Request, res: Response) => {
  const { operation, requestId, terminalId, rrn, attemptId } = (req.body || {}) as Record<string, unknown>;
  if (!["void", "settlement", "cancel"].includes(String(operation)) ||
      typeof requestId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(requestId) ||
      typeof terminalId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(terminalId) ||
      (operation === "void" && (typeof rrn !== "string" || !/^\d{1,32}$/.test(rrn))) ||
      (operation === "cancel" && typeof attemptId !== "string")) {
    res.status(400).json({ message: "Invalid terminal command" }); return;
  }
  const command: TerminalCommand = {
    operation: operation as TerminalCommand["operation"], requestId, terminalId,
    ...(operation === "void" ? { rrn: rrn as string } : {}),
    ...(operation === "cancel" ? { attemptId: attemptId as string } : {}),
  };
  const payload = JSON.stringify(command);
  if (!authenticateBridge(req, res, payload)) return;
  if (!provider.command) { res.status(422).json({ message: "Terminal commands unsupported" }); return; }
  try {
    const invoke = () => provider.command!(command);
    const result = operation === "cancel" ? await invoke()
      : await journal.execute(`command:${requestId}`, payload, terminalId, invoke);
    respondSigned(res, { ...result, command });
  } catch (error: unknown) {
    res.status(409).json({ message: error instanceof Error ? error.message : "Terminal command unresolved" });
  }
});

/* ─── Start ─────────────────────────────────────────────────────── */
async function warmUpProviderHealth(reason: string) {
  if (!provider.health) return true;
  if (providerHealthInFlight) return false;

  providerHealthInFlight = true;
  try {
    const health = await provider.health();
    rememberHealth(health);
    const serialPath = "serialPath" in health && health.serialPath ? ` (${health.serialPath})` : "";
    if (health.ok) {
      console.log(`[bridge] ${reason} health ok${serialPath}: ${health.message || "connected"}`);
      return true;
    }

    console.warn(`[bridge] ${reason} health not ready${serialPath}: ${health.message || "not connected"}`);
    return false;
  } catch (error) {
    console.warn(`[bridge] ${reason} health failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    providerHealthInFlight = false;
  }
}

function startProviderHealthKeepAlive() {
  if (!provider.health || providerHealthKeepAliveStarted || BRIDGE_HEALTH_KEEPALIVE_MS <= 0) return;
  providerHealthKeepAliveStarted = true;
  setInterval(() => {
    void warmUpProviderHealth("keep-alive");
  }, BRIDGE_HEALTH_KEEPALIVE_MS);
}

function startProviderHealthWarmUp() {
  if (!provider.health || !BRIDGE_STARTUP_HEALTH_CHECK) return;

  let attempts = 0;
  const run = async () => {
    attempts += 1;
    const ok = await warmUpProviderHealth(`startup ${attempts}/${BRIDGE_STARTUP_HEALTH_MAX_ATTEMPTS}`);
    if (ok) {
      startProviderHealthKeepAlive();
      return;
    }

    if (attempts < BRIDGE_STARTUP_HEALTH_MAX_ATTEMPTS) {
      setTimeout(run, BRIDGE_STARTUP_HEALTH_RETRY_MS);
      return;
    }

    console.warn("[bridge] Startup health warm-up gave up; keep-alive checks will continue in the background.");
    startProviderHealthKeepAlive();
  };

  setTimeout(run, BRIDGE_STARTUP_HEALTH_DELAY_MS);
}

app.listen(PORT, "127.0.0.1", () => {
  console.log(`[bridge] Listening on http://127.0.0.1:${PORT}`);
  startProviderHealthWarmUp();
  heartbeat?.start();
});
