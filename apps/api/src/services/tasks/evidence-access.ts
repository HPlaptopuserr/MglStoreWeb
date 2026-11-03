import { prisma } from "@mgl/database";
import { canManageOrganizationTasks } from "../task-assignment-policy";
import { groupTaskAccess } from "../organization-groups/task-access";
import { GroupError } from "../organization-groups/policy";

export async function canReadTaskEvidence(
  userId: string,
  filename: string,
): Promise<boolean> {
  const evidence = await prisma.organizationTaskEvidenceImage.findFirst({
    where: { url: `/api/org/tasks/evidence/uploads/${filename}` },
    include: { assignee: { include: { task: true } } },
  });
  const task = evidence?.assignee.task;
  if (!evidence || !task || task.deletedAt) return false;
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: task.organizationId,
      userId,
      isActive: true,
      deletedAt: null,
      user: { isActive: true, deletedAt: null },
      organization: { status: "ACTIVE", deletedAt: null },
    },
  });
  if (
    member &&
    (canManageOrganizationTasks(member.role) ||
      evidence.assignee.userId === userId ||
      task.createdById === userId)
  )
    return true;
  const groups = await prisma.groupMember.findMany({
    where: {
      userId,
      revokedAt: null,
      group: {
        companies: {
          some: { organizationId: task.organizationId, disconnectedAt: null },
        },
      },
    },
    select: { groupId: true },
  });
  for (const group of groups) {
    try {
      const allowed = await prisma.$transaction(async (db) => {
        const { company } = await groupTaskAccess(
          db,
          userId,
          group.groupId,
          task.organizationId,
          "PLANS_REVIEW",
        );
        return task.createdAt >= company.joinedAt;
      });
      if (allowed) return true;
    } catch (error: unknown) {
      if (!(error instanceof GroupError)) throw error;
    }
  }
  return false;
}
