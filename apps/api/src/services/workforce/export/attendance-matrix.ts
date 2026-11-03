import type { WorkforceRow } from "@mgl/types";
import { formatWorkforceInstant } from "../format";

export const attendanceExportGroups = [
  ["Ажиллавал зохих", "FFB9CDF9", "FFD3E0FB"],
  ["Тасалсан", "FFF4BABA", "FFF8D4D4"],
  ["Хоцорсон", "FFF4BABA", "FFF8D4D4"],
  ["Эрт тарсан", "FFF4BABA", "FFF8D4D4"],
  ["Өдрийн тал", "FFF4BABA", "FFF8D4D4"],
  ["Нийт ажиллаагүй", "FFF0A4A4", "FFF0A4A4"],
  ["Хуваарьт ажилласан", "FF9DD8B3", "FF9DD8B3"],
  ["Нийт ажилласан", "FF9DD8B3", "FF9DD8B3"],
  ["Ирсэн идэвхийн цаг", "FFF8E7B0", "FFFBF0CE"],
  ["Явсан идэвхийн цаг", "FFF8E7B0", "FFFBF0CE"],
  ["Идэвхийн нийт", "FFF6DF97", "FFF6DF97"],
  ["Бүгд нийт", "FFA3BDF7", "FFA3BDF7"],
] as const;
export interface AttendanceMetric {
  days: number | null;
  minutes: number | null;
}
export function attendanceDates(from: string, to: string): string[] {
  const days: string[] = [];
  for (
    let day = +new Date(`${from}T00:00:00Z`);
    day <= +new Date(`${to}T00:00:00Z`);
    day += 86400000
  )
    days.push(new Date(day).toISOString().slice(0, 10));
  return days;
}
const outsideMinutes = (row: WorkforceRow, side: "before" | "after") => {
  const boundary = side === "before" ? row.scheduledStart : row.scheduledEnd;
  const time = side === "before" ? row.clockIn : row.clockOut;
  if (!boundary || !time || !row.clockOut) return 0;
  return Math.min(
    row.workedMinutes,
    Math.max(
      0,
      Math.round(
        (side === "before"
          ? +new Date(boundary) - +new Date(time)
          : +new Date(time) - +new Date(boundary)) / 60000,
      ),
    ),
  );
};
export function attendanceMetrics(
  rows: readonly WorkforceRow[],
): AttendanceMetric[] {
  const metric = (
    minutes: (r: WorkforceRow) => number,
    eligible: (r: WorkforceRow) => boolean = (r) => minutes(r) > 0,
  ): AttendanceMetric => ({
    days: new Set(rows.filter(eligible).map((r) => r.date)).size,
    minutes: rows.reduce((sum, r) => sum + minutes(r), 0),
  });
  const early = (r: WorkforceRow) => outsideMinutes(r, "before");
  const after = (r: WorkforceRow) => outsideMinutes(r, "after");
  const recorded = (r: WorkforceRow) => Boolean(r.clockIn);
  return [
    metric((r) => r.plannedMinutes),
    metric((r) => r.absentMinutes),
    metric((r) => r.lateMinutes),
    metric((r) => r.earlyMinutes),
    { days: null, minutes: null },
    metric((r) => r.absentMinutes + r.lateMinutes + r.earlyMinutes),
    metric((r) =>
      r.scheduledStart ? Math.max(0, r.workedMinutes - early(r) - after(r)) : 0,
    ),
    metric((r) => r.workedMinutes, recorded),
    metric(early),
    metric(after),
    metric((r) => early(r) + after(r)),
    // Worked minutes already include recorded time outside the shift; never add it twice.
    metric((r) => r.workedMinutes, recorded),
  ];
}
export function attendanceDayValue(
  row: WorkforceRow | undefined,
  timeZone: string,
): string {
  if (!row) return "—";
  if (row.clockIn || row.clockOut) {
    const format = (value: string | null) => {
      if (!value) return "--:--";
      const text = formatWorkforceInstant(value, timeZone, true);
      return text.slice(0, 10) === row.date
        ? text.slice(11)
        : `${text.slice(5, 10).replace("-", "/")} ${text.slice(11)}`;
    };
    return `${format(row.clockIn)} - ${format(row.clockOut)}`;
  }
  const labels = {
    ABSENT: "Тасалсан",
    SCHEDULED: "Ажлын өдөр",
    UNRECORDED: "Бүртгэлгүй",
    LEAVE: "Чөлөөтэй",
    DAY_OFF: "Амралт",
    UNSCHEDULED: "Чөлөөт",
    PRESENT: "Ирсэн",
    CLOCKED_OUT: "Явсан",
    LATE: "Хоцорсон",
  };
  return labels[row.status];
}
