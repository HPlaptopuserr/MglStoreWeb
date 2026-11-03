import "../../config/env";
import assert from "node:assert/strict";
import { after, before, mock, test } from "node:test";
import type { Server } from "node:http";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { organizationGroupRoutes } from "./index";
import { emailService } from "../../services/email/email.service";
import { wallNow, wallToInstant } from "../../services/workforce/calculation";
const testUrl = process.env.GROUP_TEST_DATABASE_URL;
const safeDb = (() => {
  try {
    const url = new URL(testUrl ?? "");
    return (
      ["127.0.0.1", "localhost"].includes(url.hostname) &&
      url.pathname.endsWith("_test") &&
      testUrl === process.env.DATABASE_URL
    );
  } catch {
    return false;
  }
})();
type Data = Record<string, unknown>;
let server: Server | undefined,
  base = "";
const ids: string[] = [],
  orgIds: string[] = [],
  groupIds: string[] = [];
const token = (userId: string) =>
  jwt.sign(
    { userId, email: "", role: "USER" },
    process.env.JWT_SECRET || "dev-secret-change-me",
  );
async function request(
  path: string,
  userId: string,
  method = "GET",
  body?: unknown,
) {
  const response = await fetch(`${base}/api/organization-groups${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token(userId)}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: (await response.json()) as Data };
}
const asList = (value: unknown) => value as Data[];
before(async () => {
  if (!safeDb) return;
  mock.method(emailService, "isConfigured", () => false);
  const app = express();
  app.use(express.json());
  app.use("/api", organizationGroupRoutes);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No server address");
  base = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  if (!safeDb) return;
  await prisma.organizationGroup.deleteMany({
    where: { id: { in: groupIds } },
  });
  await prisma.organizationTask.deleteMany({
    where: { organizationId: { in: orgIds } },
  });
  await prisma.attendanceRecord.deleteMany({
    where: { organizationId: { in: orgIds } },
  });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  }
  await prisma.$disconnect();
  mock.restoreAll();
});
test(
  "group consent, tenant boundaries, concurrency, revocation and aggregation",
  { skip: !safeDb },
  async (t) => {
    const suffix = randomUUID();
    for (const name of [
      "owner",
      "company",
      "manager",
      "outsider",
      "employee",
    ]) {
      const user = await prisma.user.create({
        data: {
          email: `group-${name}-${suffix}@test.local`,
          profile: { create: { fullName: name } },
        },
      });
      ids.push(user.id);
    }
    const [owner, companyOwner, manager, outsider, employee] = ids as [
      string,
      string,
      string,
      string,
      string,
    ];
    for (const name of ["first", "second"]) {
      const org = await prisma.organization.create({
        data: {
          name,
          slug: `group-${name}-${suffix}`,
          taxId: `group-${name}-${suffix}`,
          businessAttendanceEnabled: true,
          businessTasksEnabled: true,
        },
      });
      orgIds.push(org.id);
    }
    const [first, second] = orgIds as [string, string];
    await prisma.organizationMember.createMany({
      data: [
        { userId: companyOwner, organizationId: first, role: "OWNER" },
        { userId: owner, organizationId: second, role: "OWNER" },
        { userId: employee, organizationId: first, role: "STAFF" },
        { userId: employee, organizationId: second, role: "STAFF" },
      ],
    });
    const created = await request("", owner, "POST", {
      name: "  ТӨГС GROUP  ",
    });
    assert.equal(created.status, 201);
    const group = String(created.data.id);
    groupIds.push(group);
    await t.test(
      "company search supports names, registration prefixes and formatted phone without sharing private details",
      async () => {
        const searchGroup = String(
          (await request("", owner, "POST", { name: "Search group" })).data.id,
        );
        groupIds.push(searchGroup);
        const searchIds = [randomUUID(), randomUUID(), randomUUID()];
        orgIds.push(...searchIds);
        await prisma.organization.createMany({
          data: searchIds.map((id, index) => ({
            id,
            slug: id,
            name:
              index === 0
                ? `ТӨГС ХАЙЛТ ${suffix}`
                : `ТӨГС ХАЙЛТ ${suffix} ${index}`,
            taxId: `search-${suffix}-${index}`,
            phone: index === 0 ? "+976 99 00-1234" : null,
            deletedAt: index === 2 ? new Date() : null,
          })),
        });
        await prisma.groupCompany.create({
          data: {
            groupId: searchGroup,
            organizationId: searchIds[0]!,
            sharedPermissions: [],
          },
        });
        await prisma.groupCompanyInvitation.create({
          data: {
            groupId: searchGroup,
            organizationId: searchIds[1]!,
            createdById: owner,
            permissions: ["PLANS_VIEW"],
            expiresAt: new Date(Date.now() + 86400000),
          },
        });
        const byName = await request(
          `/${searchGroup}/company-search?q=${encodeURIComponent(`төгс хайлт ${suffix}`)}`,
          owner,
        );
        assert.equal(byName.status, 200);
        assert.equal(asList(byName.data).length, 2);
        assert.equal(asList(byName.data)[0]?.id, searchIds[0]);
        assert.equal(asList(byName.data)[0]?.linkState, "CONNECTED");
        assert.equal(asList(byName.data)[1]?.linkState, "PENDING");
        assert.deepEqual(Object.keys(asList(byName.data)[0]!).sort(), [
          "id",
          "linkState",
          "name",
          "taxId",
        ]);
        for (const q of [
          "99001234",
          "+976 9900 1234",
          `search-${suffix}-0`,
          searchIds[0]!,
        ]) {
          const result = await request(
            `/${searchGroup}/company-search?q=${encodeURIComponent(q)}`,
            owner,
          );
          assert.equal(result.status, 200);
          assert.equal(asList(result.data)[0]?.id, searchIds[0]);
        }
        assert.equal(
          (
            await request(
              `/${searchGroup}/company-search?q=${encodeURIComponent(`search-${suffix}`)}`,
              owner,
            )
          ).status,
          200,
        );
        assert.equal(
          (await request(`/${searchGroup}/company-search?q=x`, owner)).status,
          400,
        );
        assert.equal(
          (
            await request(
              `/${searchGroup}/company-search?q=${encodeURIComponent("%_")}`,
              owner,
            )
          ).status,
          200,
        );
        assert.equal(
          asList(
            (
              await request(
                `/${searchGroup}/company-search?q=${encodeURIComponent("%_")}`,
                owner,
              )
            ).data,
          ).length,
          0,
        );
        assert.equal(
          (await request(`/${searchGroup}/company-search?q=search`, outsider))
            .status,
          403,
        );
        const many = Array.from({ length: 25 }, () => randomUUID());
        orgIds.push(...many);
        await prisma.organization.createMany({
          data: many.map((id, index) => ({
            id,
            slug: id,
            name: `Search Many ${suffix} ${index}`,
            taxId: id,
          })),
        });
        const limited = await request(
          `/${searchGroup}/company-search?q=${encodeURIComponent(`Search Many ${suffix}`)}`,
          owner,
        );
        assert.equal(asList(limited.data).length, 20);
      },
    );
    await t.test(
      "groups accept a chosen name and renaming preserves other metadata",
      async () => {
        assert.equal(created.data.name, "ТӨГС GROUP");
        for (const name of ["   ", "A".repeat(161)])
          assert.equal(
            (await request("", owner, "POST", { name })).status,
            400,
          );
        await prisma.organizationGroup.update({
          where: { id: group },
          data: {
            description: "Keep description",
            logoUrl: "https://example.com/logo.png",
          },
        });
        assert.equal(
          (
            await request(`/${group}`, outsider, "PATCH", {
              name: "Unauthorized",
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await request(`/${group}`, owner, "PATCH", {
              name: "ТӨГС GROUP шинэ",
            })
          ).status,
          200,
        );
        const updated = await prisma.organizationGroup.findUniqueOrThrow({
          where: { id: group },
        });
        assert.equal(updated.name, "ТӨГС GROUP шинэ");
        assert.equal(updated.description, "Keep description");
        assert.equal(updated.logoUrl, "https://example.com/logo.png");
      },
    );

    const allPermissions = ["ATTENDANCE_VIEW", "EMPLOYEES_VIEW", "PLANS_VIEW"];
    const inviteCompany = async (groupId: string, org: string) => {
      const result = await request(
        `/${groupId}/company-invitations`,
        owner,
        "POST",
        { organizationId: org, permissions: allPermissions },
      );
      assert.equal(result.status, 201);
      return String(result.data.id);
    };
    const firstInvitation = await inviteCompany(group, first);
    await t.test(
      "company owner consent cannot be borrowed from a group owner or token",
      async () => {
        const received = await request("/invitations", companyOwner);
        assert.equal(received.status, 200);
        const pending = asList(received.data).find(
          (i) => i.id === firstInvitation,
        );
        assert.equal(pending?.status, "PENDING");
        assert.equal(pending?.canRespond, true);
        // One Owner can own several companies; the inbox and consent remain
        // tied to the invitation's organization, never all of their companies.
        const extraOwnership = await prisma.organizationMember.create({
          data: { userId: companyOwner, organizationId: second, role: "OWNER" },
        });
        try {
          const firstInbox = await request(
            `/invitations?organizationId=${first}`,
            companyOwner,
          );
          assert.equal(firstInbox.status, 200);
          assert.ok(
            asList(firstInbox.data).some((i) => i.id === firstInvitation),
          );
          assert.ok(
            asList(firstInbox.data).every((i) => i.organizationId === first),
          );
          const secondInbox = await request(
            `/invitations?organizationId=${second}`,
            companyOwner,
          );
          assert.equal(secondInbox.status, 200);
          assert.ok(
            !asList(secondInbox.data).some((i) => i.id === firstInvitation),
          );
          assert.equal(
            (await request(`/invitations?organizationId=${first}`, outsider))
              .status,
            403,
          );
          assert.equal(
            (
              await request(
                `/invitations/COMPANY/${firstInvitation}/respond`,
                companyOwner,
                "POST",
                {
                  action: "ACCEPTED",
                  organizationId: second,
                },
              )
            ).status,
            403,
          );
        } finally {
          await prisma.organizationMember.delete({
            where: { id: extraOwnership.id },
          });
        }

        assert.equal(
          await prisma.groupCompany.count({
            where: {
              groupId: group,
              organizationId: first,
              disconnectedAt: null,
            },
          }),
          0,
        );
        assert.equal(
          (
            await request(
              `/invitations/COMPANY/${firstInvitation}/respond`,
              owner,
              "POST",
              { action: "ACCEPTED" },
            )
          ).status,
          403,
        );
        assert.equal(
          (await request(`/${group}/snapshot`, owner)).data.summary &&
            asList((await request(`/${group}/snapshot`, owner)).data.companies)
              .length,
          0,
        );
        assert.equal(
          (
            await request(
              `/invitations/COMPANY/${firstInvitation}/respond`,
              companyOwner,
              "POST",
              { action: "ACCEPTED" },
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              `/invitations/COMPANY/${firstInvitation}/respond`,
              companyOwner,
              "POST",
              { action: "ACCEPTED" },
            )
          ).status,
          409,
        );
        assert.equal(
          await prisma.groupCompany.count({
            where: {
              groupId: group,
              organizationId: second,
              disconnectedAt: null,
            },
          }),
          0,
        );
        assert.equal(
          await prisma.groupMember.count({
            where: { groupId: group, userId: companyOwner, revokedAt: null },
          }),
          0,
        );
      },
    );
    await t.test(
      "the same company can independently consent to multiple groups",
      async () => {
        const another = await request("", owner, "POST");
        const group2 = String(another.data.id);
        groupIds.push(group2);
        const id = await inviteCompany(group2, first);
        assert.equal(
          (
            await request(
              `/invitations/COMPANY/${id}/respond`,
              companyOwner,
              "POST",
              { action: "ACCEPTED" },
            )
          ).status,
          200,
        );
        assert.equal(
          await prisma.groupCompany.count({
            where: { organizationId: first, disconnectedAt: null },
          }),
          2,
        );
      },
    );
    const secondInvitation = await inviteCompany(group, second);
    assert.equal(
      (
        await request(
          `/invitations/COMPANY/${secondInvitation}/respond`,
          owner,
          "POST",
          { action: "ACCEPTED" },
        )
      ).status,
      200,
    );
    const firstLink = await prisma.groupCompany.findUniqueOrThrow({
      where: {
        groupId_organizationId: { groupId: group, organizationId: first },
      },
    });
    const secondLink = await prisma.groupCompany.findUniqueOrThrow({
      where: {
        groupId_organizationId: { groupId: group, organizationId: second },
      },
    });
    await t.test(
      "head company must be accepted, and head removal preserves state",
      async () => {
        assert.equal(
          (
            await request(`/${group}/head-company`, owner, "PUT", {
              organizationId: "wrong-company",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(`/${group}/head-company`, owner, "PUT", {
              organizationId: first,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              `/${group}/companies/${firstLink.id}`,
              companyOwner,
              "DELETE",
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await request(`/${group}/head-company`, owner, "PUT", {
              organizationId: second,
            })
          ).status,
          200,
        );
        assert.equal(
          await prisma.groupAuditLog.count({
            where: { groupId: group, action: "HEAD_CHANGED" },
          }),
          2,
        );
      },
    );
    const person = await request(
      `/${group}/person-invitations`,
      owner,
      "POST",
      {
        recipient: `group-manager-${suffix}@test.local`,
        role: "MANAGER",
        allCompanies: false,
        companyIds: [firstLink.id],
        permissions: allPermissions,
      },
    );
    assert.equal(person.status, 201);
    const personId = String(person.data.id);
    await t.test(
      "pending users see no company data and concurrent acceptance creates one member",
      async () => {
        assert.equal(
          (await request(`/${group}/snapshot`, manager)).status,
          403,
        );
        assert.equal(
          (
            await request(
              `/invitations/PERSON/${personId}/respond`,
              outsider,
              "POST",
              { action: "ACCEPTED" },
            )
          ).status,
          403,
        );
        const results = await Promise.all([
          request(`/invitations/PERSON/${personId}/respond`, manager, "POST", {
            action: "ACCEPTED",
          }),
          request(`/invitations/PERSON/${personId}/respond`, manager, "POST", {
            action: "ACCEPTED",
          }),
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
        assert.equal(
          await prisma.groupMember.count({
            where: { groupId: group, userId: manager },
          }),
          1,
        );
        assert.equal(
          (
            await request(
              `/${group}/snapshot?organizationId=${second}`,
              manager,
            )
          ).status,
          403,
        );
        assert.equal(
          (await request(`/${group}/snapshot?organizationId=altered`, manager))
            .status,
          403,
        );
        const data = await request(`/${group}`, manager);
        assert.equal(asList(data.data.companies).length, 1);
        assert.equal(
          (
            await request(`/${group}/person-invitations`, manager, "POST", {
              recipient: "other@test.local",
              role: "ADMIN",
              allCompanies: true,
              companyIds: [],
              permissions: allPermissions,
            })
          ).status,
          403,
        );
      },
    );

    await t.test(
      "scoped admins cannot delegate more access, and revoked senders cannot admit members",
      async () => {
        const admin = await prisma.user.create({
          data: { email: `limited-admin-${suffix}@test.local` },
        });
        ids.push(admin.id);
        const delegate = await prisma.user.create({
          data: { email: `delegate-${suffix}@test.local` },
        });
        ids.push(delegate.id);
        const adminInvite = await request(
          `/${group}/person-invitations`,
          owner,
          "POST",
          {
            recipient: admin.email,
            role: "ADMIN",
            allCompanies: false,
            companyIds: [firstLink.id],
            permissions: ["ATTENDANCE_VIEW"],
          },
        );
        assert.equal(
          (
            await request(
              `/invitations/PERSON/${adminInvite.data.id}/respond`,
              admin.id,
              "POST",
              { action: "ACCEPTED" },
            )
          ).status,
          200,
        );
        const grant = {
          recipient: delegate.email,
          role: "MANAGER",
          allCompanies: false,
          companyIds: [firstLink.id],
          permissions: ["ATTENDANCE_VIEW"],
        };
        for (const invalid of [
          { ...grant, role: "ADMIN" },
          { ...grant, allCompanies: true },
          { ...grant, companyIds: [secondLink.id] },
          { ...grant, permissions: ["PLANS_VIEW"] },
        ])
          assert.equal(
            (
              await request(
                `/${group}/person-invitations`,
                admin.id,
                "POST",
                invalid,
              )
            ).status,
            403,
          );
        const invitation = await request(
          `/${group}/person-invitations`,
          admin.id,
          "POST",
          grant,
        );
        assert.equal(invitation.status, 201);
        const adminMembership = await prisma.groupMember.findUniqueOrThrow({
          where: { groupId_userId: { groupId: group, userId: admin.id } },
        });
        assert.equal(
          (
            await request(
              `/${group}/members/${adminMembership.id}`,
              owner,
              "DELETE",
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              `/invitations/PERSON/${invitation.data.id}/respond`,
              delegate.id,
              "POST",
              { action: "ACCEPTED" },
            )
          ).status,
          403,
        );
        assert.equal(
          await prisma.groupMember.count({
            where: { groupId: group, userId: delegate.id },
          }),
          0,
        );
      },
    );
    await t.test(
      "all-company employee totals are deduplicated and no-schedule attendance is null",
      async () => {
        const today = wallNow("Asia/Ulaanbaatar").toISOString().slice(0, 10);
        await prisma.groupCompany.updateMany({
          where: { groupId: group },
          data: { joinedAt: new Date(Date.now() - 3 * 86400_000) },
        });
        const task = await prisma.organizationTask.create({
          data: {
            organizationId: first,
            title: "Approved work",
            createdById: owner,
            dueAt: new Date(`${today}T05:00:00Z`),
            assignees: {
              create: [
                { userId: employee, status: "DONE" },
                { userId: companyOwner, status: "PENDING_REVIEW" },
              ],
            },
          },
        });
        let result = await request(
          `/${group}/snapshot?from=${today}&to=${today}`,
          owner,
        );
        assert.equal((result.data.summary as Data).employees, 3);
        assert.equal(
          ((result.data.summary as Data).attendance as Data).rate,
          null,
        );
        assert.equal(
          ((result.data.summary as Data).plans as Data).completed,
          0,
        );
        await prisma.organizationTaskAssignee.updateMany({
          where: { taskId: task.id },
          data: { status: "DONE" },
        });
        result = await request(
          `/${group}/snapshot?from=${today}&to=${today}`,
          owner,
        );
        assert.equal(
          ((result.data.summary as Data).plans as Data).completed,
          1,
        );
        assert.equal(
          (
            await request(
              `/${group}/snapshot?from=2026-01-01&to=2026-12-31`,
              owner,
            )
          ).status,
          400,
        );
      },
    );

    await t.test(
      "deactivated staff retain their consented attendance history",
      async () => {
        await prisma.organizationMember.updateMany({
          where: { userId: employee },
          data: { createdAt: new Date(Date.now() - 10 * 86400_000) },
        });
        await prisma.attendanceRecord.create({
          data: {
            userId: employee,
            organizationId: first,
            clockIn: new Date(Date.now() - 120 * 60000),
            clockOut: new Date(Date.now() - 60 * 60000),
            totalMinutes: 60,
            clockInMethod: "PIN",
            status: "PRESENT",
          },
        });
        await prisma.user.update({
          where: { id: employee },
          data: { isActive: false },
        });
        const today = wallNow("Asia/Ulaanbaatar").toISOString().slice(0, 10);
        const snapshot = await request(
          `/${group}/snapshot?organizationId=${first}&from=${wallNow(
            "Asia/Ulaanbaatar",
            new Date(Date.now() - 86400_000),
          )
            .toISOString()
            .slice(0, 10)}&to=${today}`,
          owner,
        );
        assert.equal(snapshot.status, 200);
        assert.equal(
          (asList(snapshot.data.companies)[0]?.attendance as Data)
            .workedMinutes,
          60,
        );
        await prisma.user.update({
          where: { id: employee },
          data: { isActive: true },
        });
      },
    );

    await t.test(
      "early overnight clock-ins remain available to the existing workforce calculator",
      async () => {
        const today = wallNow("Asia/Ulaanbaatar").toISOString().slice(0, 10);
        const day = new Date(`${today}T00:00:00Z`);
        const shift = await prisma.workforceShift.create({
          data: {
            organizationId: first,
            name: "Night edge",
            startMinute: 0,
            endMinute: 480,
            breakMinutes: 0,
            weekdays: [0, 1, 2, 3, 4, 5, 6],
          },
        });
        const assignment = await prisma.workforceAssignment.create({
          data: {
            organizationId: first,
            userId: companyOwner,
            shiftId: shift.id,
            from: day,
            to: day,
          },
        });
        const record = await prisma.attendanceRecord.create({
          data: {
            organizationId: first,
            userId: companyOwner,
            clockIn: wallToInstant(
              new Date(+day - 30 * 60000),
              "Asia/Ulaanbaatar",
            ),
            clockOut: wallToInstant(
              new Date(+day + 480 * 60000),
              "Asia/Ulaanbaatar",
            ),
            clockInMethod: "PIN",
            status: "PRESENT",
          },
        });
        try {
          const result = await request(
            `/${group}/snapshot?organizationId=${first}&from=${today}&to=${today}`,
            owner,
          );
          assert.equal(result.status, 200);
          assert.equal(
            (asList(result.data.companies)[0]?.attendance as Data).present,
            1,
          );
        } finally {
          await prisma.attendanceRecord.delete({ where: { id: record.id } });
          await prisma.workforceAssignment.delete({
            where: { id: assignment.id },
          });
          await prisma.workforceShift.delete({ where: { id: shift.id } });
        }
      },
    );
    await t.test(
      "company consent intersects with member permission and disconnected access disappears",
      async () => {
        assert.equal(
          (
            await request(
              `/${group}/companies/${firstLink.id}/sharing`,
              companyOwner,
              "PATCH",
              { permissions: ["ATTENDANCE_VIEW"] },
            )
          ).status,
          200,
        );
        const result = await request(
          `/${group}/snapshot?includePeople=true`,
          manager,
        );
        const companies = asList(result.data.companies);
        assert.equal(companies[0]?.employees, null);
        assert.equal(companies[0]?.plans, null);
        assert.deepEqual(companies[0]?.people, []);
        assert.deepEqual(companies[0]?.tasks, []);
        assert.equal(
          (
            await request(
              `/${group}/companies/${firstLink.id}`,
              companyOwner,
              "DELETE",
            )
          ).status,
          200,
        );
        assert.equal(
          (await request(`/${group}/snapshot?organizationId=${first}`, manager))
            .status,
          403,
        );
        assert.equal(
          await prisma.organizationTask.count({
            where: { organizationId: first },
          }),
          1,
        );
        assert.equal(
          (
            await request(
              `/${group}/companies/${secondLink.id}`,
              owner,
              "DELETE",
            )
          ).status,
          409,
        );
      },
    );
    await t.test(
      "revocation closes dashboard and members endpoints without deleting company history",
      async () => {
        const member = await prisma.groupMember.findUniqueOrThrow({
          where: { groupId_userId: { groupId: group, userId: manager } },
        });
        assert.equal(
          (await request(`/${group}/members/${member.id}`, owner, "DELETE"))
            .status,
          200,
        );
        assert.equal(
          (await request(`/${group}/snapshot`, manager)).status,
          403,
        );
        assert.equal((await request(`/${group}`, manager)).status, 403);
        assert.equal((await request(`/${group}/audit`, manager)).status, 403);
      },
    );
    await t.test(
      "expired and cancelled codes cannot grant access; unregistered recipients review before joining",
      async () => {
        const data = {
          recipient: `new-${suffix}@test.local`,
          role: "MANAGER",
          allCompanies: true,
          companyIds: [],
          permissions: ["PLANS_VIEW"],
        };
        const pending = await request(
          `/${group}/person-invitations`,
          owner,
          "POST",
          data,
        );
        assert.equal(pending.status, 201);
        const newcomer = await prisma.user.create({
          data: { email: data.recipient },
        });
        ids.push(newcomer.id);
        assert.equal(
          (
            await request(`/invitations/preview`, outsider, "POST", {
              code: pending.data.code,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await request(`/invitations/preview`, newcomer.id, "POST", {
              code: pending.data.code,
            })
          ).status,
          200,
        );
        assert.equal((await request(`/${group}`, newcomer.id)).status, 403);
        assert.equal(
          (
            await request(`/invitations/claim`, newcomer.id, "POST", {
              code: pending.data.code,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request(`/invitations/claim`, newcomer.id, "POST", {
              code: pending.data.code,
            })
          ).status,
          409,
        );
        const expired = await request(
          `/${group}/person-invitations`,
          owner,
          "POST",
          { ...data, recipient: "expired@test.local" },
        );
        await prisma.groupPersonInvitation.update({
          where: { id: String(expired.data.id) },
          data: { expiresAt: new Date(0) },
        });
        const expiredUser = await prisma.user.create({
          data: { email: "expired@test.local" },
        });
        ids.push(expiredUser.id);
        assert.equal(
          (
            await request(`/invitations/claim`, expiredUser.id, "POST", {
              code: expired.data.code,
            })
          ).status,
          409,
        );
        const cancelled = await request(
          `/${group}/person-invitations`,
          owner,
          "POST",
          { ...data, recipient: "cancelled@test.local" },
        );
        assert.equal(
          (
            await request(
              `/invitations/PERSON/${cancelled.data.id}/respond`,
              owner,
              "POST",
              { action: "CANCELLED" },
            )
          ).status,
          200,
        );
        const cancelledUser = await prisma.user.create({
          data: { email: "cancelled@test.local" },
        });
        ids.push(cancelledUser.id);
        assert.equal(
          (
            await request(`/invitations/claim`, cancelledUser.id, "POST", {
              code: cancelled.data.code,
            })
          ).status,
          409,
        );
      },
    );
    await t.test(
      "ten-plus companies remain independently scoped and employee totals stay unique",
      async () => {
        for (let index = 0; index < 11; index++) {
          const company = await prisma.organization.create({
            data: {
              name: `Additional ${index}`,
              slug: `additional-${index}-${suffix}`,
              taxId: `additional-${index}-${suffix}`,
              members: { create: { userId: owner, role: "OWNER" } },
            },
          });
          orgIds.push(company.id);
          const invitation = await inviteCompany(group, company.id);
          assert.equal(
            (
              await request(
                `/invitations/COMPANY/${invitation}/respond`,
                owner,
                "POST",
                { action: "ACCEPTED" },
              )
            ).status,
            200,
          );
        }
        const snapshot = await request(`/${group}/snapshot`, owner);
        assert.equal(snapshot.status, 200);
        assert.equal(asList(snapshot.data.companies).length, 12);
        assert.equal((snapshot.data.summary as Data).employees, 2);
        const detailed = await request(
          `/${group}/snapshot?includePeople=true`,
          owner,
        );
        assert.equal(detailed.status, 200);
        const rows = asList(detailed.data.companies);
        assert.equal(rows.length, 12);
        assert.equal((detailed.data.summary as Data).employees, 2);
        assert.ok(
          rows.every(
            (row) => Array.isArray(row.people) && Array.isArray(row.tasks),
          ),
        );
        assert.equal(
          new Set(
            rows.flatMap((row) => asList(row.people).map((p) => p.userId)),
          ).size,
          2,
        );
        const scoped = await request(
          `/${group}/snapshot?includePeople=true&organizationId=${rows[0]!.organizationId}`,
          owner,
        );
        assert.equal(scoped.status, 200);
        assert.equal(asList(scoped.data.companies).length, 1);
      },
    );
    await t.test(
      "ownership requires designated active member consent and preserves one owner",
      async () => {
        const invitation = await request(
          `/${group}/person-invitations`,
          owner,
          "POST",
          {
            recipient: `group-company-${suffix}@test.local`,
            role: "ADMIN",
            allCompanies: true,
            companyIds: [],
            permissions: allPermissions,
          },
        );
        assert.equal(
          (
            await request(
              `/invitations/PERSON/${invitation.data.id}/respond`,
              companyOwner,
              "POST",
              { action: "ACCEPTED" },
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(`/${group}/ownership/request`, owner, "POST", {
              userId: outsider,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await request(`/${group}/ownership/request`, owner, "POST", {
              userId: companyOwner,
            })
          ).status,
          200,
        );
        assert.equal(
          (await request(`/${group}/ownership/accept`, outsider, "POST"))
            .status,
          403,
        );
        const results = await Promise.all([
          request(`/${group}/ownership/accept`, companyOwner, "POST"),
          request(`/${group}/ownership/accept`, companyOwner, "POST"),
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 403]);
        assert.equal(
          await prisma.groupMember.count({
            where: { groupId: group, role: "OWNER" },
          }),
          1,
        );
        assert.equal(
          (
            await prisma.organizationGroup.findUniqueOrThrow({
              where: { id: group },
            })
          ).ownerId,
          companyOwner,
        );
        assert.equal(
          (
            await request(`/${group}/head-company`, owner, "PUT", {
              organizationId: second,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await request(`/${group}/ownership/request`, companyOwner, "POST", {
              userId: owner,
            })
          ).status,
          200,
        );
        await prisma.organizationGroup.update({
          where: { id: group },
          data: { ownershipExpiresAt: new Date(0) },
        });
        assert.equal(
          (await request(`/${group}/ownership/accept`, owner, "POST")).status,
          403,
        );
        assert.equal(
          (await request(`/${group}/ownership/cancel`, companyOwner, "POST"))
            .status,
          200,
        );
        assert.equal(
          (await request(`/${group}/audit`, companyOwner)).status,
          200,
        );
      },
    );
  },
);
