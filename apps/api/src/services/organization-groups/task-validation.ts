import { OrganizationTaskPriority } from "@mgl/database";
import type { CreateTaskInput, TaskReviewInput } from "../tasks/commands";
import { GroupError, object, text } from "./policy";

export function groupTaskInput(
  value: unknown,
): CreateTaskInput & { clientRequestId: string } {
  const body = object(value);
  const priority = body.priority ?? "NORMAL";
  if (
    typeof priority !== "string" ||
    !Object.values<string>(OrganizationTaskPriority).includes(priority)
  )
    throw new GroupError(400, "Ач холбогдлын утга буруу байна.");
  const dueAt = new Date(text(body.dueAt, 40));
  if (!Number.isFinite(+dueAt))
    throw new GroupError(400, "Дуусах огноо буруу байна.");
  const assigneeIds = stringList(body.assigneeIds, 20, 160);
  if (!assigneeIds.length)
    throw new GroupError(400, "Хариуцах удирдлага сонгоно уу.");
  return {
    title: text(body.title, 200),
    description: text(body.description, 4000, true),
    priority: priority as OrganizationTaskPriority,
    dueAt,
    assigneeIds,
    subTasks: stringList(body.subTasks ?? [], 20, 200),
    clientRequestId: text(body.clientRequestId, 100),
  };
}
function stringList(value: unknown, count: number, length: number): string[] {
  if (!Array.isArray(value) || value.length > count)
    throw new GroupError(400, "Жагсаалтын хэмжээ буруу байна.");
  return [...new Set(value.map((item: unknown) => text(item, length)))];
}
export function groupReviewInput(
  value: unknown,
): TaskReviewInput & { assigneeId: string } {
  const body = object(value);
  const stars = body.performanceStars,
    percent = body.productivityPercent;
  if (
    typeof stars !== "number" ||
    !Number.isInteger(stars) ||
    stars < 1 ||
    stars > 10 ||
    typeof percent !== "number" ||
    !Number.isInteger(percent) ||
    percent < 0 ||
    percent > 100
  )
    throw new GroupError(400, "Үнэлгээ 1–10, бүтээмж 0–100 байна.");
  const submittedAt = new Date(text(body.submittedAt, 40));
  if (!Number.isFinite(+submittedAt))
    throw new GroupError(400, "Шалгаж буй тайлангийн огноо шаардлагатай.");
  return {
    submittedAt,
    assigneeId: text(body.assigneeId),
    performanceStars: stars,
    productivityPercent: percent,
    note: text(body.note, 2000, true) || null,
  };
}
