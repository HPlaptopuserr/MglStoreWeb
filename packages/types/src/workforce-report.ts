import type { WorkforceRow } from "./workforce";
export type WorkforceReportView = "daily" | "employee" | "summary";
export const workforceReportViews = [
  { id: "daily", label: "Өдрөөр" },
  { id: "employee", label: "Ажилтнаар" },
  { id: "summary", label: "Ерөнхий" },
] as const;
export function parseWorkforceReportView(value: unknown): WorkforceReportView {
  return value === "employee" || value === "summary" ? value : "daily";
}
export interface WorkforceReportFilter {
  userId?: string;
  department?: string;
  status?: string;
  query?: string;
  day?: string;
}
export function filterWorkforceReportRows(
  rows: readonly WorkforceRow[],
  filter: WorkforceReportFilter,
): WorkforceRow[] {
  const query = filter.query?.trim().toLocaleLowerCase();
  return rows.filter(
    (row) =>
      (!filter.userId || row.userId === filter.userId) &&
      (!filter.department || row.department === filter.department) &&
      (!filter.status || row.status === filter.status) &&
      (!filter.day || row.date === filter.day) &&
      (!query || row.employeeName.toLocaleLowerCase().includes(query)),
  );
}
export const workforceReportMinuteKeys = [
  "plannedMinutes",
  "workedMinutes",
  "lateMinutes",
  "earlyMinutes",
  "absentMinutes",
  "approvedOvertimeMinutes",
] as const;
export type WorkforceReportTotals = Record<
  (typeof workforceReportMinuteKeys)[number],
  number
>;
export function workforceReportTotals(
  rows: readonly WorkforceRow[],
): WorkforceReportTotals {
  const totals: WorkforceReportTotals = {
    plannedMinutes: 0,
    workedMinutes: 0,
    lateMinutes: 0,
    earlyMinutes: 0,
    absentMinutes: 0,
    approvedOvertimeMinutes: 0,
  };
  for (const row of rows)
    for (const key of workforceReportMinuteKeys) totals[key] += row[key];
  return totals;
}
export interface WorkforceEmployeeReport extends WorkforceReportTotals {
  userId: string;
  employeeName: string;
  department: string;
  recordedDays: number;
  lateDays: number;
  absentDays: number;
}
export function summarizeWorkforceReport(
  rows: readonly WorkforceRow[],
): WorkforceEmployeeReport[] {
  const groups = new Map<string, WorkforceRow[]>();
  for (const row of rows) {
    const group = groups.get(row.userId) ?? [];
    group.push(row);
    groups.set(row.userId, group);
  }
  return Array.from(groups, ([userId, group]) => ({
    userId,
    employeeName: group[0].employeeName,
    department: group[0].department,
    ...workforceReportTotals(group),
    recordedDays: new Set(group.filter((r) => r.clockIn).map((r) => r.date))
      .size,
    lateDays: new Set(group.filter((r) => r.lateMinutes > 0).map((r) => r.date))
      .size,
    absentDays: new Set(
      group.filter((r) => r.status === "ABSENT").map((r) => r.date),
    ).size,
  })).sort((a, b) => a.employeeName.localeCompare(b.employeeName, "mn"));
}
