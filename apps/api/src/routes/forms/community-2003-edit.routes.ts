import { Router, type Router as ExpressRouter, type Request } from "express";
import { rateLimit } from "express-rate-limit";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { normalizePhoneNumber } from "../../utils/phone-number";
import { parseCommunityResponse } from "./community-2003";
import {
  createVerifyMnSession,
  getVerifyMnSessionStatus,
  type VerifyMnSessionResponse,
  type VerifyMnStatusResponse,
} from "../../services/verify-mn.service";

interface VerificationProvider {
  createSession: (phone: string) => Promise<VerifyMnSessionResponse>;
  getStatus: (sessionId: string) => Promise<VerifyMnStatusResponse>;
}
const verification: VerificationProvider = {
  createSession: (phone) =>
    createVerifyMnSession(phone, {
      allowDevelopmentFallback: false,
      requireCallback: false,
    }),
  getStatus: (sessionId) =>
    getVerifyMnSessionStatus(sessionId, { allowDevelopmentFallback: false }),
};
const audience = "community-2003-editor";
function secret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production")
    throw new Error("JWT_SECRET is required");
  return "dev-secret-change-me";
}
function sign(payload: Record<string, string>, expiresIn: number) {
  return jwt.sign(payload, secret(), {
    algorithm: "HS256",
    audience,
    expiresIn,
  });
}
function readToken(value: unknown, purpose: string): jwt.JwtPayload | null {
  if (typeof value !== "string") return null;
  try {
    const payload = jwt.verify(value, secret(), {
      algorithms: ["HS256"],
      audience,
    });
    return typeof payload === "object" && payload.purpose === purpose
      ? payload
      : null;
  } catch {
    return null;
  }
}

