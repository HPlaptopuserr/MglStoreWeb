import { taskStatus } from "../tasks/lifecycle";
import { prisma } from "@mgl/database";
import {
  defaultWorkforceFeatures,
  timeRequestKinds,
  type WorkforceEmployee,
  type WorkforceRequest,
} from "@mgl/types";
import { access, allowedCompanies } from "./access";
import { GroupError } from "./policy";
import {
  calculateWorkforce,
  daysBetween,
  wallNow,
  wallToInstant,
} from "../workforce/calculation";

export async function groupSnapshot(
  userId: string,
  groupId: string,
  from: string,
  to: string,
  organizationId?: string,
  includePeople = false,
) {
  try {
    daysBetween(from, to, 31);
  } catch {
    throw new GroupError(400, "Огнооны хүрээ 1–31 хоног байна.");
  }
  const { member, companies: allowed } = await allowedCompanies(
    prisma,
    userId,
    groupId,
  );
  const companies = organizationId
    ? allowed.filter((c) => c.organizationId === organizationId)
    : allowed;
  if (organizationId && !companies.length)
    throw new GroupError(403, "Энэ компанийн мэдээлэлд хандах эрхгүй байна.");
  // Restrict each source query to companies which actually permit that source.
  const staffIds = companies
    .filter(
      (c) =>
        c.effectivePermissions.includes("EMPLOYEES_VIEW") ||
        (c.effectivePermissions.includes("ATTENDANCE_VIEW") &&
          c.organization.businessAttendanceEnabled),
    )
    .map((c) => c.organizationId);
  const attendanceIds = companies
    .filter(
      (c) =>
        c.effectivePermissions.includes("ATTENDANCE_VIEW") &&
        c.organization.businessAttendanceEnabled,
    )
    .map((c) => c.organizationId);
  const planIds = companies
    .filter(
      (c) =>
        c.effectivePermissions.includes("PLANS_VIEW") &&
        c.organization.businessTasksEnabled,
    )
    .map((c) => c.organizationId);
  const start = new Date(`${from}T00:00:00Z`),
    end = new Date(`${to}T00:00:00Z`);
  const broadStart = new Date(+start - 86400_000),
    broadEnd = new Date(+end + 2 * 86400_000);
  const [members, records, assignments, shifts, requests, tasks] =
    await Promise.all([
      prisma.organizationMember.findMany({
        where: {
          organizationId: { in: staffIds },
          deletedAt: null,
          user: { deletedAt: null },
        },
        include: {
          user: {
            select: { isActive: true, profile: { select: { fullName: true } } },
          },
        },
        take: 10001,
      }),
      prisma.attendanceRecord.findMany({
        where: {
          organizationId: { in: attendanceIds },
          clockIn: { gte: broadStart, lt: broadEnd },
        },
        take: 50001,
      }),
      prisma.workforceAssignment.findMany({
        where: {
          organizationId: { in: attendanceIds },
          from: { lte: end },
          to: { gte: start },
        },
        take: 10001,
      }),
      prisma.workforceShift.findMany({
        where: { organizationId: { in: attendanceIds } },
        take: 2001,
      }),
      prisma.workforceRequest.findMany({
        where: {
          organizationId: { in: attendanceIds },
          state: "APPROVED",
          from: { lt: broadEnd },
          to: { gte: broadStart },
        },
        take: 10001,
      }),
      prisma.organizationTask.findMany({
        where: {
          organizationId: { in: planIds },
          deletedAt: null,
          OR: [
            { dueAt: { gte: broadStart, lt: broadEnd } },
            { dueAt: null, createdAt: { gte: broadStart, lt: broadEnd } },
          ],
        },
        include: {
          assignees: {
            select: {
              userId: true,
              status: true,
              performanceStars: true,
              productivityPercent: true,
            },
          },
        },
        take: 10001,
      }),
    ]);
  if (
    members.length > 10000 ||
    records.length > 50000 ||
    assignments.length > 10000 ||
    shifts.length > 2000 ||
    requests.length > 10000 ||
    tasks.length > 10000
  )
    throw new GroupError(422, "Өгөгдөл их байна. Огнооны хүрээг багасгана уу.");
  const distinctEmployees = new Set<string>();
  const result = companies.map((c) => {
    const id = c.organizationId,
      permitted = c.effectivePermissions;
    const canEmployees = permitted.includes("EMPLOYEES_VIEW"),
      canAttendance =
        permitted.includes("ATTENDANCE_VIEW") &&
        c.organization.businessAttendanceEnabled,
      canPlans =
        permitted.includes("PLANS_VIEW") && c.organization.businessTasksEnabled;
    const timeZone =
      c.organization.workforcePolicy?.timeZone ?? "Asia/Ulaanbaatar";
    const joinedDate = wallNow(timeZone, c.joinedAt).toISOString().slice(0, 10);
    const effectiveFrom = from > joinedDate ? from : joinedDate;
    const days = effectiveFrom <= to ? daysBetween(effectiveFrom, to, 31) : [];
    const companyMembers = members.filter((m) => m.organizationId === id);
    const employees: WorkforceEmployee[] = companyMembers.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.workforceDisplayName || m.user.profile?.fullName || "Ажилтан",
      email: "",
      phone: "",
      avatarUrl: null,
      role: m.role,
      department: m.department ?? "Хэлтэсгүй",
      active: m.isActive && m.user.isActive,
      joinedAt: m.createdAt.toISOString(),
      capabilities: [],
      employmentEndedAt:
        m.employmentEndedAt?.toISOString().slice(0, 10) ?? null,
    }));
    const activeEmployees = employees.filter((e) => e.active);
    if (canEmployees)
      activeEmployees.forEach((e) => distinctEmployees.add(e.userId));
    const rangeStart = wallToInstant(
      new Date(`${effectiveFrom}T00:00:00Z`),
      timeZone,
    );
    const rangeEnd = wallToInstant(new Date(+end + 86400_000), timeZone);
    const scopedRecords = canAttendance
      ? records.filter(
          (r) => r.organizationId === id && r.clockIn >= c.joinedAt,
        )
      : [];
    const rows =
      canAttendance && days.length
        ? calculateWorkforce({
            days,
            employees,
            shifts: shifts.filter((s) => s.organizationId === id),
            assignments: assignments
              .filter((a) => a.organizationId === id)
              .map((a) => ({
                ...a,
                from: a.from.toISOString().slice(0, 10),
                to: a.to.toISOString().slice(0, 10),
              })),
            records: scopedRecords.map((r) => ({
              ...r,
              clockIn: r.clockIn.toISOString(),
              clockOut: r.clockOut?.toISOString() ?? null,
              method: r.clockInMethod,
            })),
            requests: requests
              .filter((r) => r.organizationId === id)
              .map(
                (r): WorkforceRequest => ({
                  ...r,
                  kind: r.kind as WorkforceRequest["kind"],
                  state: "APPROVED",
                  direction: r.direction as WorkforceRequest["direction"],
                  from: r.from.toISOString(),
                  to: r.to.toISOString(),
                  createdAt: r.createdAt.toISOString(),
                  decidedAt: r.decidedAt?.toISOString() ?? null,
                }),
              ),
            policy: {
              timeZone,
              lateGraceMinutes:
                c.organization.workforcePolicy?.lateGraceMinutes ?? 0,
              features: defaultWorkforceFeatures,
              requestKinds: [...timeRequestKinds],
              approvalRequired: true,
            },
            now: new Date(),
          })
        : [];
    const eligible = rows.filter(
      (r) =>
        r.plannedMinutes > 0 &&
        r.scheduledStart !== null &&
        new Date(r.scheduledStart) >= c.joinedAt &&
        !["LEAVE", "DAY_OFF", "SCHEDULED"].includes(r.status),
    );
    const present = eligible.filter((r) =>
      ["PRESENT", "CLOCKED_OUT", "LATE"].includes(r.status),
    ).length;
    const scopedTasks = canPlans
      ? tasks
          .filter(
            (t) =>
              t.organizationId === id &&
              t.createdAt >= c.joinedAt &&
              (t.dueAt ?? t.createdAt) >= rangeStart &&
              (t.dueAt ?? t.createdAt) < rangeEnd,
          )
          .filter(
            (t) =>
              !t.assignees.length ||
              t.assignees.some((a) => a.status !== "CANCELLED"),
          )
      : [];
    const completed = scopedTasks.filter(
      (t) => taskStatus(t.assignees) === "DONE",
    ).length;
    return {
      organizationId: id,
      name: c.organization.name,
      taxId: c.organization.taxId,
      joinedAt: c.joinedAt,
      permissions: permitted,
      employees: canEmployees ? activeEmployees.length : null,
      attendance: canAttendance
        ? {
            present,
            expected: eligible.length,
            rate: eligible.length
              ? Math.round((present * 100) / eligible.length)
              : null,
            workedMinutes: rows.reduce((sum, r) => sum + r.workedMinutes, 0),
          }
        : null,
      plans: canPlans
        ? {
            total: scopedTasks.length,
            completed,
            rate: scopedTasks.length
              ? Math.round((completed * 100) / scopedTasks.length)
              : null,
          }
        : null,
      ...(organizationId || includePeople
        ? {
            people: canEmployees
              ? employees
                  .filter(
                    (e) =>
                      e.active ||
                      rows.some(
                        (r) => r.userId === e.userId && r.recordIds.length > 0,
                      ),
                  )
                  .map((e) => ({
                    userId: e.userId,
                    name: e.name,
                    department: e.department,
                    attendance: canAttendance
                      ? rows
                          .filter((r) => r.userId === e.userId)
                          .map((r) => ({
                            date: r.date,
                            status: r.status,
                            workedMinutes: r.workedMinutes,
                          }))
                      : null,
                    plans: canPlans
                      ? scopedTasks
                          .filter((t) =>
                            t.assignees.some((a) => a.userId === e.userId),
                          )
                          .map((t) => ({
                            id: t.id,
                            title: t.title,
                            status: t.assignees.find(
                              (a) => a.userId === e.userId,
                            )?.status,
                            dueAt: t.dueAt,
                            priority: t.priority,
                            performanceStars: t.assignees.find(
                              (a) => a.userId === e.userId,
                            )?.performanceStars,
                            productivityPercent: t.assignees.find(
                              (a) => a.userId === e.userId,
                            )?.productivityPercent,
                          }))
                      : null,
                  }))
              : [],
            tasks: canPlans
              ? scopedTasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  completed: taskStatus(t.assignees) === "DONE",
                  status: taskStatus(t.assignees),
                  dueAt: t.dueAt,
                  priority: t.priority,
                }))
              : [],
          }
        : {}),
    };
  });
  const attendance = result
    .filter((c) => c.attendance !== null)
    .map((c) => c.attendance!);
  const plans = result.filter((c) => c.plans !== null).map((c) => c.plans!);
  const present = attendance.reduce((s, a) => s + a.present, 0),
    expected = attendance.reduce((s, a) => s + a.expected, 0);
  const total = plans.reduce((s, p) => s + p.total, 0),
    completed = plans.reduce((s, p) => s + p.completed, 0);
  const fresh = await access(prisma, userId, groupId);
  if (fresh.group.revision !== member.group.revision)
    throw new GroupError(
      409,
      "Группийн эрх өөрчлөгдсөн байна. Дахин шинэчилнэ үү.",
    );
  return {
    from,
    to,
    generatedAt: new Date(),
    historyPolicy: "SINCE_LINKED",
    companies: result,
    summary: {
      companyCount: result.length,
      employees: companies.some((c) =>
        c.effectivePermissions.includes("EMPLOYEES_VIEW"),
      )
        ? distinctEmployees.size
        : null,
      employeeCompanies: result.filter((c) => c.employees !== null).length,
      attendanceCompanies: attendance.length,
      planCompanies: plans.length,
      attendance: attendance.length
        ? {
            present,
            expected,
            rate: expected ? Math.round((present * 100) / expected) : null,
          }
        : null,
      plans: plans.length
        ? {
            total,
            completed,
            rate: total ? Math.round((completed * 100) / total) : null,
          }
        : null,
    },
  };
}
