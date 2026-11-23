import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { linkExistingCreditBorrower } from "./credit-borrower-link";
import { JWT_SECRET } from "./_shared";

function loan(id: string) {
  return {
    id,
    organizationId: "org",
    customerId: "legacy-customer",
    targetType: "CUSTOMER",
    borrowerUserId: null as string | null,
    borrowerId: "legacy-borrower",
    borrowerName: "Old typo",
    borrowerPhone: "99000000",
    borrowerEmail: null as string | null,
    borrowerAddress: "Saved address",
    employeeId: null as string | null,
    employeeName: null as string | null,
    principalAmount: 100000,
    totalInterest: 1200,
    totalDue: 101200,
    paidAmount: 20000,
    status: "OPEN",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-02-01"),
    dueDate: new Date("2026-03-01"),
    paidAt: null,
  };
}
type Loan = ReturnType<typeof loan>;
let server: Server;
let base: string;
let loans: Loan[];
let manager: boolean;
let auditFails: boolean;
let audits: Array<Record<string, unknown>>;
let customerWrites: number;
let aliases: Array<Record<string, unknown>>;
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
before(async () => {
  const app = express();
  app.use(express.json());
  app.post("/link", linkExistingCreditBorrower);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/link`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
beforeEach(() => {
  loans = [loan("one"), loan("two")];
  manager = true;
  auditFails = false;
  audits = [];
  customerWrites = 0;
  aliases = [];
  stub(prisma.user, "findUnique", async () => ({
    id: "operator",
    role: "USER",
    isActive: true,
    deletedAt: null,
  }));
  stub(prisma.user, "findFirst", async () => ({
    id: "registered-user",
    email: "borrower@example.com",
    profile: { fullName: "Болд", phoneNumber: "99112233" },
  }));
  stub(
    prisma.organizationMember,
    "findFirst",
    async ({ where }: { where: { role?: unknown } }) =>
      where.role && !manager
        ? null
        : {
            id: "membership",
            organizationId: "org",
            role: manager ? "OWNER" : "STAFF",
            capabilities: ["POS_CASHIER"],
          },
  );
  stub(prisma, "$queryRaw", async (query: unknown) =>
    Array.isArray(query) &&
    query.join("?").includes("canonical_profile_phone_number")
      ? [{ id: "registered-user" }]
      : [],
  );
  stub(prisma.posCreditSale, "count", async () => 0);
  stub(prisma.posCreditCustomer, "findUnique", async () => ({
    id: "legacy-customer",
    organizationId: "org",
    targetType: "CUSTOMER",
    borrowerUserId: null,
    borrowerName: "Old typo",
    mergedIntoId: null,
    updatedAt: new Date("2026-02-01"),
  }));
  stub(
    prisma.posCreditCustomer,
    "update",
    async ({ data }: { data: Record<string, unknown> }) => {
      aliases.push(data);
      return { id: "legacy-customer" };
    },
  );
  stub(prisma.posCreditSale, "findMany", async () => structuredClone(loans));
  stub(
    prisma.posCreditSale,
    "update",
    async ({ where, data }: { where: { id: string }; data: Partial<Loan> }) => {
      const row = loans.find((credit) => credit.id === where.id)!;
      Object.assign(row, data);
      return row;
    },
  );
  stub(prisma.posCreditCustomer, "upsert", async () => {
    customerWrites++;
    return { id: "canonical-customer", mergedIntoId: null };
  });
  stub(
    prisma.auditLog,
    "create",
    async ({ data }: { data: Record<string, unknown> }) => {
      if (auditFails) throw new Error("Audit unavailable");
      audits.push(data);
      return { id: "audit" };
    },
  );
  stub(
    prisma,
    "$transaction",
    async (run: (tx: typeof prisma) => Promise<unknown>) => {
      const backup = structuredClone({
        loans,
        audits,
        customerWrites,
        aliases,
      });
      try {
        return await run(prisma);
      } catch (error: unknown) {
        ({ loans, audits, customerWrites, aliases } = backup);
        throw error;
      }
    },
  );
});
const expected = () =>
  loans.map((row) => ({
    id: row.id,
    customerId: row.customerId,
    borrowerId: row.borrowerId,
    borrowerPhone: row.borrowerPhone,
    borrowerUserId: row.borrowerUserId,
  }));
const body = () => ({
  organizationId: "org",
  creditSaleIds: ["one", "two"],
  borrowerUserId: "registered-user",
  borrowerPhone: "99112233",
  expectedCredits: expected(),
});
const post = (data: unknown = body()) =>
  fetch(base, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt.sign({ userId: "operator", organizationId: "org" }, JWT_SECRET)}`,
    },
    body: JSON.stringify(data),
  });
