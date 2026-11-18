import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import router from "./org-join.routes";

test("join approval handles existing memberships without duplicate creation", async (context) => {
  let existing: { isActive: boolean; deletedAt: Date | null } | null = null;
  let existingRole = "STAFF";
  let memberCount = 0;
  let authorized = true;
  let requestStatus = "PENDING";
  let approvalWrites = 0;
  const upserts: Prisma.OrganizationMemberUpsertArgs[] = [];
  const replace = (target: object, key: string, value: unknown) => {
    const original: unknown = Reflect.get(target, key);
    Reflect.set(target, key, value);
    context.after(() => { Reflect.set(target, key, original); });
  };
  replace(prisma.organizationDailyActivity, "upsert", async () => ({}));
  replace(prisma.orgJoinRequest, "findUnique", async () => ({
    id: "request-1", userId: "applicant", organizationId: "org-1", status: requestStatus,
  }));
  replace(prisma.orgJoinRequest, "update", async () => { approvalWrites++; return {}; });
  replace(prisma.organizationMember, "findFirst", async () => authorized ? { id: "owner" } : null);
  replace(prisma.organizationMember, "findUnique", async () => existing);
  replace(prisma.organizationMember, "count", async () => memberCount);
  replace(prisma.organization, "findUnique", async () => ({ maxMembers: 10 }));
  replace(prisma.organizationMember, "upsert", async (args: Prisma.OrganizationMemberUpsertArgs) => {
    upserts.push(args);
    return { role: existing?.isActive && existing.deletedAt === null ? existingRole : args.create.role };
  });
  replace(prisma, "$transaction", async (operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => operation(prisma));

  const app = express();
  app.use(express.json(), router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  context.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const token = jwt.sign({ userId: "owner", email: "owner@example.invalid", role: "USER" }, process.env.JWT_SECRET || "dev-secret-change-me");
  const approve = (action = "approve") => fetch(`http://127.0.0.1:${address.port}/org/join-request/request-1`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ action, role: "STAFF" }),
  });

  await context.test("new member uses the unique user/organization key", async () => {
    const response = await approve();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "APPROVED", role: "STAFF" });
    assert.deepEqual(upserts.at(-1)?.where, { userId_organizationId: { userId: "applicant", organizationId: "org-1" } });
    assert.equal(approvalWrites, 1);
  });

  await context.test("existing active owner preserves role even at member limit", async () => {
    existing = { isActive: true, deletedAt: null };
    existingRole = "OWNER";
    memberCount = 10;
    const response = await approve();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "APPROVED", role: "OWNER" });
    assert.deepEqual(upserts.at(-1)?.update, {});
  });

  await context.test("inactive member is restored in place", async () => {
    existing = { isActive: false, deletedAt: new Date() };
    memberCount = 9;
    const response = await approve();
    assert.equal(response.status, 200);
    assert.deepEqual(upserts.at(-1)?.update, { isActive: true, deletedAt: null, role: "STAFF" });
  });

  await context.test("reactivation at capacity leaves the request untouched", async () => {
    memberCount = 10;
    const writes = approvalWrites;
    assert.equal((await approve()).status, 400);
    assert.equal(approvalWrites, writes);
  });

  await context.test("new membership at capacity also remains pending", async () => {
    existing = null;
    const writes = approvalWrites;
    assert.equal((await approve()).status, 400);
    assert.equal(approvalWrites, writes);
  });

  await context.test("unauthorized callers cannot approve membership", async () => {
    authorized = false;
    const writes = approvalWrites;
    assert.equal((await approve()).status, 403);
    assert.equal(approvalWrites, writes);
    authorized = true;
  });

  await context.test("resolved requests cannot be processed again", async () => {
    requestStatus = "APPROVED";
    const writes = approvalWrites;
    assert.equal((await approve()).status, 400);
    assert.equal(approvalWrites, writes);
  });
});
