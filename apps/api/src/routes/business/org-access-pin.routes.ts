import { Router, type Request, type Router as ExpressRouter } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import bcrypt from "bcryptjs";
import { prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import {
  canUseAccessPinForScope,
  isValidAccessPin,
  parseProtectedSectionScope,
} from "./org-access-pin";

const router: ExpressRouter = Router();

const pinAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req: Request) => {
    const user = (req as any).user as AuthPayload | undefined;
    const networkKey = ipKeyGenerator(
      req.ip || req.socket.remoteAddress || "",
    );
    return `${networkKey}:${user?.userId || "anonymous"}`;
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "PIN кодыг олон удаа буруу орууллаа. 15 минутын дараа дахин оролдоно уу.",
  },
});

const requestedOrganizationId = (req: Request) =>
  String(
    req.method === "GET"
      ? req.query.organizationId || ""
      : req.body?.organizationId || "",
  ).trim();

async function getOrganizationActor(req: Request) {
  const user = (req as any).user as AuthPayload;
  const organizationId = requestedOrganizationId(req);

  if (!organizationId || user.organizationId !== organizationId) return null;

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: user.userId,
      organizationId,
      isActive: true,
      deletedAt: null,
      organization: { status: "ACTIVE", deletedAt: null },
    },
    select: { role: true, capabilities: true },
  });
  if (!membership) return null;

  return {
    organizationId,
    userId: user.userId,
    platformRole: user.role,
    orgRole: membership.role,
    capabilities: membership.capabilities,
  };
}

router.get("/org/access-pin/status", requireAuth, async (req, res) => {
  try {
    const actor = await getOrganizationActor(req);
    if (!actor) {
      return res.status(403).json({ message: "Байгууллагын эрх хүрэлцэхгүй байна." });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: { accessPinHash: true, accessPinUpdatedAt: true },
    });
    if (!organization) {
      return res.status(404).json({ message: "Байгууллага олдсонгүй." });
    }

    res.set("Cache-Control", "no-store");
    return res.json({
      configured: Boolean(organization.accessPinHash),
      updatedAt: organization.accessPinUpdatedAt?.toISOString() || null,
      canManage: actor.orgRole === "OWNER",
    });
  } catch (error) {
    console.error("GET /org/access-pin/status error", error);
    return res.status(500).json({ message: "PIN тохиргоог уншиж чадсангүй." });
  }
});

router.put("/org/access-pin", requireAuth, async (req, res) => {
  try {
    const actor = await getOrganizationActor(req);
    if (!actor) {
      return res.status(403).json({ message: "Байгууллагын эрх хүрэлцэхгүй байна." });
    }
    if (actor.orgRole !== "OWNER") {
      return res
        .status(403)
        .json({ message: "Зөвхөн байгууллагын owner PIN код тохируулна." });
    }

    const pin = req.body?.pin;
    if (!isValidAccessPin(pin)) {
      return res
        .status(400)
        .json({ message: "PIN код яг 4 оронтой тоо байна." });
    }

    const accessPinHash = await bcrypt.hash(pin, 12);
    const organization = await prisma.organization.update({
      where: { id: actor.organizationId },
      data: { accessPinHash, accessPinUpdatedAt: new Date() },
      select: { accessPinUpdatedAt: true },
    });

    return res.json({
      configured: true,
      updatedAt: organization.accessPinUpdatedAt?.toISOString() || null,
      message: "4 оронтой PIN код хадгалагдлаа.",
    });
  } catch (error) {
    console.error("PUT /org/access-pin error", error);
    return res.status(500).json({ message: "PIN код хадгалж чадсангүй." });
  }
});

router.delete("/org/access-pin", requireAuth, async (req, res) => {
  try {
    const actor = await getOrganizationActor(req);
    if (!actor) {
      return res.status(403).json({ message: "Байгууллагын эрх хүрэлцэхгүй байна." });
    }
    if (actor.orgRole !== "OWNER") {
      return res
        .status(403)
        .json({ message: "Зөвхөн байгууллагын owner PIN код устгана." });
    }

    await prisma.organization.update({
      where: { id: actor.organizationId },
      data: { accessPinHash: null, accessPinUpdatedAt: null },
    });
    return res.json({ configured: false, updatedAt: null });
  } catch (error) {
    console.error("DELETE /org/access-pin error", error);
    return res.status(500).json({ message: "PIN код устгаж чадсангүй." });
  }
});

router.post(
  "/org/access-pin/verify",
  requireAuth,
  pinAttemptLimiter,
  async (req, res) => {
    try {
      const actor = await getOrganizationActor(req);
      if (!actor) {
        return res.status(403).json({ message: "Байгууллагын эрх хүрэлцэхгүй байна." });
      }

      const scope = parseProtectedSectionScope(req.body?.scope);
      if (!scope) {
        return res.status(400).json({ message: "Хамгаалалттай хэсэг буруу байна." });
      }
      if (!canUseAccessPinForScope(scope, actor)) {
        return res.status(403).json({ message: "Энэ хэсэгт нэвтрэх эрхгүй байна." });
      }

      const pin = req.body?.pin;
      if (!isValidAccessPin(pin)) {
        return res
          .status(400)
          .json({ message: "PIN код яг 4 оронтой тоо байна." });
      }

      const organization = await prisma.organization.findUnique({
        where: { id: actor.organizationId },
        select: { accessPinHash: true },
      });
      if (!organization?.accessPinHash) {
        return res.status(409).json({
          code: "ACCESS_PIN_NOT_CONFIGURED",
          message: "Owner хамгаалалтын PIN код тохируулаагүй байна.",
        });
      }

      const matches = await bcrypt.compare(pin, organization.accessPinHash);
      if (!matches) {
        return res.status(422).json({
          code: "ACCESS_PIN_INCORRECT",
          message: "PIN код буруу байна.",
        });
      }

      res.set("Cache-Control", "no-store");
      return res.json({ verified: true });
    } catch (error) {
      console.error("POST /org/access-pin/verify error", error);
      return res.status(500).json({ message: "PIN код шалгаж чадсангүй." });
    }
  },
);

export default router;
