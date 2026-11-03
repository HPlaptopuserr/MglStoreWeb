import type { Request } from "express";
import { prisma } from "@mgl/database";
import type { AuthPayload } from "../../middleware/auth";
import {
  defaultWorkforceFeatures,
  workforceFeatures,
  type WorkforceFeatureFlags,
  type WorkforceFeature,
} from "@mgl/types";
export class WorkforceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function authenticated(req: Request): AuthPayload {
  const user = (req as Request & { user?: AuthPayload }).user;
  if (!user) throw new WorkforceError(401, "Нэвтэрнэ үү");
  return user;
}
export function featureFlags(value: unknown): WorkforceFeatureFlags {
  const flags = { ...defaultWorkforceFeatures };
  if (value && typeof value === "object" && !Array.isArray(value))
    for (const feature of workforceFeatures) {
      if (feature in value) {
        const enabled = (value as Record<string, unknown>)[feature];
        if (typeof enabled === "boolean") flags[feature] = enabled;
      }
    }
  return flags;
}
export async function workforceAccess(
  req: Request,
  options: {
    manage?: boolean;
    self?: boolean;
    feature?: WorkforceFeature;
  } = {},
) {
  const user = authenticated(req);
  const organizationId =
    typeof req.query.organizationId === "string"
      ? req.query.organizationId
      : user.organizationId;
  const member = await prisma.organizationMember.findFirst({
    where: {
      userId: user.userId,
      isActive: true,
      deletedAt: null,
      user: { isActive: true, deletedAt: null },
      ...(organizationId ? { organizationId } : {}),
      organization: { deletedAt: null, status: "ACTIVE" },
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    include: {
      organization: {
        include: { workforcePolicy: true, workforceSubscription: true },
      },
      user: { include: { profile: true } },
    },
  });
  if (!member)
    throw new WorkforceError(
      403,
      "Байгууллагын идэвхтэй гишүүнчлэл шаардлагатай",
    );
  const canManage = ["OWNER", "ADMIN"].includes(member.role);
  const managedDepartments = await prisma.workforceDepartment.findMany({
    where: { organizationId: member.organizationId, managerId: user.userId },
    select: { name: true },
  });
  const managedMembers = managedDepartments.length
    ? await prisma.organizationMember.findMany({
        where: {
          organizationId: member.organizationId,
          isActive: true,
          deletedAt: null,
          department: { in: managedDepartments.map((d) => d.name) },
        },
        select: { userId: true },
      })
    : [];
  const managedUserIds = managedMembers.map((m) => m.userId);
  const canViewAll =
    canManage || member.capabilities.includes("WORKFORCE_ATTENDANCE_VIEW");
  const canView = canViewAll || managedUserIds.length > 0;
  const canManageScope =
    canManage ||
    (managedUserIds.length > 0 &&
      Boolean(
        options.feature && ["requests", "schedules"].includes(options.feature),
      ));

  if (options.manage ? !canManageScope : !options.self && !canView)
    throw new WorkforceError(403, "Цаг удирдах эрх хүрэлцэхгүй");
  if (!member.organization.businessAttendanceEnabled)
    throw new WorkforceError(
      403,
      "App Control дээр цаг бүртгэл идэвхгүй байна",
    );
  const flags = featureFlags(member.organization.workforcePolicy?.features);
  if (options.feature && !flags[options.feature])
    throw new WorkforceError(
      403,
      "Энэ боломж байгууллагын багцад идэвхгүй байна",
    );
  return {
    user,
    member,
    organizationId: member.organizationId,
    canManage,
    managedUserIds,
    scopeUserIds: canViewAll ? null : managedUserIds,
    canExport:
      canManage || member.capabilities.includes("WORKFORCE_REPORT_EXPORT"),
    flags,
  };
}

export function assertWorkforceScope(
  context: { canManage: boolean; managedUserIds: string[] },
  userIds: string[],
) {
  if (
    !context.canManage &&
    userIds.some((id) => !context.managedUserIds.includes(id))
  )
    throw new WorkforceError(
      403,
      "Өөрийн хариуцсан хэлтсийн ажилтны мэдээллийг удирдана уу",
    );
}
