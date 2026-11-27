// Mentor appointments use Ulaanbaatar wall time, independent of the visitor's time zone.
export function mentorSlotOpen(value: string, now = Date.now()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(value)) return false;
  const local = new Date(value + ":00Z");
  if (
    !Number.isFinite(local.getTime()) ||
    local.toISOString().slice(0, 16) !== value
  )
    return false;
  const hour = local.getUTCHours();
  const day = local.getUTCDay();
  if (
    hour < 8 ||
    hour >= 20 ||
    ((day === 2 || day === 4) && hour < 11) ||
    (day === 5 && hour >= 17)
  )
    return false;
  return Date.parse(value + ":00+08:00") > now;
}

export function mentorSlots(date: string): string[] {
  return Array.from(
    { length: 12 },
    (_, index) => date + "T" + String(index + 8).padStart(2, "0") + ":00",
  );
}
