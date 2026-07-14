import { prisma } from "@mgl/database";

const ACTIVITY_TIME_ZONE = "Asia/Ulaanbaatar";
const recordedActivityKeys = new Set<string>();

function calendarDateKey(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACTIVITY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function toActivityDate(value: Date): Date {
  return new Date(`${calendarDateKey(value)}T00:00:00.000Z`);
}

export function shiftActivityDate(value: Date, days: number): Date {
  const shifted = new Date(value);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

export async function recordOrganizationActivity(
  organizationId: string | null | undefined,
): Promise<void> {
  if (!organizationId) return;

  const now = new Date();
  const activityDate = toActivityDate(now);
  const cacheKey = `${organizationId}:${activityDate.toISOString()}`;
  if (recordedActivityKeys.has(cacheKey)) return;
  recordedActivityKeys.add(cacheKey);

  try {
    await prisma.organizationDailyActivity.upsert({
      where: {
        organizationId_activityDate: { organizationId, activityDate },
      },
      create: {
        organizationId,
        activityDate,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        activityCount: { increment: 1 },
        lastSeenAt: now,
      },
    });
  } catch (error) {
    recordedActivityKeys.delete(cacheKey);
    console.warn("[organization daily activity unavailable]", error);
  }
}

export async function countConsistentlyActiveOrganizations(
  startDate: Date,
  endDateExclusive: Date,
  expectedDays: number,
): Promise<number> {
  const rows = await prisma.organizationDailyActivity.groupBy({
    by: ["organizationId"],
    where: {
      activityDate: { gte: startDate, lt: endDateExclusive },
      organization: { status: "ACTIVE", deletedAt: null },
    },
    _count: { activityDate: true },
  });

  return rows.filter((row) => row._count.activityDate >= expectedDays).length;
}
