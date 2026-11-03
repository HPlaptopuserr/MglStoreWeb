import { prisma, type Prisma } from "@mgl/database";
import type { Request } from "express";
import type { AuthPayload } from "../../middleware/auth";
import { GroupError, effectivePermissions } from "./policy";
export type GroupDb = Prisma.TransactionClient;
export function subject(req: Request): string {
  const auth = (req as Request & { user?: AuthPayload }).user;
  if (!auth) throw new GroupError(401, "Нэвтэрнэ үү.");
  return auth.userId;
}
export async function access(
  db: GroupDb,
  userId: string,
  groupId: string,
  level: "view" | "admin" | "owner" = "view",
) {
  const member = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: {
      group: {
        include: {
          owner: { select: { profile: { select: { fullName: true } } } },
        },
      },
      companyAccess: true,
      user: { select: { isActive: true, deletedAt: true } },
    },
  });
  if (
    !member ||
    member.revokedAt ||
    !member.user.isActive ||
    member.user.deletedAt
  )
    throw new GroupError(403, "Группт хандах эрхгүй байна.");
  if (level === "owner" && member.group.ownerId !== userId)
    throw new GroupError(403, "Зөвхөн группийн Owner энэ үйлдлийг хийнэ.");
  if (
    level === "admin" &&
    member.group.ownerId !== userId &&
    member.role !== "ADMIN"
  )
    throw new GroupError(403, "Групп удирдах эрхгүй байна.");
  return member;
}
export async function companyOwner(
  db: GroupDb,
  userId: string,
  organizationId: string,
) {
  const owner = await db.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      role: "OWNER",
      isActive: true,
      deletedAt: null,
      user: { isActive: true, deletedAt: null },
      organization: { deletedAt: null, status: "ACTIVE" },
    },
  });
  if (!owner)
    throw new GroupError(403, "Зөвхөн тухайн компанийн Owner зөвшөөрнө.");
}
export async function lockGroup(db: GroupDb, groupId: string) {
  await db.$queryRaw`SELECT id FROM "OrganizationGroup" WHERE id = ${groupId} FOR UPDATE`;
}
export async function mutate<T>(
  groupId: string,
  run: (db: GroupDb) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (db) => {
      await lockGroup(db, groupId);
      const result = await run(db);
      await db.organizationGroup.update({
        where: { id: groupId },
        data: { revision: { increment: 1 } },
      });
      return result;
    },
    { timeout: 15_000 },
  );
}
export async function audit(
  db: GroupDb,
  groupId: string,
  actorId: string,
  action: string,
  entityId: string,
  details: Prisma.InputJsonValue,
) {
  await db.groupAuditLog.create({
    data: { groupId, actorId, action, entityId, details },
  });
}
export async function allowedCompanies(
  db: GroupDb,
  userId: string,
  groupId: string,
) {
  const member = await access(db, userId, groupId);
  const companies = await db.groupCompany.findMany({
    where: {
      groupId,
      disconnectedAt: null,
      organization: { deletedAt: null, status: "ACTIVE" },
    },
    include: { organization: { include: { workforcePolicy: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return {
    member,
    companies: companies
      .map((c) => ({
        ...c,
        effectivePermissions: effectivePermissions(member, c),
      }))
      .filter((c) => c.effectivePermissions.length > 0),
  };
}

export async function companyScope(
  db: GroupDb,
  groupId: string,
  value: unknown,
  all: boolean,
): Promise<string[]> {
  if (
    !Array.isArray(value) ||
    !value.every((v): v is string => typeof v === "string") ||
    value.length > 100
  )
    throw new GroupError(400, "Компаниудын хүрээ буруу байна.");
  const ids = [...new Set(value)];
  if (all) return [];
  if (!ids.length)
    throw new GroupError(400, "Дор хаяж нэг компани сонгоно уу.");
  const count = await db.groupCompany.count({
    where: { id: { in: ids }, groupId, disconnectedAt: null },
  });
  if (count !== ids.length)
    throw new GroupError(
      400,
      "Өөр группийн эсвэл идэвхгүй компани сонгосон байна.",
    );
  return ids;
}
