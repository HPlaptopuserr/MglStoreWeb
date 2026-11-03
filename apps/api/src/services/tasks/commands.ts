import { OrganizationTaskPriority, type Prisma } from "@mgl/database";
import { taskPayloadInclude } from "./payload";

export interface CreateTaskInput {
  plannedStartAt?: Date | null;
  planPeriod?: string | null;
  title: string;
  description?: string | null;
  priority: OrganizationTaskPriority;
  dueAt: Date | null;
  assigneeIds: string[];
  subTasks: string[];
}
export function createTask(
  db: Prisma.TransactionClient,
  organizationId: string,
  createdById: string,
  input: CreateTaskInput,
  source?:
    | { sourceGroupId: string; clientRequestId: string }
    | {
        recurrenceKey: string;
        recurrenceDate: string;
        recurrenceThrough: string;
        recurrenceTimeZone: string;
        recurrenceFingerprint: string;
      },
) {
  return db.organizationTask.create({
    data: {
      organizationId,
      createdById,
      title: input.title,
      description: input.description?.trim() || null,
      priority: input.priority,
      dueAt: input.dueAt,
      plannedStartAt: input.plannedStartAt,
      planPeriod: input.planPeriod,
      ...source,
      assignees: { create: input.assigneeIds.map((userId) => ({ userId })) },
      subTasks: {
        create: input.subTasks.map((title, sortOrder) => ({
          title,
          sortOrder,
        })),
      },
    },
    include: taskPayloadInclude,
  });
}

export interface TaskReviewInput {
  performanceStars: number;
  productivityPercent: number;
  note: string | null;
  submittedAt?: Date;
}
/** Compare-and-set plus log must run inside the caller's authorized transaction. */
export async function approveTaskAssignment(
  db: Prisma.TransactionClient,
  assigneeId: string,
  reviewerId: string,
  input: TaskReviewInput,
): Promise<boolean> {
  const claimed = await db.organizationTaskAssignee.updateMany({
    where: {
      id: assigneeId,
      status: "PENDING_REVIEW",
      ...(input.submittedAt ? { submittedAt: input.submittedAt } : {}),
    },
    data: {
      status: "DONE",
      completedAt: new Date(),
      approvedAt: new Date(),
      approvedById: reviewerId,
      performanceStars: input.performanceStars,
      productivityPercent: input.productivityPercent,
      evaluationNote: input.note,
    },
  });
  if (claimed.count !== 1) return false;
  await db.organizationTaskApprovalLog.create({
    data: {
      assigneeId,
      approvedById: reviewerId,
      action: "APPROVED",
      note: input.note,
    },
  });
  return true;
}
