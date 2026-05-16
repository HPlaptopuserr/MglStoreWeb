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
import path from "path";
import type { CardTerminalProvider, ChargeResult } from "./providers/provider.interface";
import { AndroidPgwProvider } from "./providers/android-pgw.provider";
import { MockTerminalProvider } from "./providers/mock.provider";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function loadBridgeEnv() {
  const envPaths = [
    path.resolve(__dirname, "../../../.env"),
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, "../bridge.env"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "bridge.env"),
  ];

  for (const envPath of [...new Set(envPaths)]) {
    loadEnvFile(envPath);
  }
}

loadBridgeEnv();

const PORT = parseInt(process.env.BRIDGE_PORT ?? "7420", 10);
const PROVIDER = (process.env.BRIDGE_PROVIDER ?? "mock").toLowerCase();
const BRIDGE_SHARED_SECRET = String(process.env.BRIDGE_SHARED_SECRET ?? "").trim();

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

function buildProvider(): CardTerminalProvider {
  switch (PROVIDER) {
    case "android-pgw":
    case "android_pgw":
      console.log("[bridge] Using AndroidPgwProvider");
      return new AndroidPgwProvider();
    case "mock":
    default:
      console.log("[bridge] Using MockTerminalProvider — replace with hardware SDK for production");
      return new MockTerminalProvider();
  }
}

const provider = buildProvider();
const app = express();

// Allow admin/vendor web apps to call local bridge health and charge endpoints.
app.use((_req: Request, res: Response, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,x-mgl-bridge-signature");
  res.header("Access-Control-Allow-Private-Network", "true");
  if (_req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json());

/* ─── Health check ──────────────────────────────────────────────── */
app.get("/health", async (_req: Request, res: Response) => {
  const providerHealth = provider.health ? await provider.health() : { ok: true };
  res.status(providerHealth.ok ? 200 : 503).json({
    ...providerHealth,
    ok: providerHealth.ok,
    provider: PROVIDER,
    port: PORT,
    signingEnabled: Boolean(BRIDGE_SHARED_SECRET),
  });
});

/* ─── Charge ────────────────────────────────────────────────────── */
app.post("/charge", async (req: Request, res: Response) => {
  const { attemptId, amount, terminalId } = req.body as {
    attemptId?: string;
    amount?: number;
    terminalId?: string;
  };

  if (!attemptId || !amount || !terminalId) {
    res.status(400).json({ status: "FAILED", message: "attemptId, amount, terminalId шаардлагатай" });
    return;
  }

  const safeAmount = Number(amount);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    res.status(400).json({ status: "FAILED", message: "amount буруу байна" });
    return;
  }

  if (BRIDGE_SHARED_SECRET) {
    const providedSignature = String(req.header("x-mgl-bridge-signature") || "").trim();
    const expectedSignature = signPayload(JSON.stringify({ attemptId, amount, terminalId }));
    if (!timingSafeEqualHex(providedSignature, expectedSignature)) {
      res.status(401).json({ status: "FAILED", message: "Bridge request signature хүчингүй байна" });
      return;
    }
  }

  try {
    const result: ChargeResult = await provider.charge({
      attemptId: String(attemptId),
      amount: safeAmount,
      terminalId: String(terminalId),
    });
    if (BRIDGE_SHARED_SECRET) {
      res.setHeader("x-mgl-bridge-signature", signPayload(JSON.stringify(result)));
    }
    res.json(result);
  } catch (err) {
    console.error("[bridge] charge error", err);
    res.status(500).json({ status: "FAILED", message: "Terminal холболтод алдаа гарлаа" });
  }
});

/* ─── Start ─────────────────────────────────────────────────────── */
app.listen(PORT, "127.0.0.1", () => {
  console.log(`[bridge] Listening on http://127.0.0.1:${PORT}`);
});
