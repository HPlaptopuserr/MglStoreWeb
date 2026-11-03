import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import {
  workforceAccess,
  WorkforceError,
} from "../../services/workforce/access";
import { object, text, date } from "../../services/workforce/validation";
import { wallToInstant, wallNow } from "../../services/workforce/calculation";
import { endpoint, assertMembers, audit } from "./http";
export const manualAttendanceRouter: ExpressRouter = Router();
manualAttendanceRouter.post(
  "/manual-attendance",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
      manage: true,
      feature: "reports",
    });
    const body = object(req.body);
    const userId = text(body.userId, "Ажилтан", 100);
    const zoneId = text(body.zoneId, "Байршлын бүс", 100, true) || null;
    const reason = text(body.reason, "Шалтгаан", 1000);
    const timeZone =
      ctx.member.organization.workforcePolicy?.timeZone ?? "Asia/Ulaanbaatar";
    const clockIn = body.clockIn
      ? wallToInstant(date(body.clockIn, "Ирсэн цаг"), timeZone)
      : null;
    const clockOut = body.clockOut
      ? wallToInstant(date(body.clockOut, "Явсан цаг"), timeZone)
      : null;
    if (!clockIn && !clockOut)
      throw new WorkforceError(
        400,
        "Ирсэн эсвэл явсан цагийн аль нэгийг оруулна уу",
      );
    if (
      (clockIn && +clockIn > Date.now() + 120000) ||
      (clockOut && +clockOut > Date.now() + 120000)
    )
      throw new WorkforceError(400, "Ирээдүйн цаг бүртгэх боломжгүй");
    const record = await prisma.$transaction(
      async (tx) => {
        await assertMembers(ctx.organizationId, [userId], tx);
        const member = await tx.organizationMember.findUniqueOrThrow({
          where: {
            userId_organizationId: {
              userId,
              organizationId: ctx.organizationId,
            },
          },
        });
        if (
          wallNow(timeZone, clockIn ?? clockOut!)
            .toISOString()
            .slice(0, 10) < member.createdAt.toISOString().slice(0, 10)
        )
          throw new WorkforceError(
            400,
            "Байгууллагад элссэн өдрөөс өмнөх цаг бүртгэх боломжгүй",
          );
        // Serialize concurrent manual entries for the same organization member.
        await tx.$queryRaw`SELECT id FROM "OrganizationMember" WHERE id = ${member.id} FOR UPDATE`;
        const zone = zoneId
          ? await tx.attendanceZone.findFirst({
              where: {
                id: zoneId,
                organizationId: ctx.organizationId,
                isActive: true,
              },
            })
          : null;
        if (zoneId && !zone)
          throw new WorkforceError(400, "Идэвхтэй байршлын бүс сонгоно уу");
        const open = !clockIn
          ? await tx.attendanceRecord.findFirst({
              where: {
                organizationId: ctx.organizationId,
                userId,
                clockOut: null,
              },
              orderBy: { clockIn: "desc" },
            })
          : null;
        if (!clockIn && !open)
          throw new WorkforceError(
            400,
            "Явсан цаг бүртгэхийн өмнө ирсэн бүртгэл байх шаардлагатай",
          );
        const start = clockIn ?? open!.clockIn;
        const duration = clockOut ? (+clockOut - +start) / 60000 : null;
        if (duration !== null && (duration <= 0 || duration > 24 * 60))
          throw new WorkforceError(
            400,
            "Явсан цаг ирсэн цагаас хойш, хугацаа 24 цагаас ихгүй байна",
          );
        const existing = await tx.attendanceRecord.findFirst({
          where: {
            organizationId: ctx.organizationId,
            userId,
            ...(open ? { id: { not: open.id } } : {}),
            ...(clockOut ? { clockIn: { lt: clockOut } } : {}),
            OR: [{ clockOut: null }, { clockOut: { gt: start } }],
          },
        });
        if (existing)
          throw new WorkforceError(
            409,
            "Энэ хугацаанд давхардсан эсвэл хаагдаагүй цагийн бүртгэл байна",
          );
        const totalMinutes = duration === null ? null : Math.round(duration);
        const saved = open
          ? await tx.attendanceRecord.update({
              where: { id: open.id },
              data: {
                clockOut,
                totalMinutes,
                clockOutMethod: "PIN",
                note: `${open.note ?? ""}\n[ADMIN_MANUAL_OUT] ${reason}`,
              },
            })
          : await tx.attendanceRecord.create({
              data: {
                organizationId: ctx.organizationId,
                userId,
                zoneId,
                clockIn: start,
                clockOut,
                totalMinutes,
                clockInLat: null,
                clockInLng: null,
                clockInMethod: "PIN",
                clockOutMethod: clockOut ? "PIN" : null,
                note: `[ADMIN_MANUAL] ${reason}`,
              },
            });
        await audit(
          tx,
          ctx.organizationId,
          ctx.user.userId,
          open ? "ATTENDANCE_MANUAL_CLOSED" : "ATTENDANCE_MANUAL_CREATED",
          saved.id,
          open,
          { ...saved, reason, source: "ADMIN_MANUAL" },
        );
        return saved;
      },
      { isolationLevel: "Serializable" },
    );
    res.status(201).json({ id: record.id });
  }),
);
