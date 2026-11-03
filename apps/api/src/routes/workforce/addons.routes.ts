import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import {
  workforceAccess,
  WorkforceError,
} from "../../services/workforce/access";
import { wallNow } from "../../services/workforce/calculation";
import {
  object,
  text,
  number,
  integer,
  date,
  strings,
} from "../../services/workforce/validation";
import { endpoint, audit, assertMembers } from "./http";
import { emailService } from "../../services/email/email.service";
export const workforceAddonsRouter: ExpressRouter = Router();
async function addon(
  req: Parameters<typeof workforceAccess>[0],
  code: string,
  manage = false,
) {
  const ctx = await workforceAccess(req, { self: !manage, manage });
  if (!ctx.member.organization.workforceSubscription?.addons.includes(code))
    throw new WorkforceError(403, "Нэмэлт үйлчилгээ идэвхгүй байна");
  return ctx;
}
workforceAddonsRouter.post(
  "/pulse",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, { self: true }),
      b = object(req.body),
      score = integer(b.score, "Сэтгэл ханамж", 1, 5),
      today = wallNow(
        ctx.member.organization.workforcePolicy?.timeZone ?? "Asia/Ulaanbaatar",
      )
        .toISOString()
        .slice(0, 10);
    await prisma.workforcePulse.upsert({
      where: {
        organizationId_userId_date: {
          organizationId: ctx.organizationId,
          userId: ctx.user.userId,
          date: new Date(`${today}T00:00:00Z`),
        },
      },
      create: {
        organizationId: ctx.organizationId,
        userId: ctx.user.userId,
        date: new Date(`${today}T00:00:00Z`),
        score,
      },
      update: { score },
    });
    res.json({ ok: true });
  }),
);
workforceAddonsRouter.get(
  "/tracking",
  endpoint(async (req, res) => {
    const ctx = await addon(req, "tracking", true),
      from = new Date(Date.now() - 7 * 86400000);
    const points = await prisma.workforceLocationPoint.findMany({
      where: { organizationId: ctx.organizationId, capturedAt: { gte: from } },
      orderBy: { capturedAt: "desc" },
      take: 1000,
    });
    const preferences = await prisma.workforceTrackingPreference.findMany({
      where: { organizationId: ctx.organizationId, enabled: true },
      select: { userId: true, updatedAt: true },
    });
    res.json({ points, preferences, retentionDays: 30 });
  }),
);
workforceAddonsRouter.post(
  "/tracking/consent",
  endpoint(async (req, res) => {
    const ctx = await addon(req, "tracking"),
      b = object(req.body);
    if (typeof b.enabled !== "boolean")
      throw new WorkforceError(400, "Зөвшөөрлийн төлөв буруу");
    await prisma.$transaction(async (tx) => {
      await tx.workforceTrackingPreference.upsert({
        where: {
          organizationId_userId: {
            organizationId: ctx.organizationId,
            userId: ctx.user.userId,
          },
        },
        create: {
          organizationId: ctx.organizationId,
          userId: ctx.user.userId,
          enabled: b.enabled as boolean,
        },
        update: { enabled: b.enabled as boolean },
      });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "TRACKING_CONSENT",
        ctx.user.userId,
        null,
        { enabled: b.enabled },
      );
    });
    res.json({ ok: true });
  }),
);
workforceAddonsRouter.post(
  "/tracking/points",
  endpoint(async (req, res) => {
    const ctx = await addon(req, "tracking"),
      b = object(req.body),
      consent = await prisma.workforceTrackingPreference.findUnique({
        where: {
          organizationId_userId: {
            organizationId: ctx.organizationId,
            userId: ctx.user.userId,
          },
        },
      });
    if (!consent?.enabled)
      throw new WorkforceError(
        403,
        "Ажилтны байршил хуваалцах зөвшөөрөл идэвхгүй",
      );
    if (
      !(await prisma.attendanceRecord.findFirst({
        where: {
          organizationId: ctx.organizationId,
          userId: ctx.user.userId,
          clockOut: null,
          clockIn: { lte: new Date(), gte: new Date(Date.now() - 86400000) },
        },
      }))
    )
      throw new WorkforceError(
        403,
        "Байршил илгээхийн өмнө ирсэн цагаа бүртгэнэ үү",
      );
    const capturedAt = date(b.capturedAt, "Байршлын огноо"),
      now = Date.now();
    if (+capturedAt > now + 120000 || +capturedAt < now - 86400000)
      throw new WorkforceError(400, "Байршлын огноо 24 цагийн дотор байна");
    const latest = await prisma.workforceLocationPoint.findFirst({
      where: { organizationId: ctx.organizationId, userId: ctx.user.userId },
      orderBy: { createdAt: "desc" },
    });
    if (latest && now - +latest.createdAt < 15000)
      throw new WorkforceError(429, "15 секундийн дараа дахин илгээнэ үү");
    await prisma.workforceLocationPoint.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.user.userId,
        lat: number(b.lat, "Өргөрөг", -90, 90),
        lng: number(b.lng, "Уртраг", -180, 180),
        accuracy: number(b.accuracy, "Нарийвчлал", 0, 10000),
        capturedAt,
      },
    });
    res.status(201).json({ ok: true });
  }),
);
workforceAddonsRouter.get(
  "/mail",
  endpoint(async (req, res) => {
    const ctx = await addon(req, "mail", true);
    const campaigns = await prisma.workforceMailCampaign.findMany({
      where: { organizationId: ctx.organizationId },
      include: {
        deliveries: {
          select: { state: true, email: true, sentAt: true, lastError: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ configured: emailService.isConfigured(), campaigns });
  }),
);
workforceAddonsRouter.post(
  "/mail",
  endpoint(async (req, res) => {
    const ctx = await addon(req, "mail", true),
      b = object(req.body),
      title = text(b.title, "Гарчиг", 200),
      content = text(b.content, "Агуулга", 10000),
      userIds = strings(b.userIds, "Хүлээн авагч", 200),
      idempotencyKey = text(b.idempotencyKey, "Хүсэлтийн дугаар", 100);
    if (!userIds.length)
      throw new WorkforceError(400, "Хүлээн авагч сонгоно уу");
    if (!emailService.isConfigured())
      throw new WorkforceError(503, "Имэйл серверийн тохиргоо хийгдээгүй");
    const existing = await prisma.workforceMailCampaign.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      if (existing.organizationId !== ctx.organizationId)
        throw new WorkforceError(409, "Давхардсан хүсэлт");
      return res.json({ id: existing.id });
    }
    const result = await prisma.$transaction(
      async (tx) => {
        await assertMembers(ctx.organizationId, userIds, tx);
        const members = await tx.organizationMember.findMany({
          where: {
            organizationId: ctx.organizationId,
            userId: { in: userIds },
          },
          include: { user: { select: { email: true } } },
        });
        if (
          members.some((m) => !m.user.email || m.user.email.endsWith(".local"))
        )
          throw new WorkforceError(
            400,
            "Хүлээн авагчийн бодит имэйл хаяг шаардлагатай",
          );
        const count = await tx.workforceMailDelivery.count({
          where: {
            campaign: {
              organizationId: ctx.organizationId,
              createdAt: { gte: new Date(Date.now() - 86400000) },
            },
          },
        });
        if (count + userIds.length > 1000)
          throw new WorkforceError(429, "Өдрийн 1000 имэйлийн лимит хэтэрсэн");
        const campaign = await tx.workforceMailCampaign.create({
          data: {
            organizationId: ctx.organizationId,
            createdBy: ctx.user.userId,
            title,
            content,
            idempotencyKey,
            deliveries: {
              create: members.map((m) => ({
                userId: m.userId,
                email: m.user.email,
              })),
            },
          },
        });
        await audit(
          tx,
          ctx.organizationId,
          ctx.user.userId,
          "MAIL_QUEUED",
          campaign.id,
          null,
          { title, recipients: userIds.length },
        );
        return { id: campaign.id };
      },
      { isolationLevel: "Serializable" },
    );
    res.status(201).json(result);
  }),
);
