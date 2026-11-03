import { createHash, randomBytes } from "node:crypto";
import { normalizePhoneNumber } from "../../utils/phone-number";

export const permissions = [
  "ATTENDANCE_VIEW",
  "EMPLOYEES_VIEW",
  "PLANS_VIEW",
  "PLANS_ASSIGN",
  "PLANS_REVIEW",
] as const;
export type GroupPermission = (typeof permissions)[number];
export type GroupRole = "OWNER" | "ADMIN" | "MANAGER";
export class GroupError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new GroupError(400, "Мэдээллийн бүтэц буруу байна.");
  return value as Record<string, unknown>;
}
export function text(value: unknown, maximum = 160, optional = false): string {
  if (value === undefined && optional) return "";
  if (
    typeof value !== "string" ||
    value.trim().length > maximum ||
    (!optional && !value.trim())
  )
    throw new GroupError(400, "Талбарын утга эсвэл урт буруу байна.");
  return value.trim();
}
export function parsePermissions(value: unknown): GroupPermission[] {
  if (
    !Array.isArray(value) ||
    !value.every(
      (p): p is GroupPermission =>
        typeof p === "string" && permissions.some((allowed) => allowed === p),
    )
  )
    throw new GroupError(400, "Мэдээллийн эрх буруу байна.");
  if (
    value.some((p) => p === "PLANS_ASSIGN" || p === "PLANS_REVIEW") &&
    !value.includes("PLANS_VIEW")
  )
    throw new GroupError(
      400,
      "Ажил оноох, батлахад төлөвлөгөө харах эрх шаардлагатай.",
    );
  return [...new Set(value)];
}
export function parseRole(value: unknown): "ADMIN" | "MANAGER" {
  if (value !== "ADMIN" && value !== "MANAGER")
    throw new GroupError(400, "Группийн эрх буруу байна.");
  return value;
}
export function recipient(value: unknown): string {
  const input = text(value, 254).toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) return input;
  const phone = normalizePhoneNumber(input);
  if (!/^[+\d\s()-]+$/.test(input) || !phone || !/^\d{8}$/.test(phone))
    throw new GroupError(400, "Утас эсвэл имэйлээ зөв оруулна уу.");
  return phone;
}
export function invitationStatus(
  status: string,
  expiresAt: Date,
  now = new Date(),
): string {
  return status === "PENDING" && expiresAt <= now ? "EXPIRED" : status;
}
export function assertPending(status: string, expiresAt: Date) {
  if (invitationStatus(status, expiresAt) !== "PENDING")
    throw new GroupError(
      409,
      "Урилга шийдвэрлэгдсэн эсвэл хугацаа дууссан байна.",
    );
}
export function effectivePermissions(
  member: {
    role: string;
    allCompanies: boolean;
    permissions: string[];
    companyAccess: { companyId: string; permissions: string[] }[];
  },
  company: { id: string; sharedPermissions: string[] },
): GroupPermission[] {
  const granted =
    member.role === "OWNER"
      ? permissions
      : member.allCompanies
        ? member.permissions
        : (member.companyAccess.find((a) => a.companyId === company.id)
            ?.permissions ?? []);
  return permissions.filter(
    (p) => company.sharedPermissions.includes(p) && granted.includes(p),
  );
}
export function invitationCode() {
  return randomBytes(24).toString("base64url");
}
export function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}
export function logoUrl(value: unknown): string | null {
  const input = text(value, 2048, true);
  if (!input) return null;
  if (/^\/api\/partners\/uploads\/[a-zA-Z0-9._-]+$/.test(input)) return input;
  try {
    if (new URL(input).protocol === "https:") return input;
  } catch {
    /* validated below */
  }
  throw new GroupError(400, "Логоны HTTPS холбоос оруулна уу.");
}

export function assertDelegation(
  actor: {
    role: string;
    allCompanies: boolean;
    permissions: string[];
    companyAccess: { companyId: string; permissions: string[] }[];
  },
  grant: {
    role: string;
    allCompanies: boolean;
    permissions: string[];
    companyIds: string[];
  },
) {
  if (actor.role === "OWNER") return;
  const outsideScope =
    !actor.allCompanies &&
    grant.companyIds.some(
      (id) =>
        !actor.companyAccess.some(
          (a) =>
            a.companyId === id &&
            grant.permissions.every((p) => a.permissions.includes(p)),
        ),
    );
  if (
    grant.role === "ADMIN" ||
    grant.permissions.some((p) => !actor.permissions.includes(p)) ||
    (grant.allCompanies && !actor.allCompanies) ||
    outsideScope
  )
    throw new GroupError(403, "Өөрийн эрхээс давсан эрх олгох боломжгүй.");
}
