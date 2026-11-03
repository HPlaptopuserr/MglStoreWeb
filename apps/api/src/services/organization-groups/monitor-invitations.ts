import { prisma, type Prisma } from "@mgl/database";
import {
  access,
  allowedCompanies,
  audit,
  companyScope,
  lockGroup,
} from "./access";
import {
  assertDelegation,
  GroupError,
  hashCode,
  invitationCode,
  object,
  parsePermissions,
} from "./policy";

export async function monitorCandidates(
  db: Prisma.TransactionClient,
  actorId: string,
  groupId: string,
) {
  await access(db, actorId, groupId, "admin");
  const { companies } = await allowedCompanies(db, actorId, groupId);
  const own = await db.organizationMember.findMany({
    where: {
      userId: actorId,
      organizationId: { in: companies.map((c) => c.organizationId) },
      role: { in: ["OWNER", "ADMIN"] },
      isActive: true,
      deletedAt: null,
    },
    select: { organizationId: true },
  });
  const ownIds = new Set(own.map((m) => m.organizationId));
  // A company Owner/Admin may already read their own staff. Other companies
  // must explicitly share employee information with this group and actor.
  const sources = companies.filter(
    (c) =>
      ownIds.has(c.organizationId) ||
      c.effectivePermissions.includes("EMPLOYEES_VIEW"),
  );
  const names = new Map(
    sources.map((c) => [c.organizationId, c.organization.name]),
  );
  const people = await db.organizationMember.findMany({
    where: {
      organizationId: { in: [...names.keys()] },
      userId: { not: actorId },
      isActive: true,
      deletedAt: null,
      user: { isActive: true, deletedAt: null },
    },
    select: {
      userId: true,
      organizationId: true,
      role: true,
      user: {
        select: { email: true, profile: { select: { fullName: true } } },
      },
    },
    take: 1001,
    orderBy: [{ userId: "asc" }, { organizationId: "asc" }],
  });
  if (people.length > 1000)
    throw new GroupError(
      422,
      "Ажилтны жагсаалт хэт олон байна. Компанийн хүрээг багасгана уу.",
    );
  return people.map((p) => ({
    userId: p.userId,
    name: p.user.profile?.fullName || "Ажилтан",
    email: p.user.email,
    companyName: names.get(p.organizationId)!,
    role: p.role,
  }));
}
export async function groupMonitorCandidates(actorId: string, groupId: string) {
  return prisma.$transaction(async (db) => {
    await lockGroup(db, groupId);
    const people = await monitorCandidates(db, actorId, groupId);
    const [members, invitations] = await Promise.all([
      db.groupMember.findMany({
        where: { groupId, revokedAt: null },
        select: { userId: true },
      }),
      db.groupPersonInvitation.findMany({
        where: { groupId, status: "PENDING", expiresAt: { gt: new Date() } },
        select: { recipientUserId: true },
      }),
    ]);
    const grouped = new Map<
      string,
      {
        userId: string;
        name: string;
        companies: string[];
        roles: string[];
        state: string;
      }
    >();
    for (const person of people) {
      const previous = grouped.get(person.userId);
      if (previous) {
        previous.companies.push(person.companyName);
        previous.roles.push(person.role);
      } else
        grouped.set(person.userId, {
          userId: person.userId,
          name: person.name,
          companies: [person.companyName],
          roles: [person.role],
          state: members.some((m) => m.userId === person.userId)
            ? "MEMBER"
            : invitations.some((i) => i.recipientUserId === person.userId)
              ? "PENDING"
              : "AVAILABLE",
        });
    }
    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
  });
}
export async function inviteGroupMonitors(
  actorId: string,
  groupId: string,
  value: unknown,
) {
  const body = object(value);
  if (
    !Array.isArray(body.userIds) ||
    body.userIds.length < 1 ||
    body.userIds.length > 20 ||
    body.userIds.some((id) => typeof id !== "string" || !id || id.length > 160)
  )
    throw new GroupError(400, "1–20 ажилтан сонгоно уу.");
  const ids = [...new Set(body.userIds as string[])];
  const granted = parsePermissions(body.permissions);
  if (!granted.length || typeof body.allCompanies !== "boolean")
    throw new GroupError(400, "Хянах хүрээ болон эрх сонгоно уу.");
  const allCompanies = body.allCompanies;
  return prisma.$transaction(
    async (db) => {
      await lockGroup(db, groupId);
      const actor = await access(db, actorId, groupId, "admin");
      const companyIds = await companyScope(
        db,
        groupId,
        body.companyIds,
        allCompanies,
      );
      assertDelegation(actor, {
        role: "MANAGER",
        permissions: granted,
        companyIds,
        allCompanies,
      });
      const people = await monitorCandidates(db, actorId, groupId);
      const available = new Map(people.map((p) => [p.userId, p]));
      const targets = ids.map((id) => {
        const person = available.get(id);
        if (!person)
          throw new GroupError(
            403,
            "Сонгосон ажилтан эрхтэй компанийн жагсаалтад алга.",
          );
        return person;
      });
      for (const person of targets) {
        if (
          await db.groupMember.findFirst({
            where: { groupId, userId: person.userId, revokedAt: null },
          })
        )
          throw new GroupError(
            409,
            "Сонгосон ажилтан группийн гишүүн байна. Жагсаалтаа шинэчилнэ үү.",
          );
        if (
          await db.groupPersonInvitation.findFirst({
            where: {
              groupId,
              recipientUserId: person.userId,
              status: "PENDING",
              expiresAt: { gt: new Date() },
            },
          })
        )
          throw new GroupError(
            409,
            "Ажилтанд урилга илгээгдсэн байна. Жагсаалтаа шинэчилнэ үү.",
          );
        await db.groupPersonInvitation.updateMany({
          where: {
            groupId,
            recipientUserId: person.userId,
            status: "PENDING",
            expiresAt: { lte: new Date() },
          },
          data: { status: "EXPIRED", respondedAt: new Date() },
        });
        const invitation = await db.groupPersonInvitation.create({
          data: {
            groupId,
            recipient: person.email.toLowerCase(),
            recipientUserId: person.userId,
            role: "MANAGER",
            permissions: granted,
            allCompanies,
            companyIds,
            createdById: actorId,
            tokenHash: hashCode(invitationCode()),
            expiresAt: new Date(Date.now() + 7 * 86400_000),
            deliveryStatus: "IN_APP_STAFF",
          },
        });
        await audit(db, groupId, actorId, "PERSON_INVITED", invitation.id, {
          userId: person.userId,
          role: "MANAGER",
          permissions: granted,
          allCompanies,
          companyIds,
          source: "STAFF_DIRECTORY",
        });
      }
      return { invitedCount: targets.length };
    },
    { timeout: 15_000 },
  );
}
