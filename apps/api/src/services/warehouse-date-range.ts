const ULAANBAATAR_OFFSET = "+08:00";

function parseDay(value: unknown, endOfDay: boolean): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return null;
  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  const parsed = new Date(`${value}T${time}${ULAANBAATAR_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseWarehouseDateRange(from: unknown, to: unknown) {
  return { from: parseDay(from, false), to: parseDay(to, true) };
}
