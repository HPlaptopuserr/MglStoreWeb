import { monitorCandidates } from "../../services/organization-groups/monitor-invitations";
import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import {
  access,
  audit,
  companyOwner,
  companyScope,
  mutate,
  subject,
} from "../../services/organization-groups/access";
import {
  assertDelegation,
  assertPending,
  GroupError,
  hashCode,
  invitationCode,
  invitationStatus,
  object,
  parsePermissions,
  parseRole,
  recipient,
  text,
} from "../../services/organization-groups/policy";
import { emailService } from "../../services/email/email.service";
import { emailLayout, safe } from "../../services/email/email-layout";
import { endpoint, param } from "./http";
import { searchGroupCompanies } from "../../services/organization-groups/company-search";
export const invitationsRouter: ExpressRouter = Router();
const expires = () => new Date(Date.now() + 7 * 86400_000);
const orgSelect = { id: true, name: true, taxId: true } as const;
const groupSelect = { id: true, name: true } as const;

invitationsRouter.get(
  "/invitations",
  endpoint(async (req, res) => {
    const userId = subject(req);
    const user = await prisma.user.findFirst({
      where: { id: userId, isActive: true, deletedAt: null },
    });
    if (!user) throw new GroupError(403, "Идэвхтэй бүртгэл шаардлагатай.");
    const groupId =
      typeof req.query.groupId === "string" ? req.query.groupId : undefined;
    const organizationId =
      typeof req.query.organizationId === "string"
        ? text(req.query.organizationId)
        : undefined;
    if (groupId && organizationId)
      throw new GroupError(400, "Групп эсвэл компанийн нэг хүрээ сонгоно уу.");
    if (groupId) await access(prisma, userId, groupId, "admin");
    if (organizationId) await companyOwner(prisma, userId, organizationId);
    const ownerships = await prisma.organizationMember.findMany({
      where: {
        userId,
        role: "OWNER",
        isActive: true,
        deletedAt: null,
        organization: { deletedAt: null, status: "ACTIVE" },
      },
      select: { organizationId: true },
    });
    const [people, companies] = await Promise.all([
      prisma.groupPersonInvitation.findMany({
        where: groupId
          ? { groupId }
          : {
              recipientUserId: userId,
              ...(organizationId ? { id: { in: [] } } : {}),
            },
        select: {
          id: true,
          groupId: true,
          recipient: true,
          role: true,
          allCompanies: true,
          companyIds: true,
          permissions: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          deliveryStatus: true,
          group: { select: groupSelect },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.groupCompanyInvitation.findMany({
        where: groupId
          ? { groupId }
          : {
              organizationId: organizationId ?? {
                in: ownerships.map((o) => o.organizationId),
              },
            },
        include: {
          group: { select: groupSelect },
          organization: { select: orgSelect },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    const scopeRows = people.length
      ? await prisma.groupCompany.findMany({
          where: {
            OR: people.map((i) => ({
              groupId: i.groupId,
              id: { in: i.companyIds },
            })),
          },
          select: {
            id: true,
            groupId: true,
            organization: { select: orgSelect },
          },
        })
      : [];
    res.json(
      [
        ...people
          .filter(() => !organizationId)
          .map((i) => ({
            ...i,
            kind: "PERSON",
            scopeCompanies: scopeRows
              .filter(
                (c) => c.groupId === i.groupId && i.companyIds.includes(c.id),
              )
              .map((c) => c.organization),
            status: invitationStatus(i.status, i.expiresAt),
            canRespond: !groupId,
            canCancel: !!groupId,
          })),
        ...companies.map((i) => ({
          ...i,
          kind: "COMPANY",
          status: invitationStatus(i.status, i.expiresAt),
          canRespond: ownerships.some(
            (o) => o.organizationId === i.organizationId,
          ),
          canCancel: !!groupId,
        })),
      ].sort((a, b) => +b.createdAt - +a.createdAt),
    );
  }),
);
invitationsRouter.get(
  "/company-links",
  endpoint(async (req, res) => {
    const userId = subject(req);
    const links = await prisma.groupCompany.findMany({
      where: {
        disconnectedAt: null,
        organization: {
          deletedAt: null,
          status: "ACTIVE",
          members: {
            some: {
              userId,
              role: "OWNER",
              isActive: true,
              deletedAt: null,
              user: { isActive: true, deletedAt: null },
            },
          },
        },
      },
      include: {
        group: { select: { id: true, name: true, headCompanyId: true } },
        organization: { select: orgSelect },
      },
    });
    res.json(
      links.map((c) => ({
        id: c.id,
        groupId: c.groupId,
        groupName: c.group.name,
        organizationId: c.organizationId,
        name: c.organization.name,
        taxId: c.organization.taxId,
        permissions: c.sharedPermissions,
        isHead: c.group.headCompanyId === c.organizationId,
      })),
    );
  }),
);
invitationsRouter.get(
  "/:groupId/company-search",
  endpoint(async (req, res) => {
    res.json(
      await searchGroupCompanies(
        subject(req),
        param(req, "groupId"),
        req.query.q,
      ),
    );
  }),
);
invitationsRouter.post(
  "/:groupId/person-invitations",
  endpoint(async (req, res) => {
    const groupId = param(req, "groupId"),
      userId = subject(req),
      body = object(req.body),
      target = recipient(body.recipient),
      role = parseRole(body.role),
      granted = parsePermissions(body.permissions);
    if (typeof body.allCompanies !== "boolean")
      throw new GroupError(400, "Компанийн хүрээ сонгоно уу.");
    const code = invitationCode();
    const invitation = await mutate(groupId, async (db) => {
      const actor = await access(db, userId, groupId, "admin");
      const ids = await companyScope(
        db,
        groupId,
        body.companyIds,
        body.allCompanies as boolean,
      );
      assertDelegation(actor, {
        role,
        allCompanies: body.allCompanies as boolean,
        permissions: granted,
        companyIds: ids,
      });
      const candidates = await db.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          ...(target.includes("@")
            ? { email: { equals: target, mode: "insensitive" } }
            : { profile: { phoneNumber: target } }),
        },
        select: { id: true },
        take: 2,
      });
      if (candidates.length > 1)
        throw new GroupError(
          409,
          "Дугаар олон бүртгэлтэй байна. Имэйлээр урина уу.",
        );
      const targetId = candidates[0]?.id;
      if (
        targetId &&
        (await db.groupMember.findFirst({
          where: { groupId, userId: targetId, revokedAt: null },
        }))
      )
        throw new GroupError(409, "Энэ хүн группийн идэвхтэй гишүүн байна.");
      await db.groupPersonInvitation.updateMany({
        where: {
          groupId,
          recipient: target,
          status: "PENDING",
          expiresAt: { lte: new Date() },
        },
        data: { status: "EXPIRED", respondedAt: new Date() },
      });
      await db.groupPersonInvitation.updateMany({
        where: { groupId, recipient: target, status: "PENDING" },
        data: { status: "CANCELLED", respondedAt: new Date() },
      });
      const created = await db.groupPersonInvitation.create({
        data: {
          groupId,
          recipient: target,
          recipientUserId: targetId,
          role,
          permissions: granted,
          allCompanies: body.allCompanies as boolean,
          companyIds: ids,
          tokenHash: hashCode(code),
          expiresAt: expires(),
          createdById: userId,
          deliveryStatus: target.includes("@") ? "PENDING" : "SHARE_CODE",
        },
        include: { group: { select: groupSelect } },
      });
      await audit(db, groupId, userId, "PERSON_INVITED", created.id, {
        recipient: target,
        role,
        permissions: granted,
        companyIds: ids,
        allCompanies: created.allCompanies,
      });
      return created;
    });
    let deliveryStatus = invitation.deliveryStatus;
    if (target.includes("@")) {
      deliveryStatus = "SHARE_CODE";
      if (emailService.isConfigured()) {
        try {
          await emailService.send({
            to: target,
            template: {
              subject: `${invitation.group.name} — группийн урилга`,
              text: `${invitation.group.name} группт урьж байна. MGL Business → Миний группүүд → Урилгууд → Урилгын код хэсэгт ${code} кодыг оруулна уу. Урилга 7 хоног хүчинтэй.`,
              html: emailLayout({
                title: "Группийн урилга",
                preview: invitation.group.name,
                content: `<p>${safe(invitation.group.name)} группт урьж байна.</p><p>MGL Business → Миний группүүд → Урилгууд → Урилгын код:</p><p><strong>${safe(code)}</strong></p><p>Урилга 7 хоног хүчинтэй.</p>`,
              }),
            },
          });
          deliveryStatus = "EMAIL_SENT";
        } catch {
          deliveryStatus = "DELIVERY_FAILED";
        }
      }
      await prisma.groupPersonInvitation.update({
        where: { id: invitation.id },
        data: { deliveryStatus },
      });
    }
    res.status(201).json({
      id: invitation.id,
      code,
      deliveryStatus,
      expiresAt: invitation.expiresAt,
    });
  }),
);
invitationsRouter.post(
  "/:groupId/company-invitations",
  endpoint(async (req, res) => {
    const groupId = param(req, "groupId"),
      userId = subject(req),
      body = object(req.body),
      organizationId = text(body.organizationId),
      granted = parsePermissions(body.permissions);
    if (!granted.length)
      throw new GroupError(400, "Хуваалцах мэдээлэл сонгоно уу.");
    const result = await mutate(groupId, async (db) => {
      await access(db, userId, groupId, "admin");
      const organization = await db.organization.findFirst({
        where: { id: organizationId, deletedAt: null, status: "ACTIVE" },
      });
      if (!organization) throw new GroupError(404, "Компани олдсонгүй.");
      if (
        await db.groupCompany.findFirst({
          where: { groupId, organizationId, disconnectedAt: null },
        })
      )
        throw new GroupError(409, "Компани энэ группт холбогдсон байна.");
      await db.groupCompanyInvitation.updateMany({
        where: {
          groupId,
          organizationId,
          status: "PENDING",
          expiresAt: { lte: new Date() },
        },
        data: { status: "EXPIRED", respondedAt: new Date() },
      });
      await db.groupCompanyInvitation.updateMany({
        where: { groupId, organizationId, status: "PENDING" },
        data: { status: "CANCELLED", respondedAt: new Date() },
      });
      const created = await db.groupCompanyInvitation.create({
        data: {
          groupId,
          organizationId,
          permissions: granted,
          createdById: userId,
          expiresAt: expires(),
        },
      });
      await audit(db, groupId, userId, "COMPANY_INVITED", created.id, {
        organizationId,
        permissions: granted,
      });
      return created;
    });
    res.status(201).json({ id: result.id });
  }),
);
invitationsRouter.post(
  "/invitations/preview",
  endpoint(async (req, res) => {
    const code = text(object(req.body).code, 100),
      userId = subject(req);
    const invitation = await prisma.groupPersonInvitation.findUnique({
      where: { tokenHash: hashCode(code) },
      include: { group: { select: groupSelect } },
    });
    if (!invitation) throw new GroupError(404, "Урилгын код олдсонгүй.");
    await assertRecipient(prisma, invitation, userId, code);
    assertPending(invitation.status, invitation.expiresAt);
    const scope = await prisma.groupCompany.findMany({
      where: { groupId: invitation.groupId, id: { in: invitation.companyIds } },
      select: { organization: { select: orgSelect } },
    });
    res.json({
      groupName: invitation.group.name,
      role: invitation.role,
      permissions: invitation.permissions,
      allCompanies: invitation.allCompanies,
      companies: scope.map((c) => c.organization),
      expiresAt: invitation.expiresAt,
    });
  }),
);
invitationsRouter.post(
  "/invitations/claim",
  endpoint(async (req, res) => {
    const body = object(req.body),
      code = text(body.code, 100),
      userId = subject(req);
    const invitation = await prisma.groupPersonInvitation.findUnique({
      where: { tokenHash: hashCode(code) },
    });
    if (!invitation) throw new GroupError(404, "Урилгын код олдсонгүй.");
    await respondPerson(invitation.id, userId, "ACCEPTED", code);
    res.json({ ok: true });
  }),
);
invitationsRouter.post(
  "/invitations/:kind/:invitationId/respond",
  endpoint(async (req, res) => {
    const kind = param(req, "kind"),
      id = param(req, "invitationId"),
      userId = subject(req),
      body = object(req.body);
    if (
      body.action !== "ACCEPTED" &&
      body.action !== "REJECTED" &&
      body.action !== "CANCELLED"
    )
      throw new GroupError(400, "Урилгын үйлдэл буруу байна.");
    if (kind === "PERSON") await respondPerson(id, userId, body.action);
    else if (kind === "COMPANY") {
      const found = await prisma.groupCompanyInvitation.findUnique({
        where: { id },
      });
      if (!found) throw new GroupError(404, "Урилга олдсонгүй.");
      await mutate(found.groupId, async (db) => {
        const invitation = await db.groupCompanyInvitation.findUniqueOrThrow({
          where: { id },
        });
        if (
          body.organizationId !== undefined &&
          body.organizationId !== invitation.organizationId
        )
          throw new GroupError(
            403,
            "Энэ хүсэлт өөр компанид зориулагдсан байна.",
          );
        if (body.action === "CANCELLED")
          await access(db, userId, invitation.groupId, "admin");
        else await companyOwner(db, userId, invitation.organizationId);
        assertPending(invitation.status, invitation.expiresAt);
        if (body.action === "ACCEPTED") {
          await access(db, invitation.createdById, invitation.groupId, "admin");
          const linked = await db.groupCompany.findUnique({
            where: {
              groupId_organizationId: {
                groupId: invitation.groupId,
                organizationId: invitation.organizationId,
              },
            },
          });
          if (linked && !linked.disconnectedAt)
            throw new GroupError(409, "Компани аль хэдийн холбогдсон байна.");
          await db.groupCompany.upsert({
            where: {
              groupId_organizationId: {
                groupId: invitation.groupId,
                organizationId: invitation.organizationId,
              },
            },
            create: {
              groupId: invitation.groupId,
              organizationId: invitation.organizationId,
              sharedPermissions: invitation.permissions,
            },
            update: {
              disconnectedAt: null,
              joinedAt: new Date(),
              sharedPermissions: invitation.permissions,
            },
          });
        }
        await db.groupCompanyInvitation.update({
          where: { id },
          data: { status: String(body.action), respondedAt: new Date() },
        });
        await audit(
          db,
          invitation.groupId,
          userId,
          `COMPANY_INVITATION_${body.action}`,
          id,
          {
            organizationId: invitation.organizationId,
            permissions: invitation.permissions,
          },
        );
      });
    } else throw new GroupError(400, "Урилгын төрөл буруу байна.");
    res.json({ ok: true });
  }),
);
async function respondPerson(
  id: string,
  userId: string,
  action: "ACCEPTED" | "REJECTED" | "CANCELLED",
  code?: string,
) {
  const found = await prisma.groupPersonInvitation.findUnique({
    where: { id },
  });
  if (!found) throw new GroupError(404, "Урилга олдсонгүй.");
  await mutate(found.groupId, async (db) => {
    const invitation = await db.groupPersonInvitation.findUniqueOrThrow({
      where: { id },
    });
    if (action === "CANCELLED")
      await access(db, userId, invitation.groupId, "admin");
    else {
      await assertRecipient(db, invitation, userId, code);
    }
    assertPending(invitation.status, invitation.expiresAt);
    if (action === "ACCEPTED") {
      // Sender must still be authorized when consent is given; old invitations
      // cannot restore access after the inviter was revoked or demoted.
      const sender = await access(
        db,
        invitation.createdById,
        invitation.groupId,
        "admin",
      );
      if (
        invitation.deliveryStatus === "IN_APP_STAFF" &&
        !(
          await monitorCandidates(
            db,
            invitation.createdById,
            invitation.groupId,
          )
        ).some((p) => p.userId === userId)
      )
        throw new GroupError(
          403,
          "Ажилтны идэвхтэй харьяалал өөрчлөгдсөн байна. Шинэ урилга шаардлагатай.",
        );
      assertDelegation(sender, {
        role: invitation.role,
        allCompanies: invitation.allCompanies,
        permissions: invitation.permissions,
        companyIds: invitation.companyIds,
      });
      const ids = await companyScope(
        db,
        invitation.groupId,
        invitation.companyIds,
        invitation.allCompanies,
      );
      const current = await db.groupMember.findUnique({
        where: { groupId_userId: { groupId: invitation.groupId, userId } },
      });
      if (current && !current.revokedAt)
        throw new GroupError(409, "Та аль хэдийн группийн гишүүн байна.");
      const member = await db.groupMember.upsert({
        where: { groupId_userId: { groupId: invitation.groupId, userId } },
        create: {
          groupId: invitation.groupId,
          userId,
          role: invitation.role,
          permissions: invitation.permissions,
          allCompanies: invitation.allCompanies,
        },
        update: {
          role: invitation.role,
          permissions: invitation.permissions,
          allCompanies: invitation.allCompanies,
          revokedAt: null,
        },
      });
      await db.groupMemberCompanyAccess.deleteMany({
        where: { memberId: member.id },
      });
      if (!invitation.allCompanies)
        await db.groupMemberCompanyAccess.createMany({
          data: ids.map((companyId) => ({
            groupId: invitation.groupId,
            memberId: member.id,
            companyId,
            permissions: invitation.permissions,
          })),
        });
    }
    await db.groupPersonInvitation.update({
      where: { id },
      data: {
        status: action,
        respondedAt: new Date(),
        ...(action !== "CANCELLED" ? { recipientUserId: userId } : {}),
      },
    });
    await audit(
      db,
      invitation.groupId,
      userId,
      `PERSON_INVITATION_${action}`,
      id,
      { recipient: invitation.recipient },
    );
  });
}

async function assertRecipient(
  db: Parameters<typeof access>[0],
  invitation: {
    recipientUserId: string | null;
    recipient: string;
    tokenHash: string;
  },
  userId: string,
  code?: string,
) {
  const user = await db.user.findFirst({
    where: { id: userId, isActive: true, deletedAt: null },
    include: { profile: true },
  });
  if (!user) throw new GroupError(403, "Идэвхтэй бүртгэл шаардлагатай.");
  const matches = invitation.recipientUserId
    ? invitation.recipientUserId === userId
    : !!code &&
      hashCode(code) === invitation.tokenHash &&
      (invitation.recipient === user.email.toLowerCase() ||
        invitation.recipient === user.profile?.phoneNumber);
  if (!matches)
    throw new GroupError(403, "Урилга өөр хэрэглэгчид зориулагдсан байна.");
}
