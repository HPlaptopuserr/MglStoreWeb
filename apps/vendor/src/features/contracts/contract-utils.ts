const MS_PER_DAY = 86_400_000;

export function toTimestamp(value: string | null): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function daysUntil(value: string | null): number | null {
  const timestamp = toTimestamp(value);
  return timestamp === null
    ? null
    : Math.ceil((timestamp - Date.now()) / MS_PER_DAY);
}

export function formatContractDate(
  value: string | null,
  style: "short" | "long" = "short",
): string {
  const timestamp = toTimestamp(value);
  if (timestamp === null) return "—";
  return new Intl.DateTimeFormat(
    "mn-MN",
    style === "long"
      ? { dateStyle: "long" }
      : { year: "numeric", month: "short", day: "2-digit" },
  ).format(timestamp);
}
