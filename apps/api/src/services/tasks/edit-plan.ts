import { OrganizationTaskPriority, prisma } from "@mgl/database";
import { canManageOrganizationTasks } from "../task-assignment-policy";
import { wallNow } from "../workforce/calculation";
import { TaskPlanError } from "./daily-plan";
import { taskPayloadInclude } from "./payload";

export async function editTaskPlan(
  taskId: string,
  actorId: string,
  value: unknown,
) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TaskPlanError(400, "Засварын мэдээлэл буруу байна.");
  const body = value as Record<string, unknown>;
  if (
    typeof body.title !== "string" ||
    !body.title.trim() ||
    body.title.trim().length > 200 ||
    typeof body.description !== "string" ||
    body.description.length > 4000 ||
    typeof body.priority !== "string" ||
    !Object.values<string>(OrganizationTaskPriority).includes(body.priority) ||
    typeof body.dueAt !== "string"
  )
    throw new TaskPlanError(
      400,
      "Гарчиг, тайлбар, зэрэг, хугацаагаа шалгана уу.",
    );
  const title = body.title.trim(),
    description = body.description.trim(),
    priority = body.priority as OrganizationTaskPriority,
    dueAt = new Date(body.dueAt);
  if (!Number.isFinite(+dueAt))
    throw new TaskPlanError(400, "Дуусах огноо буруу байна.");
  return prisma.$transaction(async (db) => {
    // Evidence submission and approval update these same assignment rows.
    await db.$queryRaw`SELECT id FROM "OrganizationTaskAssignee" WHERE "taskId" = ${taskId} ORDER BY id FOR UPDATE`;
    const task = await db.organizationTask.findFirst({
      where: { id: taskId, deletedAt: null },
      include: { assignees: true },
    });
    if (!task) throw new TaskPlanError(404, "Ажил олдсонгүй.");
    if (
      typeof body.updatedAt !== "string" ||
      +new Date(body.updatedAt) !== +task.updatedAt
    )
      throw new TaskPlanError(
        409,
        "Ажил өөрчлөгдсөн байна. Шинэчилж дахин засна уу.",
      );
    const member = await db.organizationMember.findFirst({
      where: {
        organizationId: task.organizationId,
        userId: actorId,
        isActive: true,
        deletedAt: null,
        user: { isActive: true, deletedAt: null },
        organization: { status: "ACTIVE", deletedAt: null },
      },
    });
    const ownPlan =
      task.createdById === actorId &&
      task.assignees.length === 1 &&
      task.assignees[0]?.userId === actorId;
    if (!member || (!canManageOrganizationTasks(member.role) && !ownPlan))
      throw new TaskPlanError(403, "Энэ ажлыг засах эрхгүй байна.");
    if (
      !task.assignees.length ||
      task.assignees.some((a) => !["PENDING", "IN_PROGRESS"].includes(a.status))
    )
      throw new TaskPlanError(
        409,
        "Шалгуулсан, батлагдсан эсвэл цуцлагдсан ажлыг засахгүй.",
      );
    if (
      task.recurrenceDate &&
      wallNow(task.recurrenceTimeZone ?? "Asia/Ulaanbaatar", dueAt)
        .toISOString()
        .slice(0, 10) !== task.recurrenceDate
    )
      throw new TaskPlanError(
        400,
        "Давтагдах ажлын өдрийг өөрчлөхгүй. Тухайн өдрийн цагийг засаж болно.",
      );
    return db.organizationTask.update({
      where: { id: taskId },
      data: {
        title,
        description: description || null,
        priority,
        dueAt,
        plannedStartAt:
          task.recurrenceKey || +dueAt === +(task.dueAt ?? dueAt)
            ? task.plannedStartAt
            : null,
        planPeriod:
          task.recurrenceKey || +dueAt === +(task.dueAt ?? dueAt)
            ? task.planPeriod
            : null,
      },
      include: taskPayloadInclude,
    });
  });
}

export async function cancelTaskPlan(taskId: string, actorId: string) {
  return prisma.$transaction(async (db) => {
    await db.$queryRaw`SELECT id FROM "OrganizationTaskAssignee" WHERE "taskId" = ${taskId} ORDER BY id FOR UPDATE`;
    const task = await db.organizationTask.findFirst({
      where: { id: taskId, deletedAt: null },
      include: { assignees: true },
    });
    if (!task) throw new TaskPlanError(404, "Ажил олдсонгүй.");
    const member = await db.organizationMember.findFirst({
      where: {
        organizationId: task.organizationId,
        userId: actorId,
        isActive: true,
        deletedAt: null,
        user: { isActive: true, deletedAt: null },
        organization: { deletedAt: null, status: "ACTIVE" },
      },
    });
    if (
      !member ||
      (!canManageOrganizationTasks(member.role) && task.createdById !== actorId)
    )
      throw new TaskPlanError(403, "Ажил цуцлах эрхгүй байна.");
    const targets = task.assignees.filter(
      (a) => a.status !== "DONE" && a.status !== "CANCELLED",
    );
    if (!targets.length)
      throw new TaskPlanError(409, "Энэ ажил дууссан эсвэл цуцлагдсан байна.");
    await db.organizationTaskAssignee.updateMany({
      where: { id: { in: targets.map((a) => a.id) } },
      data: {
        status: "CANCELLED",
        completedAt: null,
        submittedAt: null,
        approvedAt: null,
        approvedById: null,
      },
    });
    await db.organizationTaskApprovalLog.createMany({
      data: targets.map((a) => ({
        assigneeId: a.id,
        approvedById: actorId,
        action: "CANCELLED",
        note: "Тухайн өдрийн ажлыг цуцалсан",
      })),
    });
    return db.organizationTask.findUniqueOrThrow({
      where: { id: taskId },
      include: taskPayloadInclude,
    });
  });
}
