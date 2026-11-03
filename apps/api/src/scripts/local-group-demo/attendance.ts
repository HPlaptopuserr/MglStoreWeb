import type { Prisma } from "@mgl/database";
import { demoDay, instant } from "./fixtures";

export async function seedEmployeeAttendance(
  db: Prisma.TransactionClient,
  organizationId: string,
  userId: string,
  company: number,
  employee: number,
  now: Date,
): Promise<void> {
  const records: Prisma.AttendanceRecordCreateManyInput[] = [];
  const requests: Prisma.WorkforceRequestCreateManyInput[] = [];
  for (let offset = -13; offset <= 0; offset++) {
    const day = demoDay(offset, now),
      weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const scenario = (company * 3 + employee + offset + 20) % 10;
    if (scenario === 0) continue; // An assigned day without a record is an absence.
    if (scenario === 1) {
      requests.push({
        id: `${userId}-${day}-leave`,
        organizationId,
        userId,
        kind: "LEAVE",
        state: "APPROVED",
        from: instant(day, 9),
        to: instant(day, 18),
        note: "Демо: зөвшөөрөгдсөн чөлөө",
        decisionNote: "Локал туршилтын жишээ",
        decidedAt: instant(day, 8),
      });
      continue;
    }
    const clockIn = instant(
      day,
      9,
      scenario === 2 ? 25 : scenario === 3 ? 8 : -2,
    );
    const plannedEnd = instant(
      day,
      scenario === 4 ? 17 : scenario === 9 ? 19 : 18,
    );
    if (clockIn > now) continue;
    const clockOut = plannedEnd <= now ? plannedEnd : null;
    records.push({
      id: `${userId}-${day}-attendance`,
      organizationId,
      userId,
      clockIn,
      clockOut,
      clockInMethod: employee % 2 ? "FACE" : "PIN",
      clockOutMethod: clockOut ? "PIN" : null,
      totalMinutes: clockOut
        ? Math.max(0, Math.floor((+clockOut - +clockIn) / 60_000) - 60)
        : null,
      status:
        scenario === 2 || scenario === 3
          ? "LATE"
          : scenario === 4
            ? "EARLY_LEAVE"
            : "PRESENT",
      note: "LOCAL DEMO: локал ирцийн туршилтын өгөгдөл",
    });
  }
  await db.attendanceRecord.createMany({ data: records, skipDuplicates: true });
  await db.workforceRequest.createMany({
    data: requests,
    skipDuplicates: true,
  });
}
