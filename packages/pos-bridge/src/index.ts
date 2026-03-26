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
 *   (more providers can be added in src/providers/)
 */
import express, { type Request, type Response } from "express";
import crypto from "crypto";
import type { CardTerminalProvider, ChargeResult } from "./providers/provider.interface";
import { MockTerminalProvider } from "./providers/mock.provider";

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
  if (_req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json());

/* ─── Health check ──────────────────────────────────────────────── */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, provider: PROVIDER, port: PORT, signingEnabled: Boolean(BRIDGE_SHARED_SECRET) });
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
