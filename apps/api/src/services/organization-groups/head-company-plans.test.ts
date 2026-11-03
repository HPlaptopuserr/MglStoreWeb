import "../../config/env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma, OrganizationTaskPriority } from "@mgl/database";
import { createTask } from "../tasks/commands";
import { headCompanyPlans } from "./head-company-plans";
import { GroupError } from "./policy";
let safe = false;
try {
  const url = new URL(process.env.GROUP_TEST_DATABASE_URL ?? "");
  safe =
    ["127.0.0.1", "localhost"].includes(url.hostname) &&
    url.pathname.endsWith("_test") &&
    process.env.GROUP_TEST_DATABASE_URL === process.env.DATABASE_URL;
} catch {
  /* No real database is used by this test. */
}
test(
  "head inbox immediately reads future employee self-plans, preserves consent and group scopes, and paginates",
  { skip: !safe },
  async () => {
    const suffix = randomUUID();
    const users: string[] = [],
      orgs: string[] = [];
    let groupId: string | undefined;
    try {
      for (const name of ["Head", "Employee", "Other owner", "Scoped viewer"]) {
        const user = await prisma.user.create({
          data: {
            email: `head-${users.length}-${suffix}@test.invalid`,
            profile: { create: { fullName: name } },
          },
        });
        users.push(user.id);
      }
      for (const name of [
        "Head company",
        "Child company",
        "Unshared child",
        "Other head",
      ]) {
        const org = await prisma.organization.create({
          data: {
            slug: `head-${orgs.length}-${suffix}`,
            name,
            taxId: `head-${orgs.length}-${suffix}`,
            businessTasksEnabled: true,
          },
        });
        orgs.push(org.id);
      }
      const [owner, employee, otherOwner, viewer] = users as [
        string,
        string,
        string,
        string,
      ];
      const [head, child, unshared, otherHead] = orgs as [
        string,
        string,
        string,
        string,
      ];
      await prisma.organizationMember.createMany({
        data: [
          { organizationId: head, userId: owner, role: "OWNER" },
          { organizationId: otherHead, userId: owner, role: "OWNER" },
          { organizationId: head, userId: otherOwner, role: "OWNER" },
          { organizationId: head, userId: viewer, role: "STAFF" },
          { organizationId: child, userId: employee, role: "STAFF" },
        ],
      });
      const group = await prisma.organizationGroup.create({
        data: { name: "Head group", ownerId: owner },
      });
      groupId = group.id;
      await prisma.groupMember.createMany({
        data: [
          { groupId, userId: owner, role: "OWNER", allCompanies: true },
          {
            groupId,
            userId: viewer,
            role: "MANAGER",
            allCompanies: true,
            permissions: ["PLANS_VIEW"],
          },
        ],
      });
      await prisma.groupCompany.createMany({
        data: [
          { groupId, organizationId: head, sharedPermissions: ["PLANS_VIEW"] },
          {
            groupId,
            organizationId: child,
            sharedPermissions: ["PLANS_VIEW", "EMPLOYEES_VIEW"],
          },
          { groupId, organizationId: unshared, sharedPermissions: [] },
        ],
      });
      await prisma.organizationGroup.update({
        where: { id: groupId },
        data: { headCompanyId: head },
      });
      const input = {
        title: "Future self plan",
        description: "Employee wrote it",
        priority: OrganizationTaskPriority.NORMAL,
        dueAt: new Date("2027-01-10T10:00:00Z"),
        assigneeIds: [employee],
        subTasks: [],
      };
      const task = await createTask(prisma, child, employee, input);
      assert.equal(task.sourceGroupId, null);
      const page = await headCompanyPlans(owner, head);
      assert.equal(page.tasks.length, 1);
      assert.equal(page.tasks[0]?.id, task.id);
      assert.equal(page.tasks[0]?.authorName, "Employee");
      assert.equal(
        (await headCompanyPlans(viewer, head)).tasks[0]?.authorName,
        null,
      );
      assert.equal((await headCompanyPlans(otherOwner, head)).tasks.length, 0);
      assert.equal((await headCompanyPlans(owner, otherHead)).tasks.length, 0);
      await assert.rejects(
        () => headCompanyPlans(employee, head),
        (e: unknown) => e instanceof GroupError && e.status === 403,
      );
      await prisma.organizationTask.createMany({
        data: [
          {
            organizationId: child,
            createdById: employee,
            title: "Before consent",
            createdAt: new Date("2020-01-01"),
            dueAt: input.dueAt,
          },
          {
            organizationId: unshared,
            createdById: owner,
            title: "Private child",
            dueAt: input.dueAt,
          },
          ...Array.from({ length: 22 }, (_, i) => ({
            organizationId: child,
            createdById: employee,
            title: `New plan ${i}`,
            dueAt: input.dueAt,
          })),
        ],
      });
      const first = await headCompanyPlans(owner, head);
      assert.equal(first.tasks.length, 20);
      assert.ok(first.nextCursor);
      const next = await headCompanyPlans(owner, head, first.nextCursor);
      assert.equal(next.tasks.length, 3);
      assert.equal(
        new Set([...first.tasks, ...next.tasks].map((t) => t.id)).size,
        23,
      );
      assert.ok(
        [...first.tasks, ...next.tasks].every(
          (t) => t.companyName === "Child company",
        ),
      );
      await prisma.groupCompany.update({
        where: { groupId_organizationId: { groupId, organizationId: child } },
        data: { sharedPermissions: [] },
      });
      assert.equal((await headCompanyPlans(owner, head)).tasks.length, 0);
      await prisma.groupCompany.update({
        where: { groupId_organizationId: { groupId, organizationId: child } },
        data: { sharedPermissions: ["PLANS_VIEW"], disconnectedAt: new Date() },
      });
      assert.equal((await headCompanyPlans(owner, head)).tasks.length, 0);
    } finally {
      if (groupId)
        await prisma.organizationGroup.delete({ where: { id: groupId } });
      await prisma.organization.deleteMany({ where: { id: { in: orgs } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
  },
);
