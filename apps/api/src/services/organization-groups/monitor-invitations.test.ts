import "../../config/env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { organizationGroupRoutes } from "../../routes/organization-groups";
import {
  groupMonitorCandidates,
  inviteGroupMonitors,
} from "./monitor-invitations";
import { GroupError } from "./policy";
let safe = false;
try {
  const url = new URL(process.env.GROUP_TEST_DATABASE_URL ?? "");
  safe =
    ["127.0.0.1", "localhost"].includes(url.hostname) &&
    url.pathname.endsWith("_test") &&
    process.env.DATABASE_URL === process.env.GROUP_TEST_DATABASE_URL;
} catch {
  /* Never use the normal database. */
}
test(
  "monitor selection includes ordinary staff, requires consent, preserves company roles and denies ordinary group actions",
  { skip: !safe },
  async () => {
    const suffix = randomUUID(),
      users: string[] = [],
      orgs: string[] = [];
    let groupId: string | undefined;
    const app = express();
    app.use(express.json());
    app.use("/api", organizationGroupRoutes);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No address");
    async function request(
      userId: string,
      path: string,
      method = "GET",
      body?: unknown,
    ) {
      return fetch(
        `http://127.0.0.1:${address && typeof address !== "string" ? address.port : 0}/api/organization-groups${path}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${jwt.sign({ userId, email: "", role: "USER" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
            "Content-Type": "application/json",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        },
      );
    }
    try {
      for (const name of [
        "Owner",
        "Head staff",
        "Child staff",
        "Private staff",
      ]) {
        const user = await prisma.user.create({
          data: {
            email: `monitor-${users.length}-${suffix}@test.invalid`,
            profile: { create: { fullName: name } },
          },
        });
        users.push(user.id);
      }
      for (const name of ["Head", "Child", "Private"]) {
        const org = await prisma.organization.create({
          data: {
            name,
            slug: `monitor-${orgs.length}-${suffix}`,
            taxId: `monitor-${orgs.length}-${suffix}`,
          },
        });
        orgs.push(org.id);
      }
      const [owner, headStaff, childStaff, privateStaff] = users as [
        string,
        string,
        string,
        string,
      ];
      const [head, child, privateOrg] = orgs as [string, string, string];
      await prisma.organizationMember.createMany({
        data: [
          { userId: owner, organizationId: head, role: "OWNER" },
          { userId: headStaff, organizationId: head, role: "STAFF" },
          { userId: childStaff, organizationId: child, role: "STAFF" },
          { userId: privateStaff, organizationId: privateOrg, role: "STAFF" },
        ],
      });
      const group = await prisma.organizationGroup.create({
        data: { ownerId: owner, name: "Monitor test" },
      });
      groupId = group.id;
      await prisma.groupMember.create({
        data: { groupId, userId: owner, role: "OWNER", allCompanies: true },
      });
      await prisma.groupCompany.createMany({
        data: [
          { groupId, organizationId: head, sharedPermissions: ["PLANS_VIEW"] },
          {
            groupId,
            organizationId: child,
            sharedPermissions: ["EMPLOYEES_VIEW", "PLANS_VIEW"],
          },
          {
            groupId,
            organizationId: privateOrg,
            sharedPermissions: ["PLANS_VIEW"],
          },
        ],
      });
      const childLink = await prisma.groupCompany.findUniqueOrThrow({
        where: { groupId_organizationId: { groupId, organizationId: child } },
      });
      assert.equal(
        (await request(childStaff, "", "POST", { name: "Should not create" }))
          .status,
        403,
      );
      assert.equal((await request(childStaff, `/${groupId}`)).status, 403);
      const people = await groupMonitorCandidates(owner, groupId);
      assert.ok(people.some((p) => p.userId === headStaff));
      assert.ok(people.some((p) => p.userId === childStaff));
      assert.ok(!people.some((p) => p.userId === privateStaff));
      assert.ok(people.every((p) => !("email" in p)));
      const grant = {
        userIds: [childStaff],
        allCompanies: false,
        companyIds: [childLink.id],
        permissions: ["PLANS_VIEW"],
      };
      assert.equal(
        (await inviteGroupMonitors(owner, groupId, grant)).invitedCount,
        1,
      );
      assert.equal(
        await prisma.groupMember.count({
          where: { groupId, userId: childStaff, revokedAt: null },
        }),
        0,
      );
      await assert.rejects(
        () => inviteGroupMonitors(owner, groupId!, grant),
        (e: unknown) => e instanceof GroupError && e.status === 409,
      );
      await assert.rejects(
        () =>
          inviteGroupMonitors(owner, groupId!, {
            ...grant,
            userIds: [privateStaff],
          }),
        (e: unknown) => e instanceof GroupError && e.status === 403,
      );
      const invitation = await prisma.groupPersonInvitation.findFirstOrThrow({
        where: { groupId, recipientUserId: childStaff },
      });
      assert.equal(
        (
          await request(
            headStaff,
            `/invitations/PERSON/${invitation.id}/respond`,
            "POST",
            { action: "ACCEPTED" },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await request(
            childStaff,
            `/invitations/PERSON/${invitation.id}/respond`,
            "POST",
            { action: "ACCEPTED" },
          )
        ).status,
        200,
      );
      const assigned = await prisma.groupMember.findUniqueOrThrow({
        where: { groupId_userId: { groupId, userId: childStaff } },
        include: { companyAccess: true },
      });
      assert.equal(assigned.role, "MANAGER");
      assert.equal(assigned.allCompanies, false);
      assert.deepEqual(assigned.companyAccess[0]?.permissions, ["PLANS_VIEW"]);
      assert.equal(
        (
          await prisma.organizationMember.findFirstOrThrow({
            where: { organizationId: child, userId: childStaff },
          })
        ).role,
        "STAFF",
      );
      assert.equal((await request(childStaff, `/${groupId}`)).status, 200);
      assert.equal(
        (await request(childStaff, `/${groupId}/monitor-candidates`)).status,
        403,
      );
      assert.equal(
        (
          await request(childStaff, `/${groupId}/person-invitations`, "POST", {
            recipient: "other@test.invalid",
            role: "MANAGER",
            allCompanies: true,
            permissions: ["PLANS_VIEW"],
            companyIds: [],
          })
        ).status,
        403,
      );
      await inviteGroupMonitors(owner, groupId, {
        ...grant,
        userIds: [headStaff],
      });
      const second = await prisma.groupPersonInvitation.findFirstOrThrow({
        where: { groupId, recipientUserId: headStaff },
      });
      await prisma.organizationMember.updateMany({
        where: { userId: headStaff },
        data: { isActive: false },
      });
      assert.equal(
        (
          await request(
            headStaff,
            `/invitations/PERSON/${second.id}/respond`,
            "POST",
            { action: "ACCEPTED" },
          )
        ).status,
        403,
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      if (groupId)
        await prisma.organizationGroup.delete({ where: { id: groupId } });
      await prisma.organization.deleteMany({ where: { id: { in: orgs } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
  },
);
