import type { Request } from "express";
import { prisma } from "@mgl/database";
import type {
  WorkforceAssignment,
  WorkforceEmployee,
  WorkforcePolicy,
  WorkforceRecord,
  WorkforceRequest,
  WorkforceShift,
  WorkforceSnapshot,
} from "@mgl/types";
import { timeRequestKinds } from "@mgl/types";
import { workforceAccess, WorkforceError } from "./access";
import {
  calculateWorkforce,
  daysBetween,
  summarizeWorkforce,
  wallNow,
  wallToInstant,
} from "./calculation";
export async function workforceSnapshot(
  req: Request,
): Promise<WorkforceSnapshot> {
  const access = await workforceAccess(req);
  const { organizationId, member, flags } = access;
  const stored = member.organization.workforcePolicy;
  const policy: WorkforcePolicy = {
    timeZone: stored?.timeZone ?? "Asia/Ulaanbaatar",
    lateGraceMinutes: stored?.lateGraceMinutes ?? 0,
    features: flags,
    requestKinds: timeRequestKinds.filter(
      (k) => !stored || stored.requestKinds.includes(k),
    ),
    approvalRequired: true,
  };
  const now = wallNow(policy.timeZone);
  const today = now.toISOString().slice(0, 10);
  const from = typeof req.query.from === "string" ? req.query.from : today,
    to = typeof req.query.to === "string" ? req.query.to : today;
  let days: string[];
  try {
    days = daysBetween(from, to);
  } catch (error) {
    throw new WorkforceError(
      400,
      error instanceof Error ? error.message : "Огноо буруу",
    );
  }
  const requestFrom = wallToInstant(
    new Date(`${from}T00:00:00Z`),
    policy.timeZone,
  );
  const requestTo = wallToInstant(new Date(`${to}T23:59:59Z`), policy.timeZone);
  const orgWhere = { organizationId };
  const memberScope = access.scopeUserIds
    ? { userId: { in: access.scopeUserIds } }
    : {};
  const [
    members,
    departments,
    shifts,
    assignments,
    zones,
    requests,
    notices,
    tokens,
    audit,
    records,
    organizations,
  ] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { ...orgWhere, ...memberScope, deletedAt: null },
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: "asc" },
      take: 1001,
    }),
    prisma.workforceDepartment.findMany({
      where: orgWhere,
      orderBy: { name: "asc" },
    }),
    prisma.workforceShift.findMany({
      where: orgWhere,
      orderBy: { name: "asc" },
    }),
    prisma.workforceAssignment.findMany({
      where: {
        ...orgWhere,
        ...memberScope,
        from: { lte: new Date(`${to}T00:00:00Z`) },
        to: { gte: new Date(`${from}T00:00:00Z`) },
      },
    }),
    prisma.attendanceZone.findMany({
      where: orgWhere,
      orderBy: { createdAt: "desc" },
    }),
    prisma.workforceRequest.findMany({
      where: {
        ...orgWhere,
        ...memberScope,
        OR: [
          { state: "PENDING" },
          {
            from: { lte: requestTo },
            to: { gte: requestFrom },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 2001,
    }),
    prisma.workforceNotice.findMany({
      where: {
        ...orgWhere,
        ...(access.canManage ? {} : { userIds: { has: access.user.userId } }),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    access.canManage
      ? prisma.workforceApiToken.findMany({
          where: orgWhere,
          select: {
            id: true,
            name: true,
            prefix: true,
            scopes: true,
            expiresAt: true,
            revokedAt: true,
            lastUsedAt: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    access.canManage
      ? prisma.workforceAudit.findMany({
          where: orgWhere,
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    prisma.attendanceRecord.findMany({
      where: {
        ...orgWhere,
        ...memberScope,
        clockIn: {
          gte: new Date(new Date(`${from}T00:00:00Z`).getTime() - 86400000),
          lte: new Date(new Date(`${to}T23:59:59.999Z`).getTime() + 86400000),
        },
      },
      orderBy: { clockIn: "asc" },
      take: 30001,
    }),
    prisma.organizationMember.findMany({
      where: {
        userId: access.user.userId,
        isActive: true,
        deletedAt: null,
        organization: { deletedAt: null, status: "ACTIVE" },
      },
      select: {
        role: true,
        organization: { select: { id: true, name: true } },
      },
    }),
  ]);
  if (members.length > 1000 || records.length > 30000 || requests.length > 2000)
    throw new WorkforceError(
      422,
      "Өгөгдөл их байна. Тайлангийн огнооны хүрээг багасгана уу",
    );
  const employees: WorkforceEmployee[] = members.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.workforceDisplayName || m.user.profile?.fullName || m.user.email || "Ажилтан",
    workforceDisplayName: m.workforceDisplayName,
    email: m.user.email ?? "",
    phone: m.user.profile?.phoneNumber ?? "",
    avatarUrl: m.user.profile?.avatarUrl ?? null,
    role: m.role,
    department: m.department ?? "",
    active: m.isActive,
    joinedAt: m.createdAt.toISOString(),
    capabilities: m.capabilities,
    employmentEndedAt: m.employmentEndedAt?.toISOString().slice(0, 10) ?? null,
    employmentEndReason: access.canManage ? m.employmentEndReason : null,
  }));
  const serializedShifts: WorkforceShift[] = shifts;
  const serializedAssignments: WorkforceAssignment[] = assignments.map((a) => ({
    ...a,
    from: a.from.toISOString().slice(0, 10),
    to: a.to.toISOString().slice(0, 10),
  }));
  const serializedRecords: WorkforceRecord[] = records.map((r) => ({
    id: r.id,
    userId: r.userId,
    clockIn: r.clockIn.toISOString(),
    clockOut: r.clockOut?.toISOString() ?? null,
    zoneId: r.zoneId,
    method: r.clockInMethod,
    totalMinutes: r.totalMinutes,
    note: r.note,
  }));
  const serializedRequests: WorkforceRequest[] = requests.map((r) => ({
    ...r,
    kind: r.kind as WorkforceRequest["kind"],
    state: r.state as WorkforceRequest["state"],
    direction: r.direction as WorkforceRequest["direction"],
    from: r.from.toISOString(),
    to: r.to.toISOString(),
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
  }));
  const rows = calculateWorkforce({
    days,
    employees: employees.filter(
      (e) =>
        e.active ||
        e.employmentEndedAt ||
        serializedRecords.some((r) => r.userId === e.userId),
    ),
    shifts: serializedShifts,
    assignments: serializedAssignments,
    records: serializedRecords,
    requests: serializedRequests,
    policy,
    now: new Date(),
  });
  const session = {
    userId: access.user.userId,
    name: member.user.profile?.fullName || member.user.email || "Удирдлага",
    organizationId,
    organizationName: member.organization.name,
    role: member.role,
    canManage: access.canManage,
    canApproveRequests: access.canManage || access.managedUserIds.length > 0,
    canManageSchedules: access.canManage || access.managedUserIds.length > 0,
    managedUserIds: access.managedUserIds,
    canExport: access.canExport,
    organizations: organizations.map((m) => ({
      ...m.organization,
      role: m.role,
    })),
  };
  const subscription = member.organization.workforceSubscription;
  const pulseGroups = await prisma.workforcePulse.groupBy({
    by: ["score"],
    where: {
      organizationId,
      date: {
        gte: new Date(`${from}T00:00:00Z`),
        lte: new Date(`${to}T00:00:00Z`),
      },
    },
    _count: true,
  });
  return {
    pulse: Array.from({ length: 5 }, (_, index) => ({
      score: index + 1,
      count: pulseGroups.find((p) => p.score === index + 1)?._count ?? 0,
    })),
    organization: {
      id: organizationId,
      name: member.organization.name,
      maxMembers: member.organization.maxMembers,
      activeMembers: employees.filter((e) => e.active).length,
      attendanceEnabled: true,
      manualEnabled: member.organization.businessAttendanceManualEnabled,
    },
    session,
    policy,
    subscription: {
      planName: subscription?.planName ?? "Үндсэн",
      expiresAt: subscription?.expiresAt?.toISOString() ?? null,
      seatUnitPrice: subscription?.seatUnitPrice ?? null,
      currency: subscription?.currency ?? "MNT",
      addons: subscription?.addons ?? [],
    },
    employees,
    departments,
    shifts: serializedShifts,
    assignments: serializedAssignments,
    zones: zones.map((z) => ({
      ...z,
      userIds: assignments
        .filter((a) => a.zoneId === z.id)
        .map((a) => a.userId),
    })),
    requests: serializedRequests,
    notices: notices.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
    tokens: tokens.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      expiresAt: t.expiresAt.toISOString(),
      revokedAt: t.revokedAt?.toISOString() ?? null,
      lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    })),
    audit: audit.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    records: serializedRecords,
    rows,
    summary: summarizeWorkforce(
      rows,
      employees.filter((e) => e.active).length,
      serializedRequests.filter((r) => r.state === "PENDING").length,
    ),
    range: { from, to },
    today,
  };
}
