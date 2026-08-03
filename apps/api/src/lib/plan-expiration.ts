const DAY_MS = 24 * 60 * 60 * 1000;
const ULAANBAATAR_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

type ExpiringPlan = {
  id: string;
  durationDays: number;
};

/**
 * Returns the final millisecond of the current calendar year in Ulaanbaatar.
 */
export function endOfCurrentYearInUlaanbaatar(now: Date): Date {
  const ulaanbaatarNow = new Date(now.getTime() + ULAANBAATAR_UTC_OFFSET_MS);
  const currentYear = ulaanbaatarNow.getUTCFullYear();

  return new Date(
    Date.UTC(currentYear + 1, 0, 1) - ULAANBAATAR_UTC_OFFSET_MS - 1,
  );
}

export function calculatePlanExpiration(
  plan: ExpiringPlan,
  now: Date,
  customDays?: number,
): Date {
  if (customDays !== undefined && Number.isFinite(customDays) && customDays > 0) {
    return new Date(now.getTime() + customDays * DAY_MS);
  }

  if (plan.id === "1y") {
    return endOfCurrentYearInUlaanbaatar(now);
  }

  return new Date(now.getTime() + plan.durationDays * DAY_MS);
}
