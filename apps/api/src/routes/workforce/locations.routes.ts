import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import {
  workforceAccess,
  WorkforceError,
} from "../../services/workforce/access";
import {
  object,
  text,
  integer,
  number,
} from "../../services/workforce/validation";
import { endpoint, audit } from "./http";
export const locationsRouter: ExpressRouter = Router();
locationsRouter.post(
  "/zones",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "locations",
      }),
      b = object(req.body);
    const data = {
      organizationId: ctx.organizationId,
      name: text(b.name, "Байршлын нэр", 150),
      lat: number(b.lat, "Өргөрөг", -90, 90),
      lng: number(b.lng, "Уртраг", -180, 180),
      radiusMeters: integer(b.radiusMeters, "Радиус", 10, 10000),
    };
    const row = await prisma.$transaction(async (tx) => {
      const row = await tx.attendanceZone.create({ data });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "ZONE_CREATED",
        row.id,
        null,
        row,
      );
      return row;
    });
    res.status(201).json(row);
  }),
);

locationsRouter.patch(
  "/zones/:id",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "locations",
      }),
      b = object(req.body),
      id = String(req.params.id);
    const data = {
      name: text(b.name, "Нэр", 150),
      lat: number(b.lat, "Өргөрөг", -90, 90),
      lng: number(b.lng, "Уртраг", -180, 180),
      radiusMeters: integer(b.radiusMeters, "Радиус", 10, 10000),
      isActive: b.isActive !== false,
    };
    await prisma.$transaction(async (tx) => {
      const before = await tx.attendanceZone.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });
      if (!before) throw new WorkforceError(404, "Бүс олдсонгүй");
      const row = await tx.attendanceZone.update({ where: { id }, data });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "ZONE_UPDATED",
        id,
        before,
        row,
      );
    });
    res.json({ ok: true });
  }),
);
