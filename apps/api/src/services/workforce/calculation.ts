import type {
  WorkforceAssignment,
  WorkforceEmployee,
  WorkforcePolicy,
  WorkforceRecord,
  WorkforceRequest,
  WorkforceRow,
  WorkforceShift,
  WorkforceSummary,
} from "@mgl/types";
const MINUTE = 60_000;
const formatters = new Map<string, Intl.DateTimeFormat>();
export function wallNow(timeZone: string, now = new Date()): Date {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    if (formatters.size >= 64)
      formatters.delete(formatters.keys().next().value!);
    formatters.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}.${String(now.getUTCMilliseconds()).padStart(3, "0")}Z`,
  );
}
export function wallToInstant(value: Date, timeZone: string): Date {
  let candidate = +value;
  for (let i = 0; i < 3; i++) {
    const offset = +wallNow(timeZone, new Date(candidate)) - candidate;
    candidate = +value - offset;
  }
  const result = new Date(candidate);
  if (+wallNow(timeZone, result) !== +value)
    throw new WorkforceDateRangeError(
      "Цагийн бүсийн шилжилтэд хүчингүй цаг сонгосон байна",
    );
  return result;
}
export class WorkforceDateRangeError extends Error {}
export function daysBetween(from: string, to: string, maximum = 93): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))
    throw new WorkforceDateRangeError("Огнооны формат YYYY-MM-DD байна");
  const start = new Date(`${from}T00:00:00Z`),
    end = new Date(`${to}T00:00:00Z`);
  if (
    !Number.isFinite(+start) ||
    !Number.isFinite(+end) ||
    start.toISOString().slice(0, 10) !== from ||
    end.toISOString().slice(0, 10) !== to ||
    start > end
  )
    throw new WorkforceDateRangeError("Огнооны интервал буруу");
  const count = Math.floor((+end - +start) / 86_400_000) + 1;
  if (count > maximum)
    throw new WorkforceDateRangeError(
      `Нэг удаад ${maximum} хүртэл хоног сонгоно уу`,
    );
  return Array.from({ length: count }, (_, i) =>
    new Date(+start + i * 86_400_000).toISOString().slice(0, 10),
  );
}
export function unionMinutes(
  intervals: readonly (readonly [number, number])[],
): number {
  const sorted = intervals
    .filter(([a, b]) => b > a)
    .map(([a, b]) => [a, b] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  let total = 0,
    start = 0,
    end = 0;
  sorted.forEach(([a, b], index) => {
    if (!index) {
      start = a;
      end = b;
    } else if (a <= end) end = Math.max(end, b);
    else {
      total += end - start;
      start = a;
      end = b;
    }
  });
  if (sorted.length) total += end - start;
  return Math.floor(total / MINUTE);
}
export function calculateWorkforce(input: {
  days: string[];
  employees: WorkforceEmployee[];
  shifts: WorkforceShift[];
  assignments: WorkforceAssignment[];
  records: WorkforceRecord[];
  requests: WorkforceRequest[];
  policy: WorkforcePolicy;
  now: Date;
}): WorkforceRow[] {
  const shiftById = new Map(input.shifts.map((s) => [s.id, s]));
  const group = <T extends { userId: string }>(items: T[]) => {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const entries = map.get(item.userId) ?? [];
      entries.push(item);
      map.set(item.userId, entries);
    }
    return map;
  };
  const recordGroups = group(input.records),
    assignmentGroups = group(input.assignments),
    requestGroups = group(input.requests);
  const localRecordDays = new Map(
    input.records.map((r) => [
      r.id,
      wallNow(input.policy.timeZone, new Date(r.clockIn))
        .toISOString()
        .slice(0, 10),
    ]),
  );
  const instantCache = new Map<number, number>();
  const instant = (value: number) => {
    const cached = instantCache.get(value);
    if (cached !== undefined) return cached;
    const result = +wallToInstant(new Date(value), input.policy.timeZone);
    instantCache.set(value, result);
    return result;
  };
  const rows: WorkforceRow[] = [];
  for (const employee of input.employees) {
    const employeeRecords = recordGroups.get(employee.userId) ?? [],
      employeeAssignments = assignmentGroups.get(employee.userId) ?? [],
      employeeRequests = requestGroups.get(employee.userId) ?? [];
    const consumed = new Set<string>();
    for (const date of input.days) {
      if (
        date < employee.joinedAt.slice(0, 10) ||
        (employee.employmentEndedAt && date > employee.employmentEndedAt)
      )
        continue;
      if (
        !employee.active &&
        !employee.employmentEndedAt &&
        !employeeRecords.some(
          (r) =>
            r.userId === employee.userId && localRecordDays.get(r.id) === date,
        )
      )
        continue;
      const day = +new Date(`${date}T00:00:00Z`);
      const assignment = employeeAssignments.find(
        (a) =>
          a.userId === employee.userId &&
          a.from.slice(0, 10) <= date &&
          a.to.slice(0, 10) >= date &&
          shiftById
            .get(a.shiftId)
            ?.weekdays.includes(new Date(day).getUTCDay()),
      );
      const calendarAssignment = employeeAssignments.find(
        (a) =>
          a.userId === employee.userId &&
          a.from.slice(0, 10) <= date &&
          a.to.slice(0, 10) >= date,
      );
      const shift = assignment ? shiftById.get(assignment.shiftId) : undefined;
      const scheduledStart = shift
        ? instant(day + shift.startMinute * MINUTE)
        : null;
      const scheduledEnd = shift
        ? instant(
            day +
              (shift.endMinute +
                (shift.endMinute <= shift.startMinute ? 1440 : 0)) *
                MINUTE,
          )
        : null;
      const records = employeeRecords.filter(
        (r) =>
          r.userId === employee.userId &&
          !consumed.has(r.id) &&
          (scheduledStart !== null && scheduledEnd !== null
            ? +new Date(r.clockIn) >= scheduledStart - 240 * MINUTE &&
              +new Date(r.clockIn) < scheduledEnd
            : localRecordDays.get(r.id) === date),
      );
      records.forEach((r) => consumed.add(r.id));
      const intervals = records.map(
        (r) =>
          [
            +new Date(r.clockIn),
            Math.max(
              +new Date(r.clockIn),
              Math.min(
                r.clockOut ? +new Date(r.clockOut) : +input.now,
                +input.now,
              ),
            ),
          ] as const,
      );
      const elapsed = unionMinutes(intervals);
      // The break occupies the middle of the shift; deduct only actual overlap.
      const breakStart =
        shift && scheduledStart !== null && scheduledEnd !== null
          ? scheduledStart +
            (scheduledEnd - scheduledStart - shift.breakMinutes * MINUTE) / 2
          : null;
      const breakMinutes =
        shift && breakStart !== null
          ? unionMinutes(
              intervals.map(([a, b]) => [
                Math.max(a, breakStart),
                Math.min(b, breakStart + shift.breakMinutes * MINUTE),
              ]),
            )
          : 0;
      const workedMinutes = Math.max(0, elapsed - breakMinutes);
      const start = records.length
        ? Math.min(...records.map((r) => +new Date(r.clockIn)))
        : null;
      const allClosed = records.length > 0 && records.every((r) => r.clockOut);
      const end = allClosed
        ? Math.max(...records.map((r) => +new Date(r.clockOut!)))
        : null;
      const dayEnd = scheduledEnd ?? instant(day + 86_400_000);
      const leave = employeeRequests.filter(
        (r) =>
          r.userId === employee.userId &&
          r.kind === "LEAVE" &&
          r.state === "APPROVED" &&
          +new Date(r.from) < dayEnd &&
          +new Date(r.to) > (scheduledStart ?? instant(day)),
      );
      const leaveMinutes =
        scheduledStart !== null && scheduledEnd !== null
          ? unionMinutes(
              leave.map((r) => [
                Math.max(scheduledStart, +new Date(r.from)),
                Math.min(scheduledEnd, +new Date(r.to)),
              ]),
            )
          : 0;
      const scheduledMinutes =
        shift && scheduledStart !== null && scheduledEnd !== null
          ? Math.max(
              0,
              (scheduledEnd - scheduledStart) / MINUTE - shift.breakMinutes,
            )
          : 0;
      const leaveBreakMinutes =
        shift && breakStart !== null
          ? unionMinutes(
              leave.map((r) => [
                Math.max(breakStart, +new Date(r.from)),
                Math.min(
                  breakStart + shift.breakMinutes * MINUTE,
                  +new Date(r.to),
                ),
              ]),
            )
          : 0;
      const plannedMinutes = Math.max(
        0,
        scheduledMinutes - Math.max(0, leaveMinutes - leaveBreakMinutes),
      );
      const lateMinutes =
        scheduledStart !== null && start !== null
          ? Math.max(
              0,
              Math.floor((start - scheduledStart) / MINUTE) -
                input.policy.lateGraceMinutes -
                unionMinutes(
                  leave.map((r) => [
                    Math.max(scheduledStart, +new Date(r.from)),
                    Math.min(start, +new Date(r.to)),
                  ]),
                ),
            )
          : 0;
      const earlyMinutes =
        scheduledEnd !== null && end !== null
          ? Math.max(
              0,
              Math.floor((scheduledEnd - end) / MINUTE) -
                unionMinutes(
                  leave.map((r) => [
                    Math.max(end, +new Date(r.from)),
                    Math.min(scheduledEnd, +new Date(r.to)),
                  ]),
                ),
            )
          : 0;
      const absentMinutes =
        !records.length && +input.now >= dayEnd ? plannedMinutes : 0;
      const approvedOvertime = employeeRequests.filter(
        (r) =>
          r.userId === employee.userId &&
          r.kind === "OVERTIME" &&
          r.state === "APPROVED",
      );
      const approvedIntervals: [number, number][] = [];
      for (const request of approvedOvertime)
        for (const [a, b] of intervals) {
          const begin = Math.max(a, +new Date(request.from)),
            finish = Math.min(b, +new Date(request.to));
          if (scheduledStart !== null && scheduledEnd !== null) {
            approvedIntervals.push(
              [begin, Math.min(finish, scheduledStart)],
              [Math.max(begin, scheduledEnd), finish],
            );
          } else approvedIntervals.push([begin, finish]);
        }
      const approvedOvertimeMinutes = unionMinutes(approvedIntervals);
      const status = !records.length
        ? leave.length && plannedMinutes === 0
          ? "LEAVE"
          : shift
            ? absentMinutes > 0
              ? "ABSENT"
              : scheduledStart !== null && +input.now < scheduledStart
                ? "SCHEDULED"
                : "UNRECORDED"
            : calendarAssignment
              ? "DAY_OFF"
              : "UNSCHEDULED"
        : lateMinutes > 0
          ? "LATE"
          : allClosed
            ? "CLOCKED_OUT"
            : "PRESENT";
      rows.push({
        id: `${employee.userId}:${date}`,
        date,
        userId: employee.userId,
        employeeName: employee.name,
        department: employee.department,
        shiftName: shift?.name ?? null,
        scheduledStart:
          scheduledStart !== null
            ? new Date(scheduledStart).toISOString()
            : null,
        scheduledEnd:
          scheduledEnd !== null ? new Date(scheduledEnd).toISOString() : null,
        clockIn: start !== null ? new Date(start).toISOString() : null,
        clockOut: end !== null ? new Date(end).toISOString() : null,
        plannedMinutes,
        workedMinutes,
        lateMinutes,
        earlyMinutes,
        absentMinutes,
        overtimeMinutes: shift
          ? Math.max(0, workedMinutes - plannedMinutes)
          : 0,
        approvedOvertimeMinutes,
        status,
        recordIds: records.map((r) => r.id),
      });
    }
  }
  return rows;
}
export function summarizeWorkforce(
  rows: WorkforceRow[],
  employees: number,
  pendingRequests: number,
): WorkforceSummary {
  const sum = (
    key:
      | "plannedMinutes"
      | "workedMinutes"
      | "lateMinutes"
      | "earlyMinutes"
      | "absentMinutes"
      | "overtimeMinutes"
      | "approvedOvertimeMinutes",
  ) => rows.reduce((total, r) => total + r[key], 0);
  return {
    employees,
    present: new Set(
      rows.filter((r) => r.recordIds.length).map((r) => r.userId),
    ).size,
    late: rows.filter((r) => r.status === "LATE").length,
    absent: rows.filter((r) => r.status === "ABSENT").length,
    unrecorded: rows.filter((r) => r.status === "UNRECORDED").length,
    leave: rows.filter((r) => r.status === "LEAVE").length,
    plannedMinutes: sum("plannedMinutes"),
    workedMinutes: sum("workedMinutes"),
    lateMinutes: sum("lateMinutes"),
    earlyMinutes: sum("earlyMinutes"),
    absentMinutes: sum("absentMinutes"),
    overtimeMinutes: sum("overtimeMinutes"),
    approvedOvertimeMinutes: sum("approvedOvertimeMinutes"),
    pendingRequests,
  };
}