export function createCommunityEditRouter(
  provider: VerificationProvider = verification,
): ExpressRouter {
  const router = Router();
  router.use(
    "/forms/2003/edit",
    rateLimit({
      windowMs: 60_000,
      limit: 10,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
  );
  router.get("/forms/2003/edit/mine", requireAuth, async (req, res) => {
    const actor = (req as Request & { user?: AuthPayload }).user;
    if (!actor) return res.status(401).json({ message: "Нэвтэрнэ үү." });
    try {
      const user = await prisma.user.findFirst({
        where: { id: actor.userId, isActive: true, deletedAt: null },
        select: { id: true, profile: { select: { phoneNumber: true } } },
      });
      if (!user) return res.status(401).json({ message: "Дахин нэвтэрнэ үү." });
      const phone = normalizePhoneNumber(user.profile?.phoneNumber);
      const rows = await prisma.formResponse.findMany({
        where: {
          form: { slug: "2003", isActive: true },
          OR: [
            { data: { path: ["ownerUserId"], equals: user.id } },
            ...(phone && /^[0-9]{8}$/.test(phone)
              ? [{ data: { path: ["phone"], equals: phone } }]
              : []),
          ],
        },
        select: { id: true, data: true },
        orderBy: { submittedAt: "desc" },
      });
      const responses = rows.flatMap((row) => {
        if (
          !row.data ||
          typeof row.data !== "object" ||
          Array.isArray(row.data)
        )
          return [];
        const owner = row.data.ownerUserId;
        // Account ownership survives later changes to the public contact phone.
        if (owner ? owner !== user.id : row.data.phone !== phone) return [];
        const data = parseCommunityResponse(row.data);
        return data
          ? [
              {
                id: row.id,
                data,
                editToken: sign(
                  { purpose: "edit", responseId: row.id, userId: user.id },
                  900,
                ),
              },
            ]
          : [];
      });
      res.setHeader("Cache-Control", "no-store");
      return res.json({ responses });
    } catch {
      return res
        .status(500)
        .json({ message: "Танилцуулгаа ачаалж чадсангүй. Дахин оролдоно уу." });
    }
  });
  router.post("/forms/2003/edit/start", async (req, res) => {
    const phone: unknown = req.body?.phone;
    if (typeof phone !== "string" || !/^[0-9]{8}$/.test(phone))
      return res
        .status(400)
        .json({ message: "8 оронтой утасны дугаар оруулна уу." });
    try {
      // Do not reveal whether a phone has a registration before verification.
      const session = await provider.createSession(phone);
      const challengeToken = sign(
        { purpose: "verify", phone, sessionId: session.sessionId },
        600,
      );
      res.setHeader("Cache-Control", "no-store");
      return res.json({ session, challengeToken });
    } catch {
      return res.status(503).json({
        message: "Баталгаажуулалт эхлүүлэхэд алдаа гарлаа. Дахин оролдоно уу.",
      });
    }
  });
  router.post("/forms/2003/edit/verify", async (req, res) => {
    const challenge = readToken(req.body?.challengeToken, "verify");
    if (
      !challenge ||
      typeof challenge.phone !== "string" ||
      typeof challenge.sessionId !== "string"
    )
      return res.status(401).json({
        message: "Баталгаажуулах хугацаа дууссан. Дахин эхлүүлнэ үү.",
      });
    try {
      const status = await provider.getStatus(challenge.sessionId);
      if (
        status.sessionStatus !== "VERIFIED" ||
        normalizePhoneNumber(status.phone) !== challenge.phone
      )
        return res.status(403).json({
          message:
            "SMS баталгаажуулалт хараахан ирээгүй байна. Дахин шалгана уу.",
        });
      const rows = await prisma.formResponse.findMany({
        where: {
          form: { slug: "2003", isActive: true },
          data: { path: ["phone"], equals: challenge.phone },
        },
        select: { id: true, data: true },
        orderBy: { submittedAt: "desc" },
      });
      const responses = rows.flatMap((row) => {
        const data = parseCommunityResponse(row.data);
        return data
          ? [
              {
                id: row.id,
                data,
                editToken: sign({ purpose: "edit", responseId: row.id }, 900),
              },
            ]
          : [];
      });
      res.setHeader("Cache-Control", "no-store");
      return res.json({ responses });
    } catch {
      return res
        .status(503)
        .json({ message: "Мэдээллээ ачаалж чадсангүй. Дахин оролдоно уу." });
    }
  });
  router.put("/forms/2003/edit/:id", async (req, res) => {
    const bearer = req.headers.authorization?.split(" ");
    const token =
      bearer?.[0] === "Bearer" ? readToken(bearer[1], "edit") : null;
    if (!token || token.responseId !== req.params.id)
      return res
        .status(401)
        .json({ message: "Засах эрх дууссан. Утсаа дахин баталгаажуулна уу." });
    const data = parseCommunityResponse(req.body?.data);
    if (!data)
      return res
        .status(400)
        .json({ message: "Мэдээллээ шалгаад дахин илгээнэ үү." });
    try {
      const existing = await prisma.formResponse.findFirst({
        where: { id: req.params.id, form: { slug: "2003", isActive: true } },
        select: { id: true, data: true },
      });
      if (!existing)
        return res.status(404).json({
          message: "Танилцуулга олдсонгүй эсвэл бүртгэл хаагдсан байна.",
        });
      const metadata =
        existing.data &&
        typeof existing.data === "object" &&
        !Array.isArray(existing.data)
          ? existing.data
          : {};
      if (
        typeof token.userId === "string" &&
        metadata.ownerUserId &&
        metadata.ownerUserId !== token.userId
      )
        return res
          .status(403)
          .json({ message: "Зөвхөн өөрийн танилцуулгыг засах боломжтой." });
      // Preserve server-side publication audit fields; clients cannot overwrite them.
      await prisma.formResponse.update({
        where: { id: existing.id },
        data: {
          data: {
            ...metadata,
            ...data,
            ...(typeof token.userId === "string"
              ? { ownerUserId: token.userId }
              : {}),
            editedAt: new Date().toISOString(),
          },
        },
      });
      res.setHeader("Cache-Control", "no-store");
      return res.json({ success: true });
    } catch {
      return res
        .status(500)
        .json({ message: "Өөрчлөлтийг хадгалж чадсангүй. Дахин оролдоно уу." });
    }
  });
  return router;
}
