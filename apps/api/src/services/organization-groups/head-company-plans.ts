import { prisma, type Prisma } from "@mgl/database";
import { allowedCompanies, lockGroup } from "./access";
import { GroupError } from "./policy";
import { taskStatus } from "../tasks/lifecycle";

type Scope = {
  groupId: string;
  groupName: string;
  organizationId: string;
  companyName: string;
  joinedAt: Date;
  people: boolean;
};
function decodeCursor(value: unknown): { createdAt: Date; id: string } | null {
  if (value === undefined) return null;
  if (typeof value !== "string" || value.length > 500)
    throw new GroupError(400, "Хуудасны зааг буруу байна.");
  try {
    const data: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString(),
    );
    if (
      !data ||
      typeof data !== "object" ||
      !("id" in data) ||
      typeof data.id !== "string" ||
      !("createdAt" in data) ||
      typeof data.createdAt !== "string"
    )
      throw new Error();
    const createdAt = new Date(data.createdAt);
    if (!Number.isFinite(+createdAt) || !data.id || data.id.length > 160)
      throw new Error();
    return { createdAt, id: data.id };
  } catch {
    throw new GroupError(400, "Хуудасны зааг буруу байна.");
  }
}

/** Read the original child-company tasks. No copy or second approval is needed. */
export async function headCompanyPlans(
  userId: string,
  organizationId: string,
  cursorValue?: unknown,
) {
  const cursor = decodeCursor(cursorValue);
  return prisma.$transaction(
    async (db) => {
      const member = await db.organizationMember.findFirst({
        where: {
          userId,
          organizationId,
          isActive: true,
          deletedAt: null,
          user: { isActive: true, deletedAt: null },
          organization: { status: "ACTIVE", deletedAt: null },
        },
        select: { id: true },
      });
      if (!member)
        throw new GroupError(403, "Энэ толгой компанид хандах эрхгүй байна.");
      const memberships = await db.groupMember.findMany({
        where: {
          userId,
          revokedAt: null,
          group: { headCompanyId: organizationId },
        },
        select: { groupId: true, group: { select: { name: true } } },
        orderBy: { groupId: "asc" },
        take: 21,
      });
      if (memberships.length > 20)
        throw new GroupError(422, "Группийн хүрээг багасгана уу.");
      const scopes: Scope[] = [];
      for (const membership of memberships) {
        await lockGroup(db, membership.groupId);
        // Recheck the head-company assignment after waiting on a transfer.
        const group = await db.organizationGroup.findUnique({
          where: { id: membership.groupId },
          select: { headCompanyId: true },
        });
        if (group?.headCompanyId !== organizationId) continue;
        const { companies } = await allowedCompanies(
          db,
          userId,
          membership.groupId,
        );
        for (const company of companies) {
          if (
            company.organizationId === organizationId ||
            !company.organization.businessTasksEnabled ||
            !company.effectivePermissions.includes("PLANS_VIEW")
          )
            continue;
          scopes.push({
            groupId: membership.groupId,
            groupName: membership.group.name,
            organizationId: company.organizationId,
            companyName: company.organization.name,
            joinedAt: company.joinedAt,
            people: company.effectivePermissions.some((p) =>
              ["EMPLOYEES_VIEW", "PLANS_ASSIGN", "PLANS_REVIEW"].includes(p),
            ),
          });
        }
      }
      if (!scopes.length)
        return {
          isHeadCompany: memberships.length > 0,
          tasks: [],
          nextCursor: null,
        };
      const where: Prisma.OrganizationTaskWhereInput = {
        deletedAt: null,
        OR: scopes.map((s) => ({
          organizationId: s.organizationId,
          createdAt: { gte: s.joinedAt },
        })),
        ...(cursor
          ? {
              AND: [
                {
                  OR: [
                    { createdAt: { lt: cursor.createdAt } },
                    { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                  ],
                },
              ],
            }
          : {}),
      };
      const tasks = await db.organizationTask.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 21,
        select: {
          id: true,
          organizationId: true,
          title: true,
          dueAt: true,
          createdAt: true,
          recurrenceDate: true,
          recurrenceThrough: true,
          createdBy: { select: { profile: { select: { fullName: true } } } },
          assignees: { select: { userId: true, status: true } },
        },
      });
      const page = tasks.slice(0, 20);
      const last = page.at(-1);
      return {
        isHeadCompany: true,
        nextCursor:
          tasks.length > 20 && last
            ? Buffer.from(
                JSON.stringify({
                  createdAt: last.createdAt.toISOString(),
                  id: last.id,
                }),
              ).toString("base64url")
            : null,
        tasks: page.map((task) => {
          const scope = scopes.find(
            (s) =>
              s.organizationId === task.organizationId &&
              task.createdAt >= s.joinedAt,
          )!;
          return {
            id: task.id,
            groupId: scope.groupId,
            groupName: scope.groupName,
            organizationId: task.organizationId,
            companyName: scope.companyName,
            title: task.title,
            dueAt: task.dueAt,
            createdAt: task.createdAt,
            status: taskStatus(task.assignees),
            recurrenceDate: task.recurrenceDate,
            recurrenceThrough: task.recurrenceThrough,
            authorName: scope.people
              ? (task.createdBy.profile?.fullName ?? "Ажилтан")
              : null,
          };
        }),
      };
    },
    { timeout: 15_000 },
  );
}
