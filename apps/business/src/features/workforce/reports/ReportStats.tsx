import { workforceReportTotals, type WorkforceRow } from "@mgl/types";
import { Stats, minutes } from "../components/shared";
export function ReportStats({
  rows,
  counts,
}: {
  rows: WorkforceRow[];
  counts: boolean;
}) {
  const total = workforceReportTotals(rows);
  return (
    <Stats
      items={
        counts
          ? [
              {
                label: "Нийт ажилтан",
                value: new Set(rows.map((row) => row.userId)).size,
              },
              {
                label: "Бүртгэлтэй ажилтан-өдөр",
                value: rows.filter((row) => row.clockIn).length,
                tone: "green",
              },
              {
                label: "Хоцорсон ажилтан-өдөр",
                value: rows.filter((row) => row.lateMinutes > 0).length,
                tone: "amber",
              },
              {
                label: "Тасалсан ажилтан-өдөр",
                value: rows.filter((row) => row.status === "ABSENT").length,
                tone: "red",
              },
            ]
          : [
              {
                label: "Ажиллавал зохих",
                value: minutes(total.plannedMinutes),
              },
              {
                label: "Ажилласан",
                value: minutes(total.workedMinutes),
                tone: "green",
              },
              {
                label: "Тасалсан",
                value: minutes(total.absentMinutes),
                tone: "red",
              },
              {
                label: "Хоцорсон",
                value: minutes(total.lateMinutes),
                tone: "red",
              },
              {
                label: "Эрт гарсан",
                value: minutes(total.earlyMinutes),
                tone: "amber",
              },
              {
                label: "Батлагдсан илүү цаг",
                value: minutes(total.approvedOvertimeMinutes),
                tone: "green",
              },
            ]
      }
    />
  );
}