const financial = (row: Loan) => ({
  principalAmount: row.principalAmount,
  totalInterest: row.totalInterest,
  totalDue: row.totalDue,
  paidAmount: row.paidAmount,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  dueDate: row.dueDate,
  paidAt: row.paidAt,
});

test("explicit linking corrects identity only, preserves all debt amounts/dates and audits before/after", async () => {
  const original = structuredClone(loans);
  const request = body();
  const response = await post(request);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).linkedCount, 2);
  assert.deepEqual(loans.map(financial), original.map(financial));
  assert.ok(
    loans.every(
      (row) =>
        row.borrowerUserId === "registered-user" &&
        row.customerId === "canonical-customer" &&
        row.borrowerName === "Болд" &&
        row.borrowerPhone === "99112233",
    ),
  );
  assert.equal(audits.length, 1);
  assert.equal(aliases.length, 1);
  const metadata = audits[0]?.meta as Record<string, unknown>;
  assert.equal(metadata.event, "CREDIT_BORROWER_LINKED");
  assert.equal(metadata.financialStateUnchanged, true);
  assert.deepEqual(
    (metadata.before as Array<{ borrowerPhone: string }>).map(
      (row) => row.borrowerPhone,
    ),
    ["99000000", "99000000"],
  );
  const repeat = await post(request);
  assert.equal(repeat.status, 200);
  assert.equal((await repeat.json()).unchanged, true);
  assert.equal(audits.length, 1);
});
test("staff role, stale snapshots, mixed borrowers and already linked other users cannot reassign debt", async () => {
  manager = false;
  assert.equal((await post()).status, 403);
  assert.equal(customerWrites, 0);
  manager = true;
  const stale = body();
  loans[0]!.borrowerPhone = "99223344";
  assert.equal((await post(stale)).status, 409);
  assert.equal(customerWrites, 0);
  loans = [loan("one"), loan("two")];
  loans[1]!.borrowerId = "different";
  assert.equal((await post()).status, 409);
  assert.equal(customerWrites, 0);
  loans = [loan("one"), loan("two")];
  loans[0]!.borrowerUserId = "another-user";
  assert.equal((await post()).status, 409);
  assert.equal(customerWrites, 0);
});
test("closed debts and missing reviewed snapshots are rejected", async () => {
  assert.equal(
    (await post({ ...body(), expectedCredits: undefined })).status,
    400,
  );
  loans[0]!.status = "PAID";
  assert.equal((await post()).status, 409);
  assert.equal(customerWrites, 0);
});
test("audit failure rolls back the entire correction and never leaves reassigned debt", async () => {
  const original = structuredClone(loans);
  auditFails = true;
  assert.equal((await post()).status, 503);
  assert.deepEqual(loans, original);
  assert.equal(customerWrites, 0);
});

test("an original borrower with another open loan is retained instead of merged", async () => {
  stub(prisma.posCreditSale, "count", async () => 1);
  assert.equal((await post()).status, 200);
  assert.equal(aliases.length, 0);
});

test("a correction never merges saved borrowers from different companies", async () => {
  loans = [loan("one"), loan("two")];
  for (const row of loans) {
    row.targetType = "COMPANY";
    row.borrowerName = "Company A";
    row.employeeId = "old-contact";
  }
  stub(prisma.posCreditCustomer, "findUnique", async () => ({
    id: "legacy-customer",
    organizationId: "org",
    targetType: "COMPANY",
    borrowerUserId: null,
    borrowerName: "Company A",
    mergedIntoId: null,
    updatedAt: new Date("2026-02-01"),
  }));
  assert.equal(
    (await post({ ...body(), companyName: "Company B" })).status,
    200,
  );
  assert.equal(aliases.length, 0);
});
