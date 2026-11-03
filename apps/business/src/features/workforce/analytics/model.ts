import type { WorkforceRow } from "@mgl/types";
export const attendanceCategories = {
  regular: { label: "Хэвийн", color: "#818cf8", symbol: "✓" },
  late: { label: "Хоцорсон", color: "#f4bd62", symbol: "Х" },
  early: { label: "Эрт явсан", color: "#c49aff", symbol: "Э" },
  partial: { label: "Хагас өдрөөс бага", color: "#ec91bc", symbol: "½" },
  absent: { label: "Тасалсан", color: "#f27687", symbol: "Т" },
  leave: { label: "Чөлөөтэй", color: "#52c6b0", symbol: "Ч" },
  off: { label: "Амралт / хуваарьгүй", color: "#697188", symbol: "·" },
  scheduled: { label: "Ээлж эхлээгүй", color: "#7384b8", symbol: "○" },
  pending: { label: "Бүртгэл дутуу", color: "#99a5bd", symbol: "?" },
} as const;
export type AttendanceCategory = keyof typeof attendanceCategories;
export function category(row: WorkforceRow): AttendanceCategory {
  if (row.status === "LEAVE") return "leave";
  if (row.status === "ABSENT") return "absent";
  if (row.status === "DAY_OFF" || row.status === "UNSCHEDULED") return "off";
  if (row.status === "SCHEDULED") return "scheduled";
  if (row.status === "UNRECORDED") return "pending";
  if (
    row.clockOut &&
    row.plannedMinutes > 0 &&
    row.workedMinutes < row.plannedMinutes / 2
  )
    return "partial";
  if (row.lateMinutes > 0) return "late";
  if (row.earlyMinutes > 0) return "early";
  return "regular";
}
export interface TimeMetric {
  id: string;
  name: string;
  department: string;
  planned: number;
  worked: number;
  covered: number;
  late: number;
  early: number;
  absent: number;
  overtime: number;
  approvedOvertime: number;
  lateDays: number;
  earlyDays: number;
  absentDays: number;
  days: number;
  ratio: number | null;
}
export function summarize(
  rows: WorkforceRow[],
  by: "employee" | "department",
): TimeMetric[] {
  const grouped = new Map<string, TimeMetric>();
  for (const r of rows) {
    const id = by === "employee" ? r.userId : r.department || "Хэлтэсгүй";
    let m = grouped.get(id);
    if (!m) {
      m = {
        id,
        name: by === "employee" ? r.employeeName : id,
        department: r.department || "Хэлтэсгүй",
        planned: 0,
        worked: 0,
        covered: 0,
        late: 0,
        early: 0,
        absent: 0,
        overtime: 0,
        approvedOvertime: 0,
        lateDays: 0,
        earlyDays: 0,
        absentDays: 0,
        days: 0,
        ratio: null,
      };
      grouped.set(id, m);
    }
    m.planned += r.plannedMinutes;
    m.worked += r.workedMinutes;
    m.covered += Math.min(r.workedMinutes, r.plannedMinutes);
    m.late += r.lateMinutes;
    m.early += r.earlyMinutes;
    m.absent += r.absentMinutes;
    m.overtime += r.overtimeMinutes;
    m.approvedOvertime += r.approvedOvertimeMinutes;
    m.lateDays += Number(r.lateMinutes > 0);
    m.earlyDays += Number(r.earlyMinutes > 0);
    m.absentDays += Number(r.status === "ABSENT");
    m.days += Number(r.plannedMinutes > 0);
  }
  return [...grouped.values()].map((m) => ({
    ...m,
    ratio: m.planned ? m.covered / m.planned : null,
  }));
}
export const weekdays = [
  "Даваа",
  "Мягмар",
  "Лхагва",
  "Пүрэв",
  "Баасан",
  "Бямба",
  "Ням",
];
export function weekdayDistribution(rows: WorkforceRow[]) {
  return weekdays.map((name, index) => {
    const counts = Object.fromEntries(
      Object.keys(attendanceCategories).map((k) => [k, 0]),
    ) as Record<AttendanceCategory, number>;
    for (const row of rows) {
      if (
        (new Date(`${row.date}T12:00:00Z`).getUTCDay() + 6) % 7 === index &&
        row.status !== "SCHEDULED" &&
        (row.plannedMinutes > 0 || row.status === "LEAVE")
      ) {
        counts[category(row)]++;
      }
    }
    return {
      name,
      counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    };
  });
}
