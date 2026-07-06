import { prisma } from "../src";

const DEMO_NOTE = "DEMO_ATTENDANCE_SEED";
const BASE_LAT = 47.918873;
const BASE_LNG = 106.917701;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function stableOffset(seed: string, dayIndex: number, modulo: number) {
  const value = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (value + dayIndex * 17) % modulo;
}

async function main() {
  const organization = await prisma.organization.findFirst({
    where: {
      members: {
        some: {
          isActive: true,
          deletedAt: null,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      members: {
        where: {
          isActive: true,
          deletedAt: null,
        },
        orderBy: [{ role: "desc" }, { createdAt: "asc" }],
        take: 3,
        select: {
          userId: true,
          role: true,
          user: {
            select: {
              email: true,
              profile: { select: { fullName: true } },
            },
          },
        },
      },
    },
  });

  if (!organization || organization.members.length < 3) {
    throw new Error("At least 3 active organization members are required.");
  }

  let zone = await prisma.attendanceZone.findFirst({
    where: { organizationId: organization.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  zone ??= await prisma.attendanceZone.create({
    data: {
      organizationId: organization.id,
      name: "Demo office",
      lat: BASE_LAT,
      lng: BASE_LNG,
      radiusMeters: 500,
    },
  });

  const today = startOfDay(new Date());
  const from = addDays(today, -90);

  await prisma.attendanceRecord.deleteMany({
    where: {
      organizationId: organization.id,
      note: DEMO_NOTE,
      clockIn: { gte: from },
    },
  });

  const rows = [];
  for (
    let cursor = from, dayIndex = 0;
    cursor <= today;
    cursor = addDays(cursor, 1), dayIndex += 1
  ) {
    const day = cursor.getDay();
    if (day === 0 || day === 6) continue;

    for (const [memberIndex, member] of organization.members.entries()) {
      const absenceSeed = stableOffset(member.userId, dayIndex, 11);
      if (absenceSeed === memberIndex) continue;

      const clockInMinute =
        9 * 60 + stableOffset(member.userId, dayIndex + memberIndex, 45);
      const workMinutes =
        7 * 60 + 30 + stableOffset(member.userId, dayIndex, 95);
      const clockIn = addMinutes(cursor, clockInMinute);
      const clockOut = addMinutes(clockIn, workMinutes);

      rows.push({
        userId: member.userId,
        organizationId: organization.id,
        zoneId: zone.id,
        clockIn,
        clockInLat: zone.lat,
        clockInLng: zone.lng,
        clockInMethod: "AUTO" as const,
        clockOut,
        clockOutLat: zone.lat,
        clockOutLng: zone.lng,
        clockOutMethod: "AUTO" as const,
        totalMinutes: workMinutes,
        note: DEMO_NOTE,
        status: "PRESENT" as const,
      });
    }
  }

  await prisma.attendanceRecord.createMany({ data: rows });

  console.log(
    `Seeded ${rows.length} demo attendance records for ${organization.name}.`,
  );
  for (const member of organization.members) {
    console.log(
      `- ${member.user.profile?.fullName || member.user.email || member.userId}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
