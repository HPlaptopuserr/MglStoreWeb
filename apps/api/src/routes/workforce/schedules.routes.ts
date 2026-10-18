import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import {
  workforceAccess,
  assertWorkforceScope,
  WorkforceError,
} from "../../services/workforce/access";
import { hasScheduleConflict } from "../../services/workforce/schedule-conflicts";
import { daysBetween } from "../../services/workforce/calculation";
import {
  object,
  text,
  integer,
  strings,
} from "../../services/workforce/validation";
import { endpoint, audit, assertMembers } from "./http";
export const schedulesRouter: ExpressRouter = Router();
schedulesRouter.post(
  "/shifts",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "schedules",
      }),
      b = object(req.body);
    if (!ctx.canManage)
      throw new WorkforceError(403, "Ээлжийн загвар үүсгэх эрхгүй");
    const startMinute = integer(b.startMinute, "Эхлэх минут", 0, 1439),
      endMinute = integer(b.endMinute, "Дуусах минут", 0, 1439),
      breakMinutes = integer(b.breakMinutes, "Завсарлага", 0, 720);
    if (
      startMinute === endMinute ||
      breakMinutes >= (endMinute - startMinute + 1440) % 1440
    )
      throw new WorkforceError(400, "Ээлжийн хугацаа, завсарлага буруу");
    const weekdays = Array.isArray(b.weekdays)
      ? [...new Set(b.weekdays.map((v) => integer(v, "Гараг", 0, 6)))]
      : [];
    if (!weekdays.length)
      throw new WorkforceError(400, "Ажиллах гараг сонгоно уу");
    const color = text(b.color, "Өнгө", 7);
    if (!/^#[0-9a-fA-F]{6}$/.test(color))
      throw new WorkforceError(400, "Өнгө буруу");
    const data = {
      organizationId: ctx.organizationId,
      name: text(b.name, "Ээлжийн нэр", 120),
      startMinute,
      endMinute,
      breakMinutes,
      weekdays,
      color,
    };
    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.workforceShift.create({ data });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "SHIFT_CREATED",
        created.id,
        null,
        created,
      );
      return created;
    });
    res.status(201).json(row);
  }),
);

schedulesRouter.patch(
  "/shifts/:id",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "schedules",
      }),
      b = object(req.body),
      id = String(req.params.id);
    if (!ctx.canManage)
      throw new WorkforceError(403, "Ээлжийн загвар өөрчлөх эрхгүй");
    if (typeof b.active !== "boolean")
      throw new WorkforceError(400, "Төлөв буруу");
    await prisma.$transaction(async (tx) => {
      const before = await tx.workforceShift.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });
      if (!before) throw new WorkforceError(404, "Ээлж олдсонгүй");
      const row = await tx.workforceShift.update({
        where: { id },
        data: { active: b.active as boolean },
      });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "SHIFT_UPDATED",
        id,
        before,
        row,
      );
    });
    res.json({ ok: true });
  }),
);

schedulesRouter.post(
  "/assignments",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "schedules",
      }),
      b = object(req.body),
      userIds = strings(b.userIds, "Ажилтан", 500),
      shiftId = text(b.shiftId, "Ээлж", 100),
      from = text(b.from, "Эхлэх огноо", 10),
      to = text(b.to, "Дуусах огноо", 10),
      zoneId = text(b.zoneId, "Бүс", 100, true) || null;
    assertWorkforceScope(ctx, userIds);
    if (!userIds.length) throw new WorkforceError(400, "Ажилтан сонгоно уу");
    const days = daysBetween(from, to, 366);
    const result = await prisma.$transaction(
      async (tx) => {
        await assertMembers(ctx.organizationId, userIds, tx);
        const shift = await tx.workforceShift.findFirst({
          where: {
            id: shiftId,
            organizationId: ctx.organizationId,
            active: true,
          },
        });
        if (!shift) throw new WorkforceError(404, "Идэвхтэй ээлж олдсонгүй");
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
        const start = new Date(`${from}T00:00:00Z`),
          end = new Date(`${to}T00:00:00Z`);
        const existing = await tx.workforceAssignment.findMany({
          where: {
            organizationId: ctx.organizationId,
            userId: { in: userIds },
            from: { lte: new Date(+end + 86400000) },
            to: { gte: new Date(+start - 86400000) },
          },
          include: { shift: true },
        });
        if (hasScheduleConflict(days, shift, existing))
          throw new WorkforceError(
            409,
            "Сонгосон хугацаанд хуваарь давхцаж байна. Өмнөх оноолтыг цуцлаад дахин онооно уу",
          );
        const count = await tx.workforceAssignment.createMany({
          data: userIds.map((userId) => ({
            organizationId: ctx.organizationId,
            userId,
            shiftId,
            from: start,
            to: end,
            zoneId,
          })),
        });
        await audit(
          tx,
          ctx.organizationId,
          ctx.user.userId,
          "ASSIGNMENT_CREATED",
          shiftId,
          null,
          { ...b, count: count.count },
        );
        return count;
      },
      { isolationLevel: "Serializable" },
    );
    res.status(201).json(result);
  }),
);

schedulesRouter.delete(
  "/assignments/:id",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "schedules",
      }),
      id = String(req.params.id);
    await prisma.$transaction(async (tx) => {
      const before = await tx.workforceAssignment.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });
      if (!before) throw new WorkforceError(404, "Оноолт олдсонгүй");
      assertWorkforceScope(ctx, [before.userId]);
      await tx.workforceAssignment.delete({ where: { id } });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "ASSIGNMENT_CANCELLED",
        id,
        before,
        null,
      );
    });
    res.json({ ok: true });
  }),
);
