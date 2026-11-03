import "../../config/env";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { organizationGroupRoutes } from "./index";
const safe = (() => {
  try {
    const raw = process.env.GROUP_TEST_DATABASE_URL;
    const u = new URL(raw ?? "");
    return (
      raw === process.env.DATABASE_URL &&
      ["localhost", "127.0.0.1"].includes(u.hostname) &&
      u.pathname.endsWith("_test")
    );
  } catch {
    return false;
  }
})();
type Json = Record<string, unknown>;
test(
  "people-first group assignment is authorized, atomic and idempotent across companies",
  { skip: !safe },
  async (t) => {
    const [actor, manager, leader, staff] = Array.from({ length: 4 }, () =>
      randomUUID(),
    ) as [string, string, string, string];
    const companies = Array.from({ length: 3 }, () => randomUUID());
    const groupId = randomUUID();
    const app = express();
    app.use(express.json());
    app.use("/api", organizationGroupRoutes);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/organization-groups/${groupId}`;
    const call = async (
      path: string,
      method = "GET",
      body?: unknown,
      user = actor,
    ) => {
      const r = await fetch(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${jwt.sign({ userId: user, role: "USER" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: r.status, data: (await r.json()) as Json };
    };
    const input = {
      title: "Group leadership plan",
      description: "Result",
      priority: "NORMAL",
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      subTasks: ["Report"],
      clientRequestId: randomUUID(),
      recipients: [
        { organizationId: companies[0], userId: manager },
        { organizationId: companies[1], userId: leader },
      ],
    };
    try {
      await prisma.user.createMany({
        data: [actor, manager, leader, staff].map((id) => ({
          id,
          email: `${id}@assignment-test.invalid`,
        })),
      });
      for (const id of companies)
        await prisma.organization.create({
          data: {
            id,
            slug: id,
            name: id,
            taxId: id,
            businessTasksEnabled: true,
            status: "ACTIVE",
          },
        });
      await prisma.organizationMember.createMany({
        data: [
          { organizationId: companies[0]!, userId: manager, role: "ADMIN" },
          { organizationId: companies[0]!, userId: staff, role: "STAFF" },
          { organizationId: companies[0]!, userId: actor, role: "OWNER" },
          { organizationId: companies[1]!, userId: leader, role: "OWNER" },
          { organizationId: companies[2]!, userId: staff, role: "ADMIN" },
        ],
      });
      await prisma.organizationGroup.create({
        data: {
          id: groupId,
          name: "Group",
          ownerId: actor,
          members: {
            create: {
              userId: actor,
              role: "OWNER",
              allCompanies: true,
              permissions: ["PLANS_VIEW", "PLANS_ASSIGN"],
            },
          },
        },
      });
      for (const [index, organizationId] of companies.entries())
        await prisma.groupCompany.create({
          data: {
            groupId,
            organizationId,
            sharedPermissions:
              index < 2 ? ["PLANS_VIEW", "PLANS_ASSIGN"] : ["PLANS_VIEW"],
          },
        });
      await t.test(
        "roster includes managers and leadership only in assignable companies",
        async () => {
          const result = await call("/task-recipients");
          assert.equal(result.status, 200);
          const roster = result.data as unknown as Json[];
          assert.deepEqual(
            roster.map((p) => p.userId).sort(),
            [manager, leader].sort(),
          );
          assert.ok(
            roster.every((p) => p.companyName && p.organizationId && p.role),
          );
          assert.equal(
            (await call("/task-recipients", "GET", undefined, staff)).status,
            403,
          );
        },
      );
      await t.test(
        "a denied recipient rolls back all company tasks",
        async () => {
          const bad = {
            ...input,
            clientRequestId: randomUUID(),
            recipients: [
              input.recipients[0],
              { organizationId: companies[2], userId: staff },
            ],
          };
          assert.equal((await call("/tasks/assign", "POST", bad)).status, 403);
          assert.equal(
            await prisma.organizationTask.count({
              where: { sourceGroupId: groupId },
            }),
            0,
          );
          assert.equal(
            await prisma.groupAuditLog.count({
              where: { groupId, action: "PLAN_ASSIGNED" },
            }),
            0,
          );
        },
      );
      await t.test(
        "one submission reaches managers in two companies; retries do not duplicate",
        async () => {
          const results = await Promise.all([
            call("/tasks/assign", "POST", input),
            call("/tasks/assign", "POST", input),
          ]);
          assert.deepEqual(results.map((r) => r.status).sort(), [200, 201]);
          assert.equal(
            await prisma.organizationTask.count({
              where: { sourceGroupId: groupId },
            }),
            2,
          );
          assert.equal(
            await prisma.organizationTaskAssignee.count({
              where: {
                task: { sourceGroupId: groupId },
                userId: { in: [manager, leader] },
              },
            }),
            2,
          );
          assert.equal(
            await prisma.groupAuditLog.count({
              where: { groupId, action: "PLAN_BATCH_ASSIGNED" },
            }),
            1,
          );
          assert.equal(
            (
              await call("/tasks/assign", "POST", {
                ...input,
                recipients: [input.recipients[0]],
              })
            ).status,
            409,
          );
        },
      );
      await t.test(
        "staff, self assignment and duplicate recipients are rejected",
        async () => {
          for (const recipients of [
            [{ organizationId: companies[0], userId: staff }],
            [{ organizationId: companies[0], userId: actor }],
            [input.recipients[0], input.recipients[0]],
          ])
            assert.equal(
              (
                await call("/tasks/assign", "POST", {
                  ...input,
                  clientRequestId: randomUUID(),
                  recipients,
                })
              ).status,
              400,
            );
          assert.equal(
            await prisma.organizationTask.count({
              where: { sourceGroupId: groupId },
            }),
            2,
          );
        },
      );
      await t.test(
        "revoked consent also blocks an idempotent retry",
        async () => {
          await prisma.groupCompany.updateMany({
            where: { groupId, organizationId: companies[1] },
            data: { sharedPermissions: ["PLANS_VIEW"] },
          });
          assert.equal(
            (await call("/tasks/assign", "POST", input)).status,
            403,
          );
        },
      );
    } finally {
      await prisma.organizationTask.deleteMany({
        where: { sourceGroupId: groupId },
      });
      await prisma.organizationGroup.deleteMany({ where: { id: groupId } });
      await prisma.organization.deleteMany({
        where: { id: { in: companies } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [actor, manager, leader, staff] } },
      });
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      await prisma.$disconnect();
    }
  },
);
