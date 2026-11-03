import { auditSummary } from "../../services/organization-groups/audit-view";
import { randomBytes } from "node:crypto";
import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import {
  access,
  allowedCompanies,
  audit,
  mutate,
  subject,
} from "../../services/organization-groups/access";
import {
  effectivePermissions,
  GroupError,
  logoUrl,
  object,
  permissions,
  text,
} from "../../services/organization-groups/policy";
import { endpoint, param } from "./http";
export const groupsRouter: ExpressRouter = Router();

groupsRouter.get(
  "/",
  endpoint(async (req, res) => {
    const memberships = await prisma.groupMember.findMany({
      where: {
        userId: subject(req),
        revokedAt: null,
        user: { isActive: true, deletedAt: null },
      },
      include: {
        group: {
          include: {
            companies: {
              where: {
                disconnectedAt: null,
                organization: { deletedAt: null, status: "ACTIVE" },
              },
              select: { id: true, sharedPermissions: true },
            },
          },
        },
        companyAccess: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const groups = memberships.map((m) => {
      const { companies, ...group } = m.group;
      return {
        ...group,
        role: m.role,
        companyCount: companies.filter(
          (c) => effectivePermissions(m, c).length > 0,
        ).length,
      };
    });
    res.json(groups);
  }),
);
groupsRouter.post(
  "/",
  endpoint(async (req, res) => {
    const userId = subject(req);
    const body = object(req.body ?? {});
    const requestedName = body.name === undefined ? undefined : text(body.name);
    const group = await prisma.$transaction(async (db) => {
      const user = await db.user.findFirst({
        where: { id: userId, isActive: true, deletedAt: null },
      });
      if (!user) throw new GroupError(403, "Идэвхтэй бүртгэл шаардлагатай.");
      if (
        !(await db.organizationMember.findFirst({
          where: {
            userId,
            role: "OWNER",
            isActive: true,
            deletedAt: null,
            organization: { status: "ACTIVE", deletedAt: null },
          },
          select: { id: true },
        }))
      )
        throw new GroupError(
          403,
          "Групп үүсгэхэд компанийн Owner эрх шаардлагатай.",
        );
      const created = await db.organizationGroup.create({
        data: {
          name:
            requestedName ??
            `Групп ${randomBytes(3).toString("hex").toUpperCase()}`,
          ownerId: userId,
          members: {
            create: {
              userId,
              role: "OWNER",
              allCompanies: true,
              permissions: [...permissions],
            },
          },
        },
      });
      await audit(db, created.id, userId, "GROUP_CREATED", created.id, {
        name: created.name,
      });
      return created;
    });
    res.status(201).json(group);
  }),
);
groupsRouter.get(
  "/:groupId",
  endpoint(async (req, res) => {
    const userId = subject(req),
      groupId = param(req, "groupId");
    const { member, companies } = await allowedCompanies(
      prisma,
      userId,
      groupId,
    );
    const canManage = member.role === "OWNER" || member.role === "ADMIN";
    const visible = canManage
      ? await prisma.groupCompany.findMany({
          where: {
            groupId,
            disconnectedAt: null,
            organization: { deletedAt: null, status: "ACTIVE" },
          },
          include: { organization: true },
          orderBy: { joinedAt: "asc" },
        })
      : companies;
    const ownerships = await prisma.organizationMember.findMany({
      where: { userId, role: "OWNER", isActive: true, deletedAt: null },
      select: { organizationId: true },
    });
    const members = await prisma.groupMember.findMany({
      where: { groupId, revokedAt: null, ...(canManage ? {} : { userId }) },
      include: {
        user: { select: { id: true, profile: { select: { fullName: true } } } },
        companyAccess: true,
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({
      ...member.group,
      ownerName: member.group.owner.profile?.fullName || "Группийн Owner",
      role: member.role,
      canManage,
      companies: visible.map((c) => ({
        id: c.id,
        organizationId: c.organizationId,
        name: c.organization.name,
        taxId: c.organization.taxId,
        logoUrl: c.organization.logoUrl,
        joinedAt: c.joinedAt,
        sharedPermissions: c.sharedPermissions,
        permissions:
          companies.find((a) => a.id === c.id)?.effectivePermissions ?? [],
        isHead: member.group.headCompanyId === c.organizationId,
        canManageSharing: ownerships.some(
          (o) => o.organizationId === c.organizationId,
        ),
      })),
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.profile?.fullName || "Группийн гишүүн",
        role: m.role,
        allCompanies: m.allCompanies,
        permissions: m.permissions,
        companyAccess: m.companyAccess,
      })),
    });
  }),
);
groupsRouter.patch(
  "/:groupId",
  endpoint(async (req, res) => {
    const groupId = param(req, "groupId"),
      userId = subject(req),
      body = object(req.body);
    await mutate(groupId, async (db) => {
      const member = await access(db, userId, groupId, "admin");
      const name = text(body.name),
        description =
          body.description === undefined
            ? member.group.description
            : text(body.description, 1000, true) || null,
        logo =
          body.logoUrl === undefined
            ? member.group.logoUrl
            : logoUrl(body.logoUrl);
      await db.organizationGroup.update({
        where: { id: groupId },
        data: { name, description: description || null, logoUrl: logo },
      });
      await audit(db, groupId, userId, "GROUP_UPDATED", groupId, {
        before: {
          name: member.group.name,
          description: member.group.description,
          logoUrl: member.group.logoUrl,
        },
        after: { name, description, logoUrl: logo },
      });
    });
    res.json({ ok: true });
  }),
);
groupsRouter.get(
  "/:groupId/audit",
  endpoint(async (req, res) => {
    const groupId = param(req, "groupId");
    await access(prisma, subject(req), groupId, "admin");
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const rows = await prisma.groupAuditLog.findMany({
      where: { groupId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 51,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const [actors, members, companies] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: rows.map((row) => row.actorId) } },
        select: { id: true, profile: { select: { fullName: true } } },
      }),
      prisma.groupMember.findMany({
        where: { groupId },
        select: {
          id: true,
          userId: true,
          user: { select: { profile: { select: { fullName: true } } } },
        },
      }),
      prisma.groupCompany.findMany({
        where: { groupId },
        select: {
          id: true,
          organizationId: true,
          organization: { select: { name: true } },
        },
      }),
    ]);
    const names = new Map<string, string>();
    for (const actor of actors)
      names.set(actor.id, actor.profile?.fullName || "Гишүүн");
    for (const member of members) {
      names.set(member.id, member.user.profile?.fullName || "Гишүүн");
      names.set(member.userId, member.user.profile?.fullName || "Гишүүн");
    }
    for (const company of companies) {
      names.set(company.id, company.organization.name);
      names.set(company.organizationId, company.organization.name);
    }
    res.json({
      items: rows.slice(0, 50).map((row) => ({
        ...row,
        actorName: names.get(row.actorId) ?? "Гишүүн",
        entityName: names.get(row.entityId) ?? "Групп",
        summary: auditSummary(row.action, row.details, names),
      })),
      nextCursor: rows.length > 50 ? rows[49]?.id : null,
    });
  }),
);
