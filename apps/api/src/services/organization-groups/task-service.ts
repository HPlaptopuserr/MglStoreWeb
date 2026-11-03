import {
  prisma,
  type Prisma,
  type OrganizationTaskStatus,
} from "@mgl/database";
import { audit } from "./access";
import { GroupError } from "./policy";
import { groupTaskAccess } from "./task-access";
import { groupReviewInput, groupTaskInput } from "./task-validation";
import { createTask, approveTaskAssignment } from "../tasks/commands";
import { taskStatus, taskStatusWhere } from "../tasks/lifecycle";

export interface GroupTaskContext {
  userId: string;
  groupId: string;
  organizationId: string;
}
const contextAccess = (
  db: Prisma.TransactionClient,
  c: GroupTaskContext,
  action: "PLANS_VIEW" | "PLANS_ASSIGN" | "PLANS_REVIEW" = "PLANS_VIEW",
) => groupTaskAccess(db, c.userId, c.groupId, c.organizationId, action);

export function groupTaskManagers(c: GroupTaskContext) {
  return prisma.$transaction(async (db) => {
    await contextAccess(db, c, "PLANS_ASSIGN");
    const managers = await db.organizationMember.findMany({
      where: {
        organizationId: c.organizationId,
        role: { in: ["OWNER", "ADMIN"] },
        isActive: true,
        deletedAt: null,
        userId: { not: c.userId },
        user: { isActive: true, deletedAt: null },
      },
      select: {
        userId: true,
        user: { select: { profile: { select: { fullName: true } } } },
      },
      orderBy: { userId: "asc" },
      take: 101,
    });
    if (managers.length > 100)
      throw new GroupError(422, "Удирдлагын жагсаалт хэт олон байна.");
    return managers.map((m) => ({
      userId: m.userId,
      name: m.user.profile?.fullName || "Удирдлага",
    }));
  });
}
export function createGroupTask(c: GroupTaskContext, value: unknown) {
  const input = groupTaskInput(value);
  return prisma.$transaction((db) =>
    createGroupTaskInTransaction(db, c, input),
  );
}
export async function createGroupTaskInTransaction(
  db: Prisma.TransactionClient,
  c: GroupTaskContext,
  input: ReturnType<typeof groupTaskInput>,
) {
  const { company } = await contextAccess(db, c, "PLANS_ASSIGN");
  const previous = await db.organizationTask.findUnique({
    where: {
      sourceGroupId_clientRequestId: {
        sourceGroupId: c.groupId,
        clientRequestId: input.clientRequestId,
      },
    },
    include: {
      assignees: { select: { userId: true } },
      subTasks: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (previous) {
    if (
      previous.organizationId !== c.organizationId ||
      previous.createdById !== c.userId ||
      previous.deletedAt ||
      previous.createdAt < company.joinedAt
    )
      throw new GroupError(409, "Энэ хүсэлтийн дугаар өмнө ашиглагдсан байна.");
    const same =
      previous.title === input.title &&
      previous.description === (input.description?.trim() || null) &&
      previous.priority === input.priority &&
      Number(previous.dueAt) === Number(input.dueAt) &&
      JSON.stringify(previous.assignees.map((a) => a.userId).sort()) ===
        JSON.stringify([...input.assigneeIds].sort()) &&
      JSON.stringify(previous.subTasks.map((s) => s.title)) ===
        JSON.stringify(input.subTasks);
    if (!same)
      throw new GroupError(
        409,
        "Өмнө илгээсэн хүсэлтийн мэдээлэл өөрчлөгдсөн байна. Жагсаалтаа шинэчилнэ үү.",
      );
    return { id: previous.id, repeated: true };
  }
  const managers = await db.organizationMember.count({
    where: {
      organizationId: c.organizationId,
      userId: { in: input.assigneeIds, not: c.userId },
      role: { in: ["OWNER", "ADMIN"] },
      isActive: true,
      deletedAt: null,
      user: { isActive: true, deletedAt: null },
    },
  });
  if (managers !== input.assigneeIds.length)
    throw new GroupError(
      400,
      "Тухайн компанийн идэвхтэй удирдлагыг сонгоно уу. Өөртөө оноохгүй.",
    );
  const task = await createTask(db, c.organizationId, c.userId, input, {
    sourceGroupId: c.groupId,
    clientRequestId: input.clientRequestId,
  });
  await audit(db, c.groupId, c.userId, "PLAN_ASSIGNED", task.id, {
    organizationId: c.organizationId,
    title: task.title,
    assigneeIds: input.assigneeIds,
  });
  return { id: task.id, repeated: false };
}

export function groupTaskList(
  c: GroupTaskContext,
  cursor?: string,
  status?: OrganizationTaskStatus,
) {
  return prisma.$transaction(async (db) => {
    const { company, permissions } = await contextAccess(db, c);
    const people = permissions.some((p) =>
      ["EMPLOYEES_VIEW", "PLANS_ASSIGN", "PLANS_REVIEW"].includes(p),
    );
    // A bounded task inbox keeps older unfinished plans visible, independent of dashboard dates.
    const tasks = await db.organizationTask.findMany({
      where: {
        organizationId: c.organizationId,
        deletedAt: null,
        createdAt: { gte: company.joinedAt },
        ...(cursor ? { id: { gt: cursor } } : {}),
        ...(status ? taskStatusWhere(status) : {}),
      },
      orderBy: { id: "asc" },
      take: 31,
      select: {
        id: true,
        title: true,
        dueAt: true,
        priority: true,
        sourceGroupId: true,
        assignees: {
          select: {
            userId: true,
            status: true,
            user: { select: { profile: { select: { fullName: true } } } },
          },
        },
      },
    });
    return {
      permissions,
      nextCursor: tasks.length > 30 ? tasks[29].id : null,
      tasks: tasks.slice(0, 30).map((t) => ({
        id: t.id,
        title: t.title,
        dueAt: t.dueAt,
        priority: t.priority,
        status: taskStatus(t.assignees),
        fromThisGroup: t.sourceGroupId === c.groupId,
        overdue:
          t.dueAt !== null &&
          t.dueAt < new Date() &&
          !["DONE", "CANCELLED"].includes(taskStatus(t.assignees)),
        managers: people
          ? t.assignees.map((a) => ({
              userId: a.userId,
              name: a.user?.profile?.fullName || "Удирдлага",
              status: a.status,
            }))
          : [],
      })),
    };
  });
}
export function groupTaskDetail(c: GroupTaskContext, taskId: string) {
  return prisma.$transaction(async (db) => {
    const { company, permissions } = await contextAccess(db, c);
    const people = permissions.some((p) =>
      ["EMPLOYEES_VIEW", "PLANS_ASSIGN", "PLANS_REVIEW"].includes(p),
    );
    const review = permissions.includes("PLANS_REVIEW");
    const task = await db.organizationTask.findFirst({
      where: {
        id: taskId,
        organizationId: c.organizationId,
        deletedAt: null,
        createdAt: { gte: company.joinedAt },
      },
      select: {
        id: true,
        organizationId: true,
        title: true,
        description: true,
        plannedStartAt: true,
        planPeriod: true,
        dueAt: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        subTasks: { orderBy: { sortOrder: "asc" }, take: 21 },
        assignees: {
          orderBy: { id: "asc" },
          take: 101,
          select: {
            id: true,
            userId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            completedAt: true,
            submittedAt: true,
            approvedAt: true,
            performanceStars: true,
            productivityPercent: true,
            evaluationNote: true,
            user: { select: { profile: { select: { fullName: true } } } },
            evidenceImages: {
              take: review ? 5 : 0,
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                url: true,
                originalName: true,
                sortOrder: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
    if (!task) throw new GroupError(404, "Ажил олдсонгүй.");
    if (
      task.assignees.length > 100 ||
      task.subTasks.length > 20 ||
      task.assignees.some((a) => a.evidenceImages.length > 4)
    )
      throw new GroupError(422, "Ажлын дэлгэрэнгүй хэт олон мөртэй байна.");
    return {
      ...task,
      permissions,
      status: taskStatus(task.assignees),
      createdBy: { id: "" },
      assignees: people
        ? task.assignees.map(({ user, createdAt, ...a }) => ({
            ...a,
            fullName: user.profile?.fullName || "Удирдлага",
            assignedAt: createdAt,
          }))
        : [],
    };
  });
}
export function reviewGroupTask(
  c: GroupTaskContext,
  taskId: string,
  value: unknown,
) {
  const input = groupReviewInput(value);
  return prisma.$transaction(async (db) => {
    const { company } = await contextAccess(db, c, "PLANS_REVIEW");
    const assignment = await db.organizationTaskAssignee.findFirst({
      where: {
        id: input.assigneeId,
        taskId,
        task: {
          organizationId: c.organizationId,
          deletedAt: null,
          createdAt: { gte: company.joinedAt },
        },
      },
      include: { evidenceImages: { select: { id: true } } },
    });
    if (!assignment) throw new GroupError(404, "Ажил олдсонгүй.");
    if (assignment.userId === c.userId)
      throw new GroupError(403, "Өөрийн ажлыг батлахгүй.");
    if (!assignment.evidenceImages.length)
      throw new GroupError(400, "Батлах зураг алга.");
    if (!(await approveTaskAssignment(db, assignment.id, c.userId, input)))
      throw new GroupError(
        409,
        "Шалгалт хүлээсэн ажлыг л батална. Шинэчилнэ үү.",
      );
    await audit(db, c.groupId, c.userId, "PLAN_APPROVED", taskId, {
      organizationId: c.organizationId,
      assigneeId: assignment.id,
      performanceStars: input.performanceStars,
      productivityPercent: input.productivityPercent,
    });
    return { ok: true };
  });
}
