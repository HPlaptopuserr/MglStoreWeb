import "../../config/env";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID, randomInt } from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { workforceRoutes } from "./index";
const local = (() => {
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(
      new URL(process.env.DATABASE_URL ?? "").hostname,
    );
  } catch {
    return false;
  }
})();
test(
  "personnel edits and reusable departments stay within an organization and preserve the MGL account",
  { skip: !local },
  async () => {
    const suffix = randomUUID();
    const orgIds: string[] = [];
    const userIds: string[] = [];
    const app = express();
    app.use(express.json());
    app.use("/api", workforceRoutes);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No test server");
    const base = `http://127.0.0.1:${address.port}`;
    try {
      for (const name of ["First", "Second"]) {
        const org = await prisma.organization.create({
          data: {
            name: `${name} profile test`,
            slug: `profile-${name}-${suffix}`,
            taxId: `profile-${name}-${suffix}`,
            type: "BUSINESS_CUSTOMER",
            businessAttendanceEnabled: true,
            maxMembers: 10,
          },
        });
        orgIds.push(org.id);
      }
      for (const name of ["owner", "employee"]) {
        const user = await prisma.user.create({
          data: {
            email: `${name}-${suffix}@test.local`,
            profile: {
              create: {
                fullName: `Account ${name}`,
                phoneNumber:
                  name === "employee"
                    ? String(randomInt(10000000, 99999999))
                    : null,
              },
            },
          },
        });
        userIds.push(user.id);
      }
      const members = [];
      for (const organizationId of orgIds) {
        await prisma.organizationMember.create({
          data: { organizationId, userId: userIds[0], role: "OWNER" },
        });
        members.push(
          await prisma.organizationMember.create({
            data: {
              organizationId,
              userId: userIds[1],
              role: "STAFF",
              capabilities: ["WORKFORCE_ATTENDANCE_VIEW"],
            },
          }),
        );
      }
      const token = (userId: string, organizationId: string) =>
        jwt.sign(
          { userId, organizationId, email: "", role: "USER" },
          process.env.JWT_SECRET || "dev-secret-change-me",
          { expiresIn: "5m" },
        );
      const call = async (
        path: string,
        organizationId = orgIds[0],
        method = "GET",
        body?: unknown,
        userId = userIds[0],
      ) => {
        const response = await fetch(
          `${base}/api/workforce/${path}?organizationId=${organizationId}`,
          {
            method,
            headers: {
              Authorization: `Bearer ${token(userId, organizationId)}`,
              "Content-Type": "application/json",
            },
            body: body === undefined ? undefined : JSON.stringify(body),
          },
        );
        return {
          status: response.status,
          data: (await response.json()) as Record<string, unknown>,
        };
      };
      const initial = await call(`employees/${members[0].id}`);
      assert.equal(initial.status, 200);
      assert.equal(
        (initial.data.profile as { fullName: string }).fullName,
        "Account employee",
      );
      const original = await prisma.user.findUniqueOrThrow({
        where: { id: userIds[1] },
        include: { profile: true },
      });
      const changed = await call(
        `employees/${members[0].id}`,
        orgIds[0],
        "PATCH",
        {
          department: "  Борлуулалтын   алба ",
          active: true,
          profile: {
            fullName: "Байгууллагын нэр",
            lastName: "Тест",
            phone: "88112233",
            email: "work@example.mn",
            registerNumber: "PRIVATE_REGISTER",
            birthDate: "2000-01-01",
            jobTitle: "Менежер",
            notes: "PRIVATE_TEST_NOTES",
            payrollBankName: "Тест банк",
            payrollAccountNumber: "0000 1122 3344",
            payrollAccountHolder: "Байгууллагын нэр",
          },
        },
      );
      assert.equal(changed.status, 200, JSON.stringify(changed.data));
      assert.equal(
        await prisma.workforceDepartment.count({
          where: { organizationId: orgIds[0], name: "Борлуулалтын алба" },
        }),
        1,
      );
      const ownerMember = await prisma.organizationMember.findUniqueOrThrow({
        where: {
          userId_organizationId: {
            userId: userIds[0],
            organizationId: orgIds[0],
          },
        },
      });
      assert.equal(
        (
          await call(`employees/${ownerMember.id}`, orgIds[0], "PATCH", {
            department: "борлуулалтын алба",
            active: true,
          })
        ).status,
        200,
      );
      assert.equal(
        await prisma.workforceDepartment.count({
          where: { organizationId: orgIds[0] },
        }),
        1,
      );
      assert.equal(
        await prisma.workforceDepartment.count({
          where: { organizationId: orgIds[1] },
        }),
        0,
      );
      assert.deepEqual(
        await prisma.user.findUniqueOrThrow({
          where: { id: userIds[1] },
          include: { profile: true },
        }),
        original,
      );
      const other = await call(`employees/${members[1].id}`, orgIds[1]);
      assert.equal(
        (other.data.profile as { fullName: string }).fullName,
        "Account employee",
      );
      assert.equal(
        (await call(`employees/${members[0].id}`, orgIds[1])).status,
        404,
      );
      assert.equal(
        (
          await call(
            `employees/${members[0].id}`,
            orgIds[0],
            "GET",
            undefined,
            userIds[1],
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            `employees/${members[0].id}`,
            orgIds[0],
            "PATCH",
            { department: "Forbidden", active: true },
            userIds[1],
          )
        ).status,
        403,
      );
      const viewer = await call(
        "snapshot",
        orgIds[0],
        "GET",
        undefined,
        userIds[1],
      );
      assert.equal(viewer.status, 200);
      assert.ok(!JSON.stringify(viewer.data).includes("000011223344"));
      const adminSnapshot = await call("snapshot");
      assert.ok(!JSON.stringify(adminSnapshot.data).includes("000011223344"));
      assert.ok(JSON.stringify(adminSnapshot.data).includes("•••• 3344"));
      assert.equal(
        (other.data.profile as { payrollAccountNumber: string })
          .payrollAccountNumber,
        "",
      );
      assert.ok(!JSON.stringify(viewer.data).includes("PRIVATE_REGISTER"));
      assert.ok(!JSON.stringify(viewer.data).includes("PRIVATE_TEST_NOTES"));
      await call(`employees/${members[0].id}`, orgIds[0], "PATCH", {
        department: "Борлуулалтын алба",
        active: true,
        profile: { jobTitle: "Шинэ албан тушаал" },
      });
      const edited = await call(`employees/${members[0].id}`);
      assert.equal(
        (edited.data.profile as { payrollAccountNumber: string })
          .payrollAccountNumber,
        "000011223344",
      );
      const invalidPayroll = await call(
        `employees/${members[0].id}`,
        orgIds[0],
        "PATCH",
        {
          department: "Хадгалахгүй хэлтэс",
          active: true,
          profile: { payrollBankName: "Дутуу" },
        },
      );
      assert.equal(invalidPayroll.status, 400);
      assert.equal(
        await prisma.workforceDepartment.count({
          where: { organizationId: orgIds[0], name: "Хадгалахгүй хэлтэс" },
        }),
        0,
      );
      assert.equal(
        (edited.data.profile as { fullName: string }).fullName,
        "Байгууллагын нэр",
      );
      assert.equal(
        (
          await call(`employees/${members[0].id}`, orgIds[0], "PATCH", {
            department: "Should not persist",
            active: true,
            profile: { birthDate: "2000-02-31" },
          })
        ).status,
        400,
      );
      assert.equal(
        await prisma.workforceDepartment.count({
          where: { organizationId: orgIds[0], name: "Should not persist" },
        }),
        0,
      );
      assert.equal(
        (
          await call(`employees/${members[0].id}`, orgIds[0], "PATCH", {
            department: "",
            active: true,
          })
        ).status,
        200,
      );
      assert.equal(
        await prisma.workforceDepartment.count({
          where: { organizationId: orgIds[0] },
        }),
        1,
      );
      assert.equal(
        (
          await call(`employees/${members[0].id}`, orgIds[0], "PATCH", {
            department: "",
            active: true,
            profile: {
              payrollBankName: "",
              payrollAccountNumber: "",
              payrollAccountHolder: "",
            },
          })
        ).status,
        200,
      );
      const cleared = await call(`employees/${members[0].id}`);
      assert.equal(
        (cleared.data.profile as { payrollAccountNumber: string })
          .payrollAccountNumber,
        "",
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.$disconnect();
    }
  },
);
