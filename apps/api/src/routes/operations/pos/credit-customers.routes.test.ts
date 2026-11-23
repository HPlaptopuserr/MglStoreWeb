import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import router from "./credit-customers.routes";
import { JWT_SECRET } from "./_shared";

let server: Server;
let base: string;
let ids: Array<{ id: string }>;
let active: boolean;
let searches: number;
let writes: Array<Record<string, unknown>>;
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${jwt.sign({ userId: "cashier", organizationId: "org" }, JWT_SECRET)}`,
};
before(async () => {
  const app = express();
  app.use(express.json(), router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/pos/credit-customers`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
beforeEach(() => {
  ids = [{ id: "borrower" }];
  active = true;
  searches = 0;
  writes = [];
  stub(prisma.user, "findUnique", async () => ({
    id: "cashier",
    role: "USER",
    isActive: true,
    deletedAt: null,
  }));
  stub(prisma.organizationMember, "findFirst", async () => ({
    organizationId: "org",
    role: "STAFF",
    capabilities: ["POS_CASHIER"],
  }));
  stub(prisma.organization, "findFirst", async () => ({ id: "org" }));
  stub(prisma.user, "findFirst", async () =>
    active
      ? {
          id: "borrower",
          email: "borrower@example.com",
          profile: { fullName: "Болд", phoneNumber: "99112233" },
        }
      : null,
  );
  stub(prisma, "$queryRaw", async (query: TemplateStringsArray) => {
    if (query.join("?").includes("FOR SHARE")) return [];
    searches++;
    return ids;
  });
  stub(
    prisma,
    "$transaction",
    async (run: (tx: typeof prisma) => Promise<unknown>) => run(prisma),
  );
  stub(
    prisma.posCreditCustomer,
    "upsert",
    async ({ create }: { create: Record<string, unknown> }) => {
      writes.push(create);
      return create;
    },
  );
});
const lookup = (organizationId = "org", phone = "99112233") =>
  fetch(
    `${base}/registered-user?organizationId=${organizationId}&phone=${encodeURIComponent(phone)}`,
    { headers },
  );
const body = {
  organizationId: "org",
  targetType: "CUSTOMER",
  borrowerUserId: "borrower",
  borrowerName: "Spoofed",
  borrowerPhone: "99112233",
  borrowerEmail: "spoof@example.com",
};
const create = (input: Record<string, unknown> = body) =>
  fetch(base, { method: "POST", headers, body: JSON.stringify(input) });

test("registered lookup is exact, private and scoped to the authorized lending organization", async () => {
  const forbidden = await lookup("foreign");
  assert.equal(forbidden.status, 403);
  assert.equal(searches, 0);
  const response = await lookup("org", "+976 9911-2233");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    user: {
      id: "borrower",
      fullName: "Болд",
      phoneNumber: "99112233",
      email: "borrower@example.com",
    },
  });
  assert.equal((await lookup("org", "9911")).status, 400);
});
test("no match returns null and ambiguous legacy matches return conflict", async () => {
  ids = [];
  assert.deepEqual(await (await lookup()).json(), { user: null });
  ids = [{ id: "one" }, { id: "two" }];
  assert.equal((await lookup()).status, 409);
});
test("customer creation overwrites spoofed identity with authoritative registered user fields", async () => {
  assert.equal((await create()).status, 200);
  assert.equal(writes[0]?.borrowerUserId, "borrower");
  assert.equal(writes[0]?.borrowerName, "Болд");
  assert.equal(writes[0]?.borrowerEmail, "borrower@example.com");
  assert.equal(writes[0]?.borrowerId, "user:borrower");
});
test("missing registration, disabled user and stale phone cannot create a borrower", async () => {
  assert.equal(
    (await create({ ...body, borrowerUserId: undefined })).status,
    400,
  );
  active = false;
  assert.equal((await create()).status, 409);
  active = true;
  assert.equal(
    (await create({ ...body, borrowerPhone: "99223344" })).status,
    409,
  );
  assert.equal(writes.length, 0);
});
test("company contact comes from the registered person and organization label remains editable", async () => {
  assert.equal(
    (
      await create({
        ...body,
        targetType: "COMPANY",
        borrowerName: "Company",
        employeeName: "Spoofed Contact",
        employeeId: "fake",
      })
    ).status,
    200,
  );
  assert.equal(writes[0]?.borrowerName, "Company");
  assert.equal(writes[0]?.employeeName, "Болд");
  assert.equal(writes[0]?.employeeId, "borrower");
});
