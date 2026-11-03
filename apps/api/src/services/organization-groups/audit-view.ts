import type { Prisma } from "@mgl/database";
const permissionNames: Record<string, string> = {
  ATTENDANCE_VIEW: "Ирц",
  EMPLOYEES_VIEW: "Ажилтан",
  PLANS_VIEW: "Төлөвлөгөө харах",
  PLANS_ASSIGN: "Удирдлагад ажил оноох",
  PLANS_REVIEW: "Гүйцэтгэл батлах",
};
function display(
  value: Prisma.JsonValue | undefined,
  names: ReadonlyMap<string, string>,
): string {
  if (value === undefined || value === null) return "Сонгоогүй";
  if (Array.isArray(value))
    return value.map((v) => display(v, names)).join(", ") || "Эрхгүй";
  if (typeof value === "string")
    return (
      names.get(value) ??
      permissionNames[value] ??
      { OWNER: "Owner", ADMIN: "Admin", MANAGER: "Удирдлага" }[value] ??
      "Өөрчлөгдсөн"
    );
  if (typeof value === "object")
    return [value.role, value.permissions, value.name]
      .filter((v) => v !== undefined)
      .map((v) => display(v, names))
      .join(" · ");
  return String(value);
}
export function auditSummary(
  action: string,
  details: Prisma.JsonValue,
  names: ReadonlyMap<string, string>,
): string {
  if (!details || typeof details !== "object" || Array.isArray(details))
    return "";
  if (
    action === "HEAD_CHANGED" ||
    action === "MEMBER_UPDATED" ||
    action === "SHARING_UPDATED" ||
    action === "OWNERSHIP_TRANSFERRED"
  )
    return `${display(details.before, names)} → ${display(details.after, names)}`;
  if (action === "PLAN_ASSIGNED")
    return typeof details.title === "string"
      ? details.title
      : "Удирдлагад ажил оноосон";
  if (action === "PLAN_APPROVED")
    return `Үнэлгээ: ${details.performanceStars}/10 · Бүтээмж: ${details.productivityPercent}%`;
  if (action === "PERSON_INVITED")
    return typeof details.recipient === "string" ? details.recipient : "";
  if (action === "GROUP_CREATED" || action === "GROUP_UPDATED")
    return "Группийн мэдээлэл хадгалагдсан";
  return "Өөрчлөлт бүртгэгдсэн";
}
