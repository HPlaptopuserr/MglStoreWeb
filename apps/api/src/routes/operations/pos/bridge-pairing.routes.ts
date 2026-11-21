import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "@mgl/database";
import { requireAdminUser } from "./_shared";
import { BridgePairingError } from "../../../services/pos-bridge-keys";
import {
  claimBridgePairing,
  issueBridgePairing,
  publicBridgeStatus,
  recordBridgeHeartbeat,
  revokeBridgePairing,
} from "../../../services/pos-bridge-pairing";

const router: ExpressRouter = Router();
const claimLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Холбох оролдлого хэт олширсон байна. Түр хүлээнэ үү." },
});
const heartbeatLimit = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(
  ["/admin/pos-registers/:id/bridge", "/pos/bridge"],
  (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  },
);

const failure = (error: unknown) => ({
  status: error instanceof BridgePairingError ? error.status : 500,
  message:
    error instanceof BridgePairingError
      ? error.message
      : "PAX A35 холбоосын үйлдэл амжилтгүй боллоо",
});

router.get("/admin/pos-registers/:id/bridge", async (req, res) => {
  if (!(await requireAdminUser(req, res))) return;
  try {
    const binding = await prisma.posBridgeBinding.findUnique({
      where: { registerId: String(req.params.id) },
    });
    return res.json(publicBridgeStatus(binding));
  } catch (error: unknown) {
    const f = failure(error);
    return res.status(f.status).json({ message: f.message });
  }
});

router.post(
  "/admin/pos-registers/:id/bridge/pairing-code",
  async (req, res) => {
    const actor = await requireAdminUser(req, res);
    if (!actor) return;
    try {
      return res
        .status(201)
        .json(await issueBridgePairing(String(req.params.id), actor.id));
    } catch (error: unknown) {
      const f = failure(error);
      return res.status(f.status).json({ message: f.message });
    }
  },
);

router.delete("/admin/pos-registers/:id/bridge", async (req, res) => {
  const actor = await requireAdminUser(req, res);
  if (!actor) return;
  try {
    await revokeBridgePairing(String(req.params.id), actor.id);
    return res.status(204).end();
  } catch (error: unknown) {
    const f = failure(error);
    return res.status(f.status).json({ message: f.message });
  }
});

// This is a bootstrap exchange, not a cashier/browser login. The short-lived
// random capability is consumed atomically and is never stored as plaintext.
router.post("/pos/bridge/pair", claimLimit, async (req, res) => {
  try {
    if (
      typeof req.body?.code !== "string" ||
      typeof req.body?.deviceId !== "string"
    )
      throw new BridgePairingError(400, "Холбох код шаардлагатай");
    return res.json(await claimBridgePairing(req.body.code, req.body.deviceId));
  } catch (error: unknown) {
    const f = failure(error);
    return res.status(f.status).json({ message: f.message });
  }
});

router.post("/pos/bridge/heartbeat", heartbeatLimit, async (req, res) => {
  try {
    if (
      typeof req.body?.body !== "string" ||
      req.body.body.length > 8192 ||
      typeof req.body?.signature !== "string"
    )
      throw new BridgePairingError(400, "Invalid heartbeat");
    await recordBridgeHeartbeat(req.body.body, req.body.signature);
    return res.json({ ok: true });
  } catch (error: unknown) {
    const f = failure(error);
    return res.status(f.status).json({ message: f.message });
  }
});

export default router;
