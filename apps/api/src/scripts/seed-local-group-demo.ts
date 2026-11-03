import "../config/env";
import assert from "node:assert/strict";
import { prisma } from "@mgl/database";
import { groupSnapshot } from "../services/organization-groups/snapshot";
import {
  assertLocalDemoDatabase,
  demoCompanies,
  demoDay,
  demoGroupId,
  demoMarker,
  demoPermissions,
  demoPrefix,
  departments,
  employeeName,
  instant,
  pad,
} from "./local-group-demo/fixtures";
import { seedEmployeeAttendance } from "./local-group-demo/attendance";
import { demoEvidence, seedEmployeeTasks } from "./local-group-demo/tasks";

async function main(): Promise<void> {
  assertLocalDemoDatabase(process.env.DATABASE_URL, process.env.NODE_ENV);
  const ownerEmail = process.argv
    .find((v) => v.startsWith("--owner-email="))
    ?.slice("--owner-email=".length);
  if (!ownerEmail)
    throw new Error(
      "Usage: pnpm --filter @mgl/api seed:local-group-demo --owner-email=you@example.com",
    );
  const actor = await prisma.user.findFirstOrThrow({
    where: { email: ownerEmail, isActive: true, deletedAt: null },
  });
  const existing = await prisma.organizationGroup.findUnique({
    where: { id: demoGroupId },
  });
  if (
    existing &&
    (existing.ownerId !== actor.id ||
      !existing.description?.startsWith(demoMarker))
  )
    throw new Error("Demo group collision: refusing to modify another group.");
  const now = new Date(),
    today = demoDay(0, now),
    start = demoDay(-13, now);
  await prisma.organizationGroup.upsert({
    where: { id: demoGroupId },
    update: {},
    create: {
      id: demoGroupId,
      name: "ТӨГС GROUP · Демо",
      description: `${demoMarker} 10 компани × 10 ажилтан. Ирц, ажлын гүйцэтгэлийн хийсвэр өгөгдөл.`,
      ownerId: actor.id,
      createdAt: instant(start, 0),
      members: {
        create: {
          userId: actor.id,
          role: "OWNER",
          allCompanies: true,
          permissions: demoPermissions,
        },
      },
    },
  });
  for (let company = 0; company < 10; company++) {
    const id = `${demoPrefix}-company-${pad(company + 1)}`,
      linkId = `${id}-link`,
      shiftId = `${id}-shift`;
    const employees = Array.from({ length: 10 }, (_, index) => ({
      id: `${id}-employee-${pad(index + 1)}`,
      index,
    }));
    const imageUrls = await Promise.all(
      employees.map((e) => demoEvidence(`${e.id}.png`, company + 1)),
    );
    await prisma.$transaction(
      async (db) => {
        await db.organization.upsert({
          where: { id },
          update: {},
          create: {
            id,
            slug: id,
            name: demoCompanies[company],
            taxId: `DEMO-TUGS-${pad(company + 1)}`,
            status: "ACTIVE",
            businessTasksEnabled: true,
            businessAttendanceEnabled: true,
          },
        });
        await db.workforcePolicy.upsert({
          where: { organizationId: id },
          update: {},
          create: {
            organizationId: id,
            timeZone: "Asia/Ulaanbaatar",
            lateGraceMinutes: 5,
          },
        });
        await db.groupCompany.upsert({
          where: {
            groupId_organizationId: {
              groupId: demoGroupId,
              organizationId: id,
            },
          },
          update: {},
          create: {
            id: linkId,
            groupId: demoGroupId,
            organizationId: id,
            sharedPermissions: demoPermissions,
            joinedAt: instant(demoDay(-14, now), 0),
          },
        });
        await db.workforceShift.upsert({
          where: { id: shiftId },
          update: {},
          create: {
            id: shiftId,
            organizationId: id,
            name: "Үндсэн ээлж · 09:00–18:00",
            startMinute: 540,
            endMinute: 1080,
            breakMinutes: 60,
            weekdays: [1, 2, 3, 4, 5],
          },
        });
        for (const employee of employees) {
          await db.user.upsert({
            where: { id: employee.id },
            update: {},
            create: {
              id: employee.id,
              email: `${employee.id}@demo.invalid`,
              passwordHash: "disabled-local-demo-account",
              profile: {
                create: { fullName: employeeName(company, employee.index) },
              },
            },
          });
        }
        for (const employee of employees) {
          await db.organizationMember.upsert({
            where: {
              userId_organizationId: {
                userId: employee.id,
                organizationId: id,
              },
            },
            update: {},
            create: {
              id: `${employee.id}-membership`,
              organizationId: id,
              userId: employee.id,
              role:
                employee.index === 0
                  ? "OWNER"
                  : employee.index === 1
                    ? "ADMIN"
                    : "STAFF",
              department: departments[employee.index],
              workforceDisplayName: employeeName(company, employee.index),
              createdAt: instant(demoDay(-30, now), 0),
            },
          });
          await db.workforceAssignment.upsert({
            where: { id: `${employee.id}-schedule` },
            update: {},
            create: {
              id: `${employee.id}-schedule`,
              organizationId: id,
              userId: employee.id,
              shiftId,
              from: new Date(`${start}T00:00:00Z`),
              to: new Date(`${demoDay(30, now)}T00:00:00Z`),
            },
          });
          await seedEmployeeAttendance(
            db,
            id,
            employee.id,
            company,
            employee.index,
            now,
          );
          await seedEmployeeTasks(
            db,
            {
              companyIndex: company,
              employeeIndex: employee.index,
              organizationId: id,
              userId: employee.id,
              secondUserId: employees[1].id,
              actorId: actor.id,
              today,
              start,
              past: demoDay(-3, now),
              future: demoDay(3, now),
              now,
            },
            imageUrls[employee.index],
          );
        }
        await db.groupMember.upsert({
          where: {
            groupId_userId: { groupId: demoGroupId, userId: employees[1].id },
          },
          update: {},
          create: {
            groupId: demoGroupId,
            userId: employees[1].id,
            role: "MANAGER",
            permissions: demoPermissions.slice(0, 3),
            companyAccess: {
              create: {
                companyId: linkId,
                permissions: demoPermissions.slice(0, 3),
              },
            },
          },
        });
        await db.organizationGroup.update({
          where: { id: demoGroupId },
          data: { revision: { increment: 1 } },
        });
      },
      { timeout: 30_000 },
    );
    console.log(`Demo company ${company + 1}/10 ready`);
  }
  await prisma.organizationGroup.update({
    where: { id: demoGroupId },
    data: {
      headCompanyId: `${demoPrefix}-company-01`,
      revision: { increment: 1 },
    },
  });
  const count = await prisma.organizationMember.groupBy({
    by: ["organizationId"],
    where: {
      organizationId: { startsWith: `${demoPrefix}-company-` },
      isActive: true,
      deletedAt: null,
    },
    _count: true,
  });
  assert.equal(count.length, 10);
  assert.ok(count.every((row) => row._count === 10));
  const snapshot = await groupSnapshot(actor.id, demoGroupId, today, today);
  const history = await groupSnapshot(actor.id, demoGroupId, start, today);
  assert.equal(snapshot.companies.length, 10);
  assert.equal(snapshot.summary.employees, 100);
  assert.ok(
    snapshot.summary.attendance && snapshot.summary.attendance.expected > 0,
  );
  const tasks = await prisma.organizationTask.count({
    where: { sourceGroupId: demoGroupId },
  });
  assert.equal(tasks, 300);
  console.log(
    JSON.stringify(
      {
        group: "ТӨГС GROUP · Демо",
        groupId: demoGroupId,
        companies: 10,
        employees: 100,
        tasks,
        from: start,
        to: today,
        today: snapshot.summary,
        history: history.summary,
        attendanceRecords: await prisma.attendanceRecord.count({
          where: { organizationId: { startsWith: `${demoPrefix}-company-` } },
        }),
        approvedLeave: await prisma.workforceRequest.count({
          where: {
            organizationId: { startsWith: `${demoPrefix}-company-` },
            kind: "LEAVE",
          },
        }),
      },
      null,
      2,
    ),
  );
}
main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
