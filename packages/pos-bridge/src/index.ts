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
import type { CardTerminalProvider, ChargeResult } from "./providers/provider.interface";
import { MockTerminalProvider } from "./providers/mock.provider";

const PORT = parseInt(process.env.BRIDGE_PORT ?? "7420", 10);
const PROVIDER = (process.env.BRIDGE_PROVIDER ?? "mock").toLowerCase();

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
app.use(express.json());

/* ─── Health check ──────────────────────────────────────────────── */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, provider: PROVIDER, port: PORT });
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

  try {
    const result: ChargeResult = await provider.charge({
      attemptId: String(attemptId),
      amount: safeAmount,
      terminalId: String(terminalId),
    });
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
