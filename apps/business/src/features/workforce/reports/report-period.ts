import type { WorkforceRange } from "../hooks/useWorkforce";
export type ReportPeriod = "month" | "week" | "today";
export function reportPeriodRange(
  period: ReportPeriod,
  today: string,
): WorkforceRange {
  if (period === "today") return { from: today, to: today };
  const date = new Date(`${today}T00:00:00Z`);
  if (period === "week") {
    date.setUTCDate(date.getUTCDate() - 6);
    return { from: date.toISOString().slice(0, 10), to: today };
  }
  return {
    from: `${today.slice(0, 7)}-01`,
    to: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10),
  };
}
