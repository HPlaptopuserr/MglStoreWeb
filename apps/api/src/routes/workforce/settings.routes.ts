import { Router, type Router as ExpressRouter } from "express";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@mgl/database";
import { timeRequestKinds, workforceFeatures } from "@mgl/types";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import { Permission } from "@mgl/types";
import {
  workforceAccess,
  authenticated,
  featureFlags,
  WorkforceError,
} from "../../services/workforce/access";
import {
  object,
  text,
  integer,
  strings,
  date,
} from "../../services/workforce/validation";
import { endpoint, audit } from "./http";
export const settingsRouter: ExpressRouter = Router();
export const workforceAdminRouter: ExpressRouter = Router();
settingsRouter.patch(
  "/policy",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, { manage: true }),
      b = object(req.body),
      timeZone = text(b.timeZone, "Цагийн бүс", 80);
    try {
      new Intl.DateTimeFormat("en", { timeZone });
    } catch {
      throw new WorkforceError(400, "Цагийн бүс буруу");
    }
    const kinds = strings(b.requestKinds, "Хүсэлтийн төрөл", 4);
    if (kinds.some((k) => !timeRequestKinds.some((v) => v === k)))
      throw new WorkforceError(400, "Хүсэлтийн төрөл буруу");
    const data = {
      timeZone,
      lateGraceMinutes: integer(b.lateGraceMinutes, "Хоцролтын хүлцэл", 0, 120),
      requestKinds: kinds,
      approvalRequired: true,
    };
    await prisma.$transaction(async (tx) => {
      const before = await tx.workforcePolicy.findUnique({
        where: { organizationId: ctx.organizationId },
      });
      const row = await tx.workforcePolicy.upsert({
        where: { organizationId: ctx.organizationId },
        create: { organizationId: ctx.organizationId, ...data },
        update: data,
      });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "POLICY_UPDATED",
        ctx.organizationId,
        before,
        row,
      );
    });
    res.json({ ok: true });
  }),
);
const tokenScopes = [
  "attendance:read",
  "employees:read",
  "organization:read",
  "reports:read",
];
settingsRouter.post(
  "/tokens",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "integrations",
      }),
      b = object(req.body),
      name = text(b.name, "Түлхүүрийн нэр", 100),
      scopes = strings(b.scopes, "Хамрах хүрээ", 4),
      expiresAt = date(b.expiresAt, "Дуусах хугацаа");
    if (!scopes.length || scopes.some((s) => !tokenScopes.includes(s)))
      throw new WorkforceError(400, "Хамрах хүрээ буруу");
    if (+expiresAt <= Date.now() || +expiresAt > Date.now() + 366 * 86400000)
      throw new WorkforceError(400, "Түлхүүрийн хугацаа 1 жил хүртэл байна");
    const secret = `mglwf_${randomBytes(32).toString("hex")}`;
    const result = await prisma.$transaction(async (tx) => {
      if (
        (await tx.workforceApiToken.count({
          where: { organizationId: ctx.organizationId, revokedAt: null },
        })) >= 20
      )
        throw new WorkforceError(409, "20 түлхүүрийн лимит дүүрсэн");
      const row = await tx.workforceApiToken.create({
        data: {
          organizationId: ctx.organizationId,
          name,
          prefix: secret.slice(0, 14),
          tokenHash: createHash("sha256").update(secret).digest("hex"),
          scopes,
          expiresAt,
          createdBy: ctx.user.userId,
        },
      });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "API_TOKEN_CREATED",
        row.id,
        null,
        { name, scopes, expiresAt },
      );
      return { id: row.id, secret };
    });
    res.status(201).json(result);
  }),
);
settingsRouter.delete(
  "/tokens/:id",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, {
        manage: true,
        feature: "integrations",
      }),
      id = String(req.params.id);
    await prisma.$transaction(async (tx) => {
      const row = await tx.workforceApiToken.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });
      if (!row) throw new WorkforceError(404, "Түлхүүр олдсонгүй");
      await tx.workforceApiToken.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
      await audit(
        tx,
        ctx.organizationId,
        ctx.user.userId,
        "API_TOKEN_REVOKED",
        id,
        null,
        { revoked: true },
      );
    });
    res.json({ ok: true });
  }),
);
const adminPath = "/admin/organizations/:id/workforce-controls";
workforceAdminRouter.use(
  adminPath,
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS),
);
workforceAdminRouter.get(
  adminPath,
  endpoint(async (req, res) => {
    const id = String(req.params.id);
    const org = await prisma.organization.findUnique({
      where: { id },
      include: { workforcePolicy: true, workforceSubscription: true },
    });
    if (!org) throw new WorkforceError(404, "Байгууллага олдсонгүй");
    res.json({
      features: featureFlags(org.workforcePolicy?.features),
      subscription: org.workforceSubscription ?? {
        planName: "Үндсэн",
        expiresAt: null,
        seatUnitPrice: null,
        currency: "MNT",
        addons: [],
      },
    });
  }),
);
workforceAdminRouter.patch(
  adminPath,
  endpoint(async (req, res) => {
    const id = String(req.params.id),
      user = authenticated(req),
      b = object(req.body),
      featureInput = object(b.features);
    if (
      Object.keys(featureInput).some(
        (k) => !workforceFeatures.some((f) => f === k),
      ) ||
      Object.values(featureInput).some((v) => typeof v !== "boolean")
    )
      throw new WorkforceError(400, "Боломжийн тохиргоо буруу");
    const subscription = object(b.subscription),
      planName = text(subscription.planName, "Багцын нэр", 100),
      expiresAt = subscription.expiresAt
        ? date(subscription.expiresAt, "Дуусах огноо")
        : null,
      seatUnitPrice =
        subscription.seatUnitPrice === null
          ? null
          : integer(
              subscription.seatUnitPrice,
              "Нэг ажилтны сарын үнэ",
              1,
              100000000,
            ),
      addons = strings(subscription.addons, "Нэмэлт үйлчилгээ", 20);
    if (addons.some((a) => !["tracking", "mail"].includes(a)))
      throw new WorkforceError(400, "Нэмэлт үйлчилгээ буруу");
    await prisma.$transaction(async (tx) => {
      if (!(await tx.organization.findUnique({ where: { id } })))
        throw new WorkforceError(404, "Байгууллага олдсонгүй");
      const before = await tx.workforcePolicy.findUnique({
        where: { organizationId: id },
      });
      await tx.workforcePolicy.upsert({
        where: { organizationId: id },
        create: { organizationId: id, features: featureFlags(featureInput) },
        update: { features: featureFlags(featureInput) },
      });
      const plan = await tx.workforceSubscription.upsert({
        where: { organizationId: id },
        create: {
          organizationId: id,
          planName,
          expiresAt,
          seatUnitPrice,
          addons,
        },
        update: { planName, expiresAt, seatUnitPrice, addons },
      });
      await audit(
        tx,
        id,
        user.userId,
        "APP_CONTROL_UPDATED",
        id,
        { policy: before },
        { features: featureInput, subscription: plan },
      );
    });
    res.json({ ok: true });
  }),
);
