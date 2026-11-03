/** Format stored UTC instants in the organization's configured timezone. */
export function formatWorkforceInstant(
  value: Date | string | null,
  timeZone: string,
  includeDate = false,
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (kind: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === kind)?.value ?? "";
  const clock = `${get("hour")}:${get("minute")}`;
  return includeDate
    ? `${get("year")}-${get("month")}-${get("day")} ${clock}`
    : clock;
}
