import "../../config/env";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { once } from "node:events";
import { unlink } from "node:fs/promises";
import path from "node:path";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { organizationGroupRoutes } from "./index";
import tasksRouter from "../business/org-tasks.routes";
import { taskStatus } from "../../services/tasks/lifecycle";

const safeDb = (() => {
  try {
    const raw = process.env.GROUP_TEST_DATABASE_URL;
    if (!raw || raw !== process.env.DATABASE_URL) return false;
    const url = new URL(raw);
    return (
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.pathname.endsWith("_test")
    );
  } catch {
    return false;
  }
})();
type Json = Record<string, unknown>;
const record = (value: unknown): Json => {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  return value as Json;
};
const rows = (value: unknown): Json[] => {
  assert.ok(Array.isArray(value));
  return value.map(record);
};

test(
  "group planning: consent, company managers, inbox, evidence, review, idempotency and revocation",
  { skip: !safeDb },
  async (t) => {
    const users = Array.from({ length: 5 }, () => randomUUID());
    const [owner, companyOwner, manager, viewer, staff] = users as [
      string,
      string,
      string,
      string,
      string,
    ];
    const organizationId = randomUUID(),
      otherOrg = randomUUID(),
      groupId = randomUUID(),
      companyId = randomUUID();
    const uploads: string[] = [];
    const app = express();
    app.use(express.json());
    app.use("/api", organizationGroupRoutes, tasksRouter);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const root = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
    const headers = (user: string) => ({
      Authorization: `Bearer ${jwt.sign({ userId: user, role: "USER" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
    });
    const call = async (
      url: string,
      user: string,
      method = "GET",
      body?: unknown,
    ) => {
      const response = await fetch(root + url, {
        method,
        headers: { ...headers(user), "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data: unknown = await response.json();
      return { status: response.status, data };
    };
    const base = `/organization-groups/${groupId}/companies/${organizationId}/tasks`;
    const input = {
      clientRequestId: randomUUID(),
      title: "Manager plan",
      description: "Expected result",
      priority: "HIGH",
      dueAt: new Date(Date.now() + 86400_000).toISOString(),
      assigneeIds: [manager],
      subTasks: ["Deliver"],
    };
    const grants = ["PLANS_VIEW", "PLANS_ASSIGN", "PLANS_REVIEW"];
    let taskId = "",
      assignmentId = "",
      submittedAt = "";
    try {
      await prisma.user.createMany({
        data: users.map((id) => ({
          id,
          email: `${id}@group-test.invalid`,
          passwordHash: "unused",
        })),
      });
      for (const id of [organizationId, otherOrg])
        await prisma.organization.create({
          data: {
            id,
            slug: `planning-${id}`,
            name: "Planning test",
            taxId: randomUUID(),
            status: "ACTIVE",
            businessTasksEnabled: true,
          },
        });
      await prisma.organizationMember.createMany({
        data: [
          { organizationId, userId: companyOwner, role: "OWNER" },
          { organizationId, userId: manager, role: "ADMIN" },
          { organizationId, userId: staff, role: "STAFF" },
        ],
      });
      await prisma.organizationGroup.create({
        data: {
          id: groupId,
          name: "Planning group",
          ownerId: owner,
          members: {
            create: [
              {
                userId: owner,
                role: "OWNER",
                allCompanies: true,
                permissions: grants,
              },
              {
                userId: viewer,
                role: "MANAGER",
                allCompanies: true,
                permissions: ["PLANS_VIEW"],
              },
              {
                userId: manager,
                role: "MANAGER",
                allCompanies: true,
                permissions: grants,
              },
            ],
          },
        },
      });
      await prisma.groupCompany.create({
        data: {
          id: companyId,
          groupId,
          organizationId,
          sharedPermissions: ["PLANS_VIEW"],
          joinedAt: new Date(Date.now() - 60_000),
        },
      });
      await t.test(
        "view consent never grants assignment, including to group owner",
        async () => {
          assert.equal((await call(base, owner, "POST", input)).status, 403);
          assert.equal((await call(`${base}/managers`, owner)).status, 403);
          assert.equal(
            (
              await call(
                `/organization-groups/${groupId}/companies/${otherOrg}/tasks`,
                owner,
              )
            ).status,
            403,
          );
          const changed = await call(
            `/organization-groups/${groupId}/companies/${companyId}/sharing`,
            companyOwner,
            "PATCH",
            { permissions: grants },
          );
          assert.equal(changed.status, 200);
          assert.equal((await call(base, viewer, "POST", input)).status, 403);
        },
      );
      await t.test(
        "eligible assignees use real leadership memberships, no self or staff",
        async () => {
          const result = await call(`${base}/managers`, owner);
          assert.deepEqual(
            rows(result.data)
              .map((m) => m.userId)
              .sort(),
            [manager, companyOwner].sort(),
          );
          assert.equal(
            (
              await call(base, owner, "POST", {
                ...input,
                assigneeIds: [staff],
              })
            ).status,
            400,
          );
          assert.equal((await call(base, manager, "POST", input)).status, 400);
        },
      );
      await t.test(
        "concurrent retries create one company task and one audit",
        async () => {
          const results = await Promise.all([
            call(base, owner, "POST", input),
            call(base, owner, "POST", input),
          ]);
          assert.deepEqual(results.map((r) => r.status).sort(), [200, 201]);
          taskId = String(record(results[0].data).id);
          assert.equal(record(results[1].data).id, taskId);
          assert.equal(
            await prisma.organizationTask.count({
              where: { sourceGroupId: groupId },
            }),
            1,
          );
          assert.equal(
            await prisma.groupAuditLog.count({
              where: { groupId, action: "PLAN_ASSIGNED" },
            }),
            1,
          );
          assert.equal(
            (await call(base, owner, "POST", { ...input, title: "Different" }))
              .status,
            409,
          );
          assert.equal(
            await prisma.organizationMember.count({
              where: { userId: owner, organizationId },
            }),
            0,
          );
        },
      );
      await t.test(
        "assigned plan appears in the manager's existing inbox",
        async () => {
          const result = await call(
            `/org/tasks?organizationId=${organizationId}&scope=assigned`,
            manager,
          );
          assert.equal(result.status, 200);
          assert.ok(rows(result.data).some((r) => r.id === taskId));
          const assignee =
            await prisma.organizationTaskAssignee.findFirstOrThrow({
              where: { taskId },
            });
          assignmentId = assignee.id;
        },
      );
      await t.test(
        "completed subtasks do not complete the plan; group read-only detail redacts people",
        async () => {
          await prisma.organizationTaskSubTask.updateMany({
            where: { taskId },
            data: { isCompleted: true },
          });
          const result = await call(`${base}/${taskId}`, viewer);
          assert.equal(result.status, 200);
          assert.equal(record(result.data).status, "PENDING");
          assert.deepEqual(record(result.data).assignees, []);
        },
      );
      await t.test(
        "manager submits evidence, which is protected by current consent",
        async () => {
          const form = new FormData();
          form.append(
            "images",
            new Blob(
              [
                Buffer.from(
                  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/vS0AAAAASUVORK5CYII=",
                  "base64",
                ),
              ],
              { type: "image/png" },
            ),
            "evidence.png",
          );
          const result = await fetch(
            `${root}/org/tasks/${taskId}/submit-completion`,
            { method: "POST", headers: headers(manager), body: form },
          );
          assert.equal(result.status, 200);
          const task = record(await result.json());
          const a = rows(task.assignees)[0];
          submittedAt = String(a.submittedAt);
          const image = rows(a.evidenceImages)[0];
          const imageUrl = String(image.url);
          uploads.push(path.basename(imageUrl));
          assert.equal(
            (await fetch(root.replace(/\/api$/, "") + imageUrl)).status,
            401,
          );
          assert.equal(
            (
              await fetch(root.replace(/\/api$/, "") + imageUrl, {
                headers: headers(viewer),
              })
            ).status,
            403,
          );
          assert.equal(
            (
              await fetch(root.replace(/\/api$/, "") + imageUrl, {
                headers: headers(owner),
              })
            ).status,
            200,
          );
        },
      );
      const review = () => ({
        assigneeId: assignmentId,
        performanceStars: 8,
        productivityPercent: 90,
        note: "Checked",
        submittedAt,
      });
      await t.test(
        "view-only, self-review, stale submission and invalid ratings are rejected",
        async () => {
          assert.equal(
            (await call(`${base}/${taskId}/approve`, viewer, "PATCH", review()))
              .status,
            403,
          );
          assert.equal(
            (
              await call(
                `${base}/${taskId}/approve`,
                manager,
                "PATCH",
                review(),
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await call(`${base}/${taskId}/approve`, owner, "PATCH", {
                ...review(),
                submittedAt: new Date(0).toISOString(),
              })
            ).status,
            409,
          );
          assert.equal(
            (
              await call(`${base}/${taskId}/approve`, owner, "PATCH", {
                ...review(),
                performanceStars: 11,
              })
            ).status,
            400,
          );
        },
      );
      await t.test(
        "concurrent approval commits one review and marks DONE",
        async () => {
          const results = await Promise.all([
            call(`${base}/${taskId}/approve`, owner, "PATCH", review()),
            call(`${base}/${taskId}/approve`, owner, "PATCH", review()),
          ]);
          assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
          const a = await prisma.organizationTaskAssignee.findUniqueOrThrow({
            where: { id: assignmentId },
          });
          assert.equal(a.status, "DONE");
          assert.equal(
            await prisma.organizationTaskApprovalLog.count({
              where: { assigneeId: assignmentId, action: "APPROVED" },
            }),
            1,
          );
          assert.equal(
            await prisma.groupAuditLog.count({
              where: { groupId, action: "PLAN_APPROVED" },
            }),
            1,
          );
        },
      );
      await t.test(
        "status filtering agrees with computed completion, including DONE+CANCELLED",
        async () => {
          await prisma.organizationTaskAssignee.create({
            data: { taskId, userId: staff, status: "CANCELLED" },
          });
          assert.equal(
            taskStatus(
              await prisma.organizationTaskAssignee.findMany({
                where: { taskId },
              }),
            ),
            "DONE",
          );
          const done = await call(`${base}?status=DONE`, owner);
          assert.equal(rows(record(done.data).tasks).length, 1);
          const pending = await call(`${base}?status=PENDING`, owner);
          assert.equal(rows(record(pending.data).tasks).length, 0);
        },
      );
      await t.test(
        "all status filters and cursor pagination agree with persisted assignments",
        async () => {
          const combinations = [
            [],
            ["CANCELLED"],
            ["DONE", "CANCELLED"],
            ["PENDING_REVIEW", "DONE"],
            ["PENDING", "DONE"],
            ["PENDING", "CANCELLED"],
            ["IN_PROGRESS"],
          ] as const;
          const seeded: { id: string; status: string }[] = [];
          for (let i = 0; i < 36; i++) {
            const statuses = combinations[i % combinations.length];
            const task = await prisma.organizationTask.create({
              data: {
                organizationId,
                createdById: owner,
                title: `Filter fixture ${i}`,
                assignees: {
                  create: statuses.map((status, n) => ({
                    userId: n === 0 ? manager : staff,
                    status,
                  })),
                },
              },
            });
            seeded.push({
              id: task.id,
              status: taskStatus(statuses.map((status) => ({ status }))),
            });
          }
          for (const status of [
            "PENDING",
            "IN_PROGRESS",
            "PENDING_REVIEW",
            "DONE",
            "CANCELLED",
          ]) {
            const result = await call(`${base}?status=${status}`, owner);
            const tasks = rows(record(result.data).tasks);
            assert.ok(tasks.every((task) => task.status === status));
            assert.ok(
              seeded
                .filter((task) => task.status === status)
                .every((task) => tasks.some((row) => row.id === task.id)),
            );
          }
          const first = record((await call(base, owner)).data);
          assert.equal(rows(first.tasks).length, 30);
          assert.equal(typeof first.nextCursor, "string");
          const second = record(
            (await call(`${base}?cursor=${String(first.nextCursor)}`, owner))
              .data,
          );
          const ids = [...rows(first.tasks), ...rows(second.tasks)].map(
            (task) => task.id,
          );
          assert.equal(ids.length, 37);
          assert.equal(new Set(ids).size, 37);
          assert.equal(second.nextCursor, null);
          await prisma.organizationTask.deleteMany({
            where: { id: { in: seeded.map((task) => task.id) } },
          });
          await prisma.organization.update({
            where: { id: organizationId },
            data: { businessTasksEnabled: false },
          });
          assert.equal((await call(base, owner)).status, 403);
          await prisma.organization.update({
            where: { id: organizationId },
            data: { businessTasksEnabled: true },
          });
        },
      );
      await t.test(
        "sharing revoke blocks mutations and evidence; reconnect hides previous tasks",
        async () => {
          await call(
            `/organization-groups/${groupId}/companies/${companyId}/sharing`,
            companyOwner,
            "PATCH",
            { permissions: ["PLANS_VIEW"] },
          );
          assert.equal(
            (
              await call(base, owner, "POST", {
                ...input,
                clientRequestId: randomUUID(),
              })
            ).status,
            403,
          );
          const image =
            await prisma.organizationTaskEvidenceImage.findFirstOrThrow({
              where: { assigneeId: assignmentId },
            });
          assert.equal(
            (
              await fetch(root.replace(/\/api$/, "") + image.url, {
                headers: headers(owner),
              })
            ).status,
            403,
          );
          await prisma.groupCompany.update({
            where: { id: companyId },
            data: {
              joinedAt: new Date(Date.now() + 60_000),
              sharedPermissions: grants,
            },
          });
          assert.equal((await call(`${base}/${taskId}`, owner)).status, 404);
          await prisma.groupMember.update({
            where: { groupId_userId: { groupId, userId: viewer } },
            data: { revokedAt: new Date() },
          });
          assert.equal((await call(base, viewer)).status, 403);
        },
      );
    } finally {
      await prisma.organizationTask.deleteMany({
        where: { organizationId: { in: [organizationId, otherOrg] } },
      });
      await prisma.organizationGroup.deleteMany({ where: { id: groupId } });
      await prisma.organization.deleteMany({
        where: { id: { in: [organizationId, otherOrg] } },
      });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      for (const name of uploads)
        await unlink(
          path.resolve(__dirname, "../../../uploads/task-evidence", name),
        ).catch(() => undefined);
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.$disconnect();
    }
  },
);
