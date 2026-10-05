import assert from "node:assert/strict";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import router from "./org-tasks.routes";

test("staff sees only own tasks, including status filters, and cannot cross organizations", async () => {
  const originalMember = prisma.organizationMember.findFirst;
  const originalTasks = prisma.organizationTask.findMany;
  const queries: unknown[] = [];
  Reflect.set(prisma.organizationMember, "findFirst", async ({ where }: { where: { organizationId: string; isActive: boolean; deletedAt: null } }) => {
    assert.equal(where.isActive, true);
    assert.equal(where.deletedAt, null);
    return where.organizationId === "own" ? { role: "STAFF" } : null;
  });
  Reflect.set(prisma.organizationTask, "findMany", async ({ where }: { where: unknown }) => { queries.push(where); return []; });
  const app = express();
  app.use(router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/org/tasks`;
  const headers = { Authorization: `Bearer ${jwt.sign({ userId: "staff", role: "USER" }, process.env.JWT_SECRET || "dev-secret-change-me")}` };
  try {
    for (const scope of ["assigned", "all", "created"]) {
      const response = await fetch(`${url}?organizationId=own&scope=${scope}&status=PENDING`, { headers });
      assert.equal(response.status, 200);
      assert.deepEqual(queries.at(-1), { organizationId: "own", deletedAt: null, assignees: { some: { userId: "staff", status: "PENDING" } } });
    }
    assert.equal((await fetch(`${url}?organizationId=other`, { headers })).status, 403);
    assert.equal(queries.length, 3);
    assert.equal((await fetch(`${url}?organizationId=own`)).status, 401);
  } finally {
    Reflect.set(prisma.organizationMember, "findFirst", originalMember);
    Reflect.set(prisma.organizationTask, "findMany", originalTasks);
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
