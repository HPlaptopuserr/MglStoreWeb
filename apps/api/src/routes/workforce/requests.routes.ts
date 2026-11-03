import { Router, type Router as ExpressRouter } from "express";
import { prisma, type Prisma } from "@mgl/database";
import { timeRequestKinds, type WorkforceRequest } from "@mgl/types";
import {
  workforceAccess,
  assertWorkforceScope,
  WorkforceError,
} from "../../services/workforce/access";
import { wallNow, wallToInstant } from "../../services/workforce/calculation";
import {
  object,
  text,
  date,
  strings,
} from "../../services/workforce/validation";
import { endpoint, audit, assertMembers } from "./http";
export const requestsRouter: ExpressRouter = Router();
requestsRouter.post(
  "/requests",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, { self: true, feature: "requests" }),
      b = object(req.body),
      kind = text(b.kind, "Хүсэлтийн төрөл", 30),
      userId = text(b.userId, "Ажилтан", 100, true) || ctx.user.userId;
    if (
      !timeRequestKinds.some((k) => k === kind) ||
      (ctx.member.organization.workforcePolicy &&
        !ctx.member.organization.workforcePolicy.requestKinds.includes(kind))
    )
      throw new WorkforceError(400, "Хүсэлтийн төрөл идэвхгүй эсвэл буруу");
    if (!ctx.canManage && userId !== ctx.user.userId)
      throw new WorkforceError(403, "Зөвхөн өөрийн хүсэлтийг үүсгэнэ");
    const timeZone =
      ctx.member.organization.workforcePolicy?.timeZone ?? "Asia/Ulaanbaatar";
    const timestamp = (value: unknown, label: string) => {
      const parsed = date(value, label);
      return typeof value === "string" && value.endsWith("Z")
        ? parsed
        : wallToInstant(parsed, timeZone);
    };
    const from = timestamp(b.from, "Эхлэх"),
      to = timestamp(b.to, "Дуусах");
    if (from > to || +to - +from > 93 * 86400000)
      throw new WorkforceError(400, "Хугацаа буруу эсвэл 93 хоногоос урт");
    if (["LEAVE", "OVERTIME"].includes(kind) && +from === +to)
      throw new WorkforceError(400, "Хугацаа тэг байж болохгүй");
    if (["REMOTE", "CORRECTION"].includes(kind) && +from > Date.now() + 120000)
      throw new WorkforceError(400, "Ирцийн цаг ирээдүйд байж болохгүй");
    const direction = ["IN", "OUT"].includes(String(b.direction))
        ? (b.direction as "IN" | "OUT")
        : null,
      zoneId = text(b.zoneId, "Бүс", 100, true) || null,
      recordId = text(b.recordId, "Бүртгэл", 100, true) || null;
    if (["REMOTE", "CORRECTION"].includes(kind) && !direction)
      throw new WorkforceError(400, "Ирэх/явах чиглэл сонгоно уу");
    if (
      ["REMOTE", "CORRECTION"].includes(kind) &&
      +(direction === "OUT" ? to : from) > Date.now() + 120000
    )
      throw new WorkforceError(400, "Ирцийн цаг ирээдүйд байж болохгүй");
    const result = await prisma.$transaction(async (tx) => {
      await assertMembers(ctx.organizationId, [userId], tx);
      if (
        zoneId &&
        !(await tx.attendanceZone.findFirst({
          where: {
            id: zoneId,
            organizationId: ctx.organizationId,
            isActive: true,
          },
        }))
      )
        throw new WorkforceError(400, "Бүс олдсонгүй");
      if (
        recordId &&
        !(await tx.attendanceRecord.findFirst({
          where: { id: recordId, userId, organizationId: ctx.organizationId },
        }))
      )
        throw new WorkforceError(400, "Засах бүртгэл олдсонгүй");
      if (
        ["REMOTE", "CORRECTION"].includes(kind) &&
        direction === "IN" &&
        !zoneId &&
        !recordId
      )
        throw new WorkforceError(400, "Ирэх бүртгэлийн бүс сонгоно уу");
      const row = await tx.workforceRequest.create({
        data: {
          organizationId: ctx.organizationId,
          userId,
          kind,
          from,
          to,
          direction,
          zoneId,
          recordId,
          note: text(b.note, "Шалтгаан", 2000),
        },
      });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "REQUEST_CREATED",
        row.id,
        null,
        row,
      );
      return row;
    });
    res.status(201).json(result);
  }),
);
async function applyAttendance(
  tx: Prisma.TransactionClient,
  request: {
    userId: string;
    organizationId: string;
    kind: string;
    direction: string | null;
    zoneId: string | null;
    recordId: string | null;
    from: Date;
    to: Date;
    note: string;
  },
) {
  if (!["REMOTE", "CORRECTION"].includes(request.kind)) return;
  const when = request.direction === "OUT" ? request.to : request.from;
  const record = request.recordId
    ? await tx.attendanceRecord.findFirst({
        where: {
          id: request.recordId,
          userId: request.userId,
          organizationId: request.organizationId,
        },
      })
    : await tx.attendanceRecord.findFirst({
        where: {
          userId: request.userId,
          organizationId: request.organizationId,
          clockOut: null,
        },
        orderBy: { clockIn: "desc" },
      });
  if (request.direction === "OUT") {
    if (!record)
      throw new WorkforceError(
        409,
        "Явах цаг нөхөх нээлттэй бүртгэл олдсонгүй",
      );
    if (when < record.clockIn)
      throw new WorkforceError(400, "Явах цаг ирсэн цагаас өмнө байна");
    const updated = await tx.attendanceRecord.update({
      where: { id: record.id },
      data: {
        clockOut: when,
        totalMinutes: Math.floor((+when - +record.clockIn) / 60000),
        clockOutMethod: "AUTO",
        note: request.note,
      },
    });
    return { before: record, after: updated };
  }
  if (record) {
    if (!request.recordId)
      throw new WorkforceError(
        409,
        "Нээлттэй бүртгэл байна. Түүнийг сонгон засна уу",
      );
    if (record.clockOut && when > record.clockOut)
      throw new WorkforceError(400, "Ирэх цаг явах цагаас хойш байна");
    const updated = await tx.attendanceRecord.update({
      where: { id: record.id },
      data: {
        clockIn: when,
        totalMinutes: record.clockOut
          ? Math.floor((+record.clockOut - +when) / 60000)
          : null,
        note: request.note,
      },
    });
    return { before: record, after: updated };
  }
  if (!request.zoneId)
    throw new WorkforceError(400, "Бүртгэлийн бүс шаардлагатай");
  const zone = await tx.attendanceZone.findFirst({
    where: {
      id: request.zoneId,
      organizationId: request.organizationId,
      isActive: true,
    },
  });
  if (!zone) throw new WorkforceError(409, "Бүс идэвхгүй болсон");
  const created = await tx.attendanceRecord.create({
    data: {
      organizationId: request.organizationId,
      userId: request.userId,
      zoneId: zone.id,
      clockIn: when,
      // Approval confirms the time; no device location was captured.
      clockInLat: null,
      clockInLng: null,
      clockInMethod: "AUTO",
      note: `[Батлагдсан хүсэлт] ${request.note}`,
    },
  });
  return { before: null, after: created };
}
requestsRouter.post(
  "/requests/decide",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "requests",
      }),
      b = object(req.body),
      ids = strings(b.ids, "Хүсэлт", 100),
      decision = text(b.decision, "Шийдвэр", 20),
      decisionNote = text(b.note, "Тайлбар", 1000, true);
    if (!["APPROVED", "REJECTED"].includes(decision) || !ids.length)
      throw new WorkforceError(400, "Хүсэлт болон шийдвэр сонгоно уу");
    if (decision === "REJECTED" && !decisionNote)
      throw new WorkforceError(400, "Татгалзсан шалтгаан оруулна уу");
    const results: { id: string; ok: boolean; message?: string }[] = [];
    for (const id of ids) {
      try {
        await prisma.$transaction(
          async (tx) => {
            const before = await tx.workforceRequest.findFirst({
              where: { id, organizationId: ctx.organizationId },
            });
            if (!before) throw new WorkforceError(404, "Хүсэлт олдсонгүй");
            assertWorkforceScope(ctx, [before.userId]);
            if (before.state !== "PENDING")
              throw new WorkforceError(409, "Хүсэлт аль хэдийн шийдвэрлэгдсэн");
            if (before.userId === ctx.user.userId)
              throw new WorkforceError(
                403,
                "Өөрийн хүсэлтийг өөр удирдлага шийдвэрлэнэ",
              );
            await assertMembers(ctx.organizationId, [before.userId], tx);
            const claimed = await tx.workforceRequest.updateMany({
              where: {
                id,
                state: "PENDING",
                organizationId: ctx.organizationId,
              },
              data: {
                state: decision,
                decisionNote,
                decidedBy: ctx.user.userId,
                decidedAt: new Date(),
              },
            });
            if (claimed.count !== 1)
              throw new WorkforceError(
                409,
                "Хүсэлт өөрчлөгдсөн. Дахин шинэчилнэ үү",
              );
            if (decision === "APPROVED") {
              if (
                before.kind === "LEAVE" &&
                (await tx.workforceRequest.count({
                  where: {
                    organizationId: ctx.organizationId,
                    userId: before.userId,
                    kind: "LEAVE",
                    state: "APPROVED",
                    id: { not: id },
                    from: { lt: before.to },
                    to: { gt: before.from },
                  },
                }))
              )
                throw new WorkforceError(
                  409,
                  "Батлагдсан чөлөөтэй давхцаж байна",
                );
              const change = await applyAttendance(tx, before);
              if (change)
                await audit(
                  tx,
                  ctx.organizationId,
                  ctx.user.userId,
                  "ATTENDANCE_ADJUSTED",
                  change.after.id,
                  change.before,
                  change.after,
                );
            }
            await audit(
              tx,
              ctx.organizationId,
              ctx.user.userId,
              `REQUEST_${decision}`,
              id,
              before,
              { state: decision, decisionNote },
            );
            await tx.workforceNotice.create({
              data: {
                organizationId: ctx.organizationId,
                userIds: [before.userId],
                createdBy: ctx.user.userId,
                title:
                  decision === "APPROVED"
                    ? "Хүсэлт зөвшөөрөгдлөө"
                    : "Хүсэлт татгалзлаа",
                content: `${before.note}\n${decisionNote}`,
              },
            });
          },
          { isolationLevel: "Serializable" },
        );
        results.push({ id, ok: true });
      } catch (error) {
        results.push({
          id,
          ok: false,
          message:
            error instanceof WorkforceError
              ? error.message
              : "Шийдвэрлэх үед алдаа гарлаа. Дахин шинэчилнэ үү",
        });
      }
    }
    res.json({ results });
  }),
);
requestsRouter.post(
  "/requests/:id/cancel",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, { self: true, feature: "requests" }),
      id = String(req.params.id);
    await prisma.$transaction(async (tx) => {
      const before = await tx.workforceRequest.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });
      if (!before) throw new WorkforceError(404, "Хүсэлт олдсонгүй");
      if (before.userId !== ctx.user.userId && !ctx.canManage)
        throw new WorkforceError(403, "Эрх хүрэлцэхгүй");
      const update = await tx.workforceRequest.updateMany({
        where: { id, organizationId: ctx.organizationId, state: "PENDING" },
        data: { state: "CANCELLED" },
      });
      if (!update.count)
        throw new WorkforceError(409, "Зөвхөн хүлээгдэж буй хүсэлтийг цуцална");
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "REQUEST_CANCELLED",
        id,
        before,
        { state: "CANCELLED" },
      );
    });
    res.json({ ok: true });
  }),
);
requestsRouter.get(
  "/self",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, { self: true });
    const [requests, notices, assignments] = await Promise.all([
      prisma.workforceRequest.findMany({
        where: { organizationId: ctx.organizationId, userId: ctx.user.userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.workforceNotice.findMany({
        where: {
          organizationId: ctx.organizationId,
          userIds: { has: ctx.user.userId },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.workforceAssignment.findMany({
        where: {
          organizationId: ctx.organizationId,
          userId: ctx.user.userId,
          to: {
            gte: new Date(
              `${wallNow(
                ctx.member.organization.workforcePolicy?.timeZone ??
                  "Asia/Ulaanbaatar",
              )
                .toISOString()
                .slice(0, 10)}T00:00:00Z`,
            ),
          },
        },
        include: { shift: true },
        take: 100,
      }),
    ]);
    const tracking = await prisma.workforceTrackingPreference.findUnique({
      where: {
        organizationId_userId: {
          organizationId: ctx.organizationId,
          userId: ctx.user.userId,
        },
      },
    });
    res.json({
      requests,
      notices,
      assignments,
      trackingEnabled: tracking?.enabled ?? false,
      addons: ctx.member.organization.workforceSubscription?.addons ?? [],
    });
  }),
);
requestsRouter.post(
  "/notices/:id/read",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, { self: true }),
      id = String(req.params.id);
    await prisma.workforceNotice.updateMany({
      where: {
        id,
        organizationId: ctx.organizationId,
        userIds: { has: ctx.user.userId },
        NOT: { readBy: { has: ctx.user.userId } },
      },
      data: { readBy: { push: ctx.user.userId } },
    });
    res.json({ ok: true });
  }),
);
