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
const EBARIMT_INFO_API_URL = String(process.env.EBARIMT_INFO_API_URL || "https://api.ebarimt.mn").trim();
const EBARIMT_TIN_LOOKUP_TIMEOUT_MS = positiveIntEnv("EBARIMT_TIN_LOOKUP_TIMEOUT_MS", 10_000);

type HttpTextResult = {
  statusCode: number;
  body: string;
};

type TinLookupResponse = {
  status?: number;
  msg?: string;
  data?: string | number | null;
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

function positiveIntEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function buildTinLookupUrl(rawBaseUrl: string, regNo: string) {
  const trimmed = rawBaseUrl.trim().replace(/\/+$/, "");
  const configured = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const endpoint = configured.includes("/api/info/check/getTinInfo")
    ? configured
    : `${configured}/api/info/check/getTinInfo`;
  const url = new URL(endpoint);
  url.searchParams.set("regNo", regNo);
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

    res.json({ regNo, tin });
  } catch (error) {
    res.status(502).json({
      message: "eBarimt TIN lookup failed",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

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
