import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@mgl/database";
import { canAssignTaskToRole } from "../task-assignment-policy";
import { wallNow, wallToInstant } from "../workforce/calculation";
import { type CreateTaskInput } from "./commands";
import { taskPayloadInclude } from "./payload";

export class TaskPlanError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export function dailyOccurrences(
  start: Date,
  through: string,
  timeZone: string,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(through))
    throw new TaskPlanError(400, "Давталтын эцсийн огноо буруу байна.");
  const end = new Date(`${through}T00:00:00.000Z`);
  if (!Number.isFinite(+end) || end.toISOString().slice(0, 10) !== through)
    throw new TaskPlanError(400, "Эцсийн огноо буруу байна.");
  const wall = wallNow(timeZone, start);
  const day = new Date(
    Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()),
  );
  const count = Math.round((+end - +day) / 86400_000) + 1;
  if (count < 1 || count > 366)
    throw new TaskPlanError(400, "1–366 өдрийн давталтын хугацаа сонгоно уу.");
  return Array.from({ length: count }, (_, index) => {
    const next = new Date(+wall + index * 86400_000);
    return {
      date: next.toISOString().slice(0, 10),
      dueAt: wallToInstant(next, timeZone),
    };
  });
}
export async function createDailyPlan(
  organizationId: string,
  actorId: string,
  input: CreateTaskInput,
  value: unknown,
) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TaskPlanError(400, "Давталтын мэдээлэл буруу байна.");
  const config = value as Record<string, unknown>;
  if (
    config.frequency !== "DAILY" ||
    typeof config.through !== "string" ||
    typeof config.key !== "string" ||
    !/^[a-zA-Z0-9_-]{16,100}$/.test(config.key)
  )
    throw new TaskPlanError(400, "Өдөр тутмын давталтын мэдээлэл дутуу байна.");
  if (
    !input.dueAt ||
    input.assigneeIds.length < 1 ||
    input.assigneeIds.length > 20 ||
    input.title.length > 200 ||
    (input.description?.length ?? 0) > 4000
  )
    throw new TaskPlanError(
      400,
      "Давтагдах ажлын хэмжээ буруу байна. 20 хүртэл ажилтан сонгоно уу.",
    );
  const key = config.key,
    through = config.through;
  return prisma.$transaction(
    async (db) => {
      // Serialize retries for this tenant; a lost response must not create a
      // second month of tasks, and a partial month must never be committed.
      await db.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
      const caller = await db.organizationMember.findFirst({
        where: {
          organizationId,
          userId: actorId,
          isActive: true,
          deletedAt: null,
          organization: { deletedAt: null, status: "ACTIVE" },
          user: { isActive: true, deletedAt: null },
        },
      });
      if (!caller)
        throw new TaskPlanError(403, "Байгууллагад хандах эрхгүй байна.");
      const self =
        input.assigneeIds.length === 1 && input.assigneeIds[0] === actorId;
      const people = await db.organizationMember.findMany({
        where: {
          organizationId,
          userId: { in: input.assigneeIds },
          isActive: true,
          deletedAt: null,
          user: { isActive: true, deletedAt: null },
        },
        select: { userId: true, role: true },
      });
      if (
        people.length !== input.assigneeIds.length ||
        (!self && people.some((p) => !canAssignTaskToRole(caller.role, p.role)))
      )
        throw new TaskPlanError(
          403,
          "Сонгосон ажилтанд ажил оноох эрхгүй байна.",
        );
      const policy = await db.workforcePolicy.findUnique({
        where: { organizationId },
        select: { timeZone: true },
      });
      const timeZone = policy?.timeZone ?? "Asia/Ulaanbaatar";
      const occurrences = dailyOccurrences(input.dueAt!, through, timeZone);
      const { plannedStartAt, planPeriod, ...baseInput } = input;
      const fingerprint = createHash("sha256")
        .update(
          JSON.stringify({
            ...baseInput,
            ...(plannedStartAt ? { plannedStartAt } : {}),
            ...(planPeriod ? { planPeriod } : {}),
            assigneeIds: [...input.assigneeIds].sort(),
            through,
            timeZone,
          }),
        )
        .digest("hex");
      const previous = await db.organizationTask.findMany({
        where: { organizationId, createdById: actorId, recurrenceKey: key },
        orderBy: { recurrenceDate: "asc" },
        include: taskPayloadInclude,
      });
      if (previous.length) {
        if (
          previous.length !== occurrences.length ||
          previous.some((p) => p.recurrenceFingerprint !== fingerprint)
        )
          throw new TaskPlanError(
            409,
            "Энэ давталтын хүсэлт өмнө илгээгдсэн байна. Жагсаалтаа шинэчилнэ үү.",
          );
        return { tasks: previous, repeated: true };
      }
      const rows = occurrences.map((occurrence) => ({
        id: randomUUID(),
        organizationId,
        createdById: actorId,
        title: input.title,
        description: input.description?.trim() || null,
        priority: input.priority,
        dueAt: occurrence.dueAt,
        plannedStartAt: input.plannedStartAt,
        planPeriod: input.planPeriod,
        recurrenceKey: key,
        recurrenceDate: occurrence.date,
        recurrenceThrough: through,
        recurrenceTimeZone: timeZone,
        recurrenceFingerprint: fingerprint,
      }));
      // Insert one year as bounded batches instead of a network round trip for
      // each day, while preserving a separate task and checklist per occurrence.
      await db.organizationTask.createMany({ data: rows });
      const assignments = rows.flatMap((row) =>
        input.assigneeIds.map((userId) => ({ taskId: row.id, userId })),
      );
      for (let offset = 0; offset < assignments.length; offset += 1000)
        await db.organizationTaskAssignee.createMany({
          data: assignments.slice(offset, offset + 1000),
        });
      const subTasks = rows.flatMap((row) =>
        input.subTasks.map((title, sortOrder) => ({
          taskId: row.id,
          title,
          sortOrder,
        })),
      );
      for (let offset = 0; offset < subTasks.length; offset += 1000)
        await db.organizationTaskSubTask.createMany({
          data: subTasks.slice(offset, offset + 1000),
        });
      const tasks = await db.organizationTask.findMany({
        where: { id: { in: rows.map((r) => r.id) } },
        orderBy: { recurrenceDate: "asc" },
        include: taskPayloadInclude,
      });
      return { tasks, repeated: false };
    },
    { timeout: 30_000 },
  );
}
