import type { Prisma } from "@mgl/database";

export const taskPayloadInclude = {
  createdBy: {
    select: {
      id: true,
      email: true,
      profile: { select: { fullName: true, avatarUrl: true } },
    },
  },
  assignees: {
    orderBy: { createdAt: "asc" as const },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          profile: {
            select: { fullName: true, phoneNumber: true, avatarUrl: true },
          },
        },
      },
      evidenceImages: {
        orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      },
      approvalLogs: {
        orderBy: { createdAt: "desc" as const },
        include: {
          approvedBy: {
            select: {
              id: true,
              email: true,
              profile: { select: { fullName: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  },
  subTasks: {
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
  comments: {
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" as const },
    include: {
      author: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
    },
  },
};

export type TaskWithRelations = Prisma.OrganizationTaskGetPayload<{
  include: typeof taskPayloadInclude;
}>;

export function toTaskPayload(task: TaskWithRelations) {
  return {
    id: task.id,
    organizationId: task.organizationId,
    recurrence: task.recurrenceKey
      ? {
          key: task.recurrenceKey,
          frequency: "DAILY",
          date: task.recurrenceDate,
          through: task.recurrenceThrough,
          timeZone: task.recurrenceTimeZone,
        }
      : null,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueAt: task.dueAt,
    plannedStartAt: task.plannedStartAt,
    planPeriod: task.planPeriod,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    createdBy: {
      id: task.createdBy.id,
      email: task.createdBy.email,
      fullName: task.createdBy.profile?.fullName || task.createdBy.email,
      avatarUrl: task.createdBy.profile?.avatarUrl || null,
    },
    assignees: task.assignees.map((assignee) => ({
      id: assignee.id,
      userId: assignee.userId,
      status: assignee.status,
      completedAt: assignee.completedAt,
      submittedAt: assignee.submittedAt,
      approvedAt: assignee.approvedAt,
      approvedById: assignee.approvedById,
      performanceStars: assignee.performanceStars,
      productivityPercent: assignee.productivityPercent,
      evaluationNote: assignee.evaluationNote,
      assignedAt: assignee.createdAt,
      updatedAt: assignee.updatedAt,
      fullName: assignee.user.profile?.fullName || assignee.user.email,
      email: assignee.user.email,
      phone: assignee.user.profile?.phoneNumber || null,
      avatarUrl: assignee.user.profile?.avatarUrl || null,
      evidenceImages: assignee.evidenceImages.map((image) => ({
        id: image.id,
        url: image.url,
        originalName: image.originalName,
        sortOrder: image.sortOrder,
        createdAt: image.createdAt,
      })),
      approvalLogs: assignee.approvalLogs.map((log) => ({
        id: log.id,
        approvedById: log.approvedById,
        approvedByName:
          log.approvedBy.profile?.fullName || log.approvedBy.email,
        approvedByEmail: log.approvedBy.email,
        action: log.action,
        note: log.note,
        createdAt: log.createdAt,
      })),
    })),
    subTasks: task.subTasks.map((subTask) => ({
      id: subTask.id,
      title: subTask.title,
      isCompleted: subTask.isCompleted,
      completedAt: subTask.completedAt,
      sortOrder: subTask.sortOrder,
      createdAt: subTask.createdAt,
      updatedAt: subTask.updatedAt,
    })),
    comments: task.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        id: comment.author.id,
        email: comment.author.email,
        fullName: comment.author.profile?.fullName || comment.author.email,
        avatarUrl: comment.author.profile?.avatarUrl || null,
      },
    })),
  };
}
