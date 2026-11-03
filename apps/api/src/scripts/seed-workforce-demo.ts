import "../config/env";
import { prisma } from "@mgl/database";
import bcrypt from "bcryptjs";
import { defaultWorkforceFeatures } from "@mgl/types";
import { wallNow, wallToInstant } from "../services/workforce/calculation";
async function main() {
  const host = new URL(process.env.DATABASE_URL ?? "").hostname;
  if (
    !["localhost", "127.0.0.1", "::1"].includes(host) ||
    process.env.NODE_ENV === "production"
  )
    throw new Error(
      "Workforce demo seed only runs against local development databases",
    );
  const password = process.env.WORKFORCE_DEMO_PASSWORD ?? "MglDemo!2026";
  const passwordHash = await bcrypt.hash(password, 10);
  const org = await prisma.organization.upsert({
    where: { slug: "workforce-demo" },
    create: {
      slug: "workforce-demo",
      name: "MGL Demo · Цаг удирдлага",
      taxId: "WF-DEMO-2026",
      type: "BUSINESS_CUSTOMER",
      maxMembers: 20,
      businessAttendanceEnabled: true,
    },
    update: { businessAttendanceEnabled: true },
  });
  const owner = await prisma.user.upsert({
    where: { email: "attendance.owner@demo.local" },
    create: {
      email: "attendance.owner@demo.local",
      passwordHash,
      role: "USER",
      profile: { create: { fullName: "Демо удирдлага" } },
    },
    update: { passwordHash },
  });
  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: { userId: owner.id, organizationId: org.id },
    },
    create: {
      userId: owner.id,
      organizationId: org.id,
      role: "OWNER",
      isPrimary: true,
    },
    update: { isActive: true, deletedAt: null },
  });
  await prisma.workforcePolicy.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      features: { ...defaultWorkforceFeatures, integrations: true },
      lateGraceMinutes: 5,
    },
    update: {},
  });
  await prisma.workforceSubscription.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      planName: "Демо багц",
      expiresAt: new Date(Date.now() + 180 * 86400000),
      seatUnitPrice: 3000,
    },
    update: {},
  });
  const departmentNames = ["Удирдлага", "Борлуулалт", "Үйл ажиллагаа"];
  for (const name of departmentNames)
    await prisma.workforceDepartment.upsert({
      where: { organizationId_name: { organizationId: org.id, name } },
      create: { organizationId: org.id, name },
      update: {},
    });
  const zone =
    (await prisma.attendanceZone.findFirst({
      where: { organizationId: org.id },
    })) ??
    (await prisma.attendanceZone.create({
      data: {
        organizationId: org.id,
        name: "Демо оффис",
        lat: 47.918,
        lng: 106.917,
        radiusMeters: 150,
      },
    }));
  const shift =
    (await prisma.workforceShift.findFirst({
      where: { organizationId: org.id },
    })) ??
    (await prisma.workforceShift.create({
      data: {
        organizationId: org.id,
        name: "Үндсэн ээлж",
        startMinute: 540,
        endMinute: 1080,
        breakMinutes: 60,
        weekdays: [0, 1, 2, 3, 4, 5, 6],
      },
    }));
  const today = wallNow("Asia/Ulaanbaatar").toISOString().slice(0, 10),
    month = `${today.slice(0, 7)}-01`,
    last = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  last.setUTCMonth(last.getUTCMonth() + 1);
  last.setUTCDate(0);
  const names = [
    "Демо ажилтан 01",
    "Демо ажилтан 02",
    "Демо ажилтан 03",
    "Демо ажилтан 04",
    "Демо ажилтан 05",
    "Демо ажилтан 06",
  ];
  for (let i = 0; i < names.length; i++) {
    const user = await prisma.user.upsert({
      where: { email: `attendance.staff${i + 1}@demo.local` },
      create: {
        email: `attendance.staff${i + 1}@demo.local`,
        passwordHash,
        role: "USER",
        profile: { create: { fullName: names[i] } },
      },
      update: {},
    });
    await prisma.organizationMember.upsert({
      where: {
        userId_organizationId: { userId: user.id, organizationId: org.id },
      },
      create: {
        userId: user.id,
        organizationId: org.id,
        role: "STAFF",
        department: departmentNames[1 + (i % 2)],
      },
      update: {},
    });
    if (
      !(await prisma.workforceAssignment.findFirst({
        where: { organizationId: org.id, userId: user.id, shiftId: shift.id },
      }))
    )
      await prisma.workforceAssignment.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          shiftId: shift.id,
          from: new Date(`${month}T00:00:00Z`),
          to: last,
          zoneId: zone.id,
        },
      });
    if (
      i < 4 &&
      !(await prisma.attendanceRecord.findFirst({
        where: {
          organizationId: org.id,
          userId: user.id,
          clockIn: { gte: new Date(`${today}T00:00:00Z`) },
        },
      }))
    ) {
      const start = wallToInstant(
          new Date(`${today}T${i === 1 ? "09:24" : "08:55"}:00Z`),
          "Asia/Ulaanbaatar",
        ),
        end =
          i === 2
            ? null
            : wallToInstant(new Date(`${today}T18:00:00Z`), "Asia/Ulaanbaatar");
      await prisma.attendanceRecord.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          zoneId: zone.id,
          clockIn: start,
          clockOut: end,
          clockInLat: zone.lat,
          clockInLng: zone.lng,
          clockInMethod: "PIN",
          totalMinutes: end ? Math.floor((+end - +start) / 60000) : null,
        },
      });
    }
    if (
      i === 4 &&
      !(await prisma.workforceRequest.findFirst({
        where: { organizationId: org.id, userId: user.id, kind: "LEAVE" },
      }))
    )
      await prisma.workforceRequest.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          kind: "LEAVE",
          from: new Date(`${today}T00:00:00Z`),
          to: new Date(new Date(`${today}T00:00:00Z`).getTime() + 86400000),
          note: "Туршилтын чөлөөний хүсэлт",
        },
      });
  }
  console.log("Local workforce demo ready: attendance.owner@demo.local");
}
main().finally(() => prisma.$disconnect());
