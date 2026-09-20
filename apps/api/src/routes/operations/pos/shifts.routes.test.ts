import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import router from "./shifts.routes";
import { JWT_SECRET } from "./_shared";

let server: Server;
let base: string;
const headers = {
  Authorization: `Bearer ${jwt.sign({ userId: "owner", organizationId: "store" }, JWT_SECRET)}`,
  "Content-Type": "application/json",
};
const shift = {
  id: "previous-shift",
  organizationId: "store",
  cashierId: "previous-cashier",
  registerId: "register",
  branchId: "branch",
  status: "OPEN",
  openingCash: 1000,
  closingCash: null,
  expectedCash: null,
  cashDifference: null,
  cashCount: null,
  cashCountedAt: null,
  note: null,
  openedAt: new Date("2026-09-17T00:00:00Z"),
  closedAt: null,
  cashier: {
    id: "previous-cashier",
    profile: { fullName: "Previous cashier" },
    email: "cashier@example.test",
  },
  branch: { id: "branch", name: "Branch" },
  register: { id: "register", name: "Register" },
};
before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/pos/shifts`;
});
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
const restores: (() => void)[] = [];
function stub(
  target: object,
  key: string,
  implementation: (...args: never[]) => unknown,
) {
  const previous: unknown = Reflect.get(target, key);
  const replacement = mock.fn((...args: unknown[]) =>
    Reflect.apply(implementation, target, args),
  );
  Reflect.set(target, key, replacement);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
  return replacement;
}
afterEach(() => {
  while (restores.length) restores.pop()?.();
  mock.restoreAll();
});
beforeEach(() => {
  stub(prisma.user, "findUnique", async () => ({
    id: "owner",
    role: "USER",
    isActive: true,
    deletedAt: null,
  }));
  stub(prisma.organizationMember, "findFirst", async () => ({
    organizationId: "store",
    role: "OWNER",
    capabilities: [],
  }));
  stub(prisma.posRegister, "findUnique", async () => ({
    id: "register",
    organizationId: "store",
    branchId: "branch",
    isActive: true,
    activationStatus: "APPROVED",
  }));
  stub(prisma.branch, "findUnique", async () => ({
    id: "branch",
    organizationId: "store",
    name: "Branch",
  }));
  stub(prisma.posShift, "findUnique", async () => shift);
  stub(
    prisma,
    "$transaction",
    async (run: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      run(prisma),
  );
  stub(prisma, "$queryRaw", async () => []);
  stub(prisma.restaurantTicket, "count", async () => 0);
  stub(prisma.posSale, "findMany", async () => []);
  stub(prisma.posCashDrawerEvent, "findMany", async () => []);
});
const close = (body: Record<string, unknown>) =>
  fetch(`${base}/close`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

test("register context identifies the previous cashier without adopting their shift", async () => {
  const query = stub(prisma.posShift, "findMany", async () => [shift]);
  const response = await fetch(`${base}/register-current?registerId=register`, {
    headers,
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.shift, null);
  assert.equal(data.blockingShift.id, shift.id);
  assert.equal(data.blockingShift.cashierName, "Previous cashier");
  assert.equal(data.blockingShift.canClose, true);
  assert.deepEqual(
    (query.mock.calls[0]?.arguments[0] as Prisma.PosShiftFindManyArgs).where,
    {
      organizationId: "store",
      status: "OPEN",
      OR: [{ cashierId: "owner" }, { registerId: "register" }],
    },
  );
});
test("cashiers see occupancy but cannot close another cashier's shift", async () => {
  stub(prisma.organizationMember, "findFirst", async () => ({
    organizationId: "store",
    role: "STAFF",
    capabilities: ["POS_CASHIER"],
  }));
  stub(prisma.posShift, "findMany", async () => [shift]);
  const context = await fetch(`${base}/register-current?registerId=register`, {
    headers,
  });
  assert.equal((await context.json()).blockingShift.canClose, false);
  assert.equal(
    (await close({ shiftId: shift.id, closingCash: 1000, note: "Override" }))
      .status,
    403,
  );
});
test("register lookup and closure cannot cross the selected organization boundary", async () => {
  stub(prisma.posRegister, "findUnique", async () => ({
    organizationId: "other-store",
  }));
  const query = stub(prisma.posShift, "findMany", async () => []);
  assert.equal(
    (await fetch(`${base}/register-current?registerId=register`, { headers }))
      .status,
    403,
  );
  assert.equal(query.mock.callCount(), 0);
  stub(prisma.posShift, "findUnique", async () => ({
    ...shift,
    organizationId: "other-store",
  }));
  assert.equal(
    (await close({ shiftId: shift.id, closingCash: 0, note: "Reason" })).status,
    403,
  );
});
test("owner closure requires a reconciliation reason and valid counted cash", async () => {
  assert.equal(
    (await close({ shiftId: shift.id, closingCash: 1000 })).status,
    400,
  );
  assert.equal(
    (await close({ shiftId: shift.id, closingCash: -1, note: "Reason" }))
      .status,
    400,
  );
});
test("owner reconciliation preserves the cashier and records the closer and variance", async () => {
  const update = stub(prisma.posShift, "update", async () => ({
    ...shift,
    status: "CLOSED",
    closingCash: 900,
    expectedCash: 1000,
    cashDifference: -100,
    closedAt: new Date(),
  }));
  const audit = stub(prisma.auditLog, "create", async () => ({ id: "audit" }));
  const response = await close({
    shiftId: shift.id,
    closingCash: 900,
    note: "Previous cashier left",
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.cashierId, "previous-cashier");
  assert.equal(data.cashDifference, -100);
  assert.equal(
    (update.mock.calls[0]?.arguments[0] as Prisma.PosShiftUpdateArgs).data
      .cashierId,
    undefined,
  );
  assert.equal(
    (update.mock.calls[0]?.arguments[0] as Prisma.PosShiftUpdateArgs).data
      .status,
    "CLOSED",
  );
  assert.equal(
    (audit.mock.calls[0]?.arguments[0] as Prisma.AuditLogCreateArgs).data
      .userId,
    "owner",
  );
  assert.deepEqual(
    (audit.mock.calls[0]?.arguments[0] as Prisma.AuditLogCreateArgs).data.meta,
    {
      event: "POS_SHIFT_CLOSED",
      shiftId: shift.id,
      registerId: "register",
      organizationId: "store",
      cashierId: "previous-cashier",
      closedById: "owner",
      closedByOtherUser: true,
      closingCash: 900,
      expectedCash: 1000,
      cashDifference: -100,
      note: "Previous cashier left",
    },
  );
});
test("own-shift closure works without an override reason", async () => {
  stub(prisma.posShift, "findUnique", async () => ({
    ...shift,
    cashierId: "owner",
  }));
  stub(prisma.posShift, "update", async () => ({
    ...shift,
    cashierId: "owner",
    status: "CLOSED",
    closedAt: new Date(),
  }));
  stub(prisma.auditLog, "create", async () => ({ id: "audit" }));
  assert.equal(
    (await close({ shiftId: shift.id, closingCash: 1000 })).status,
    200,
  );
});
test("occupied registers continue rejecting duplicate shift opens", async () => {
  stub(prisma.posShift, "findFirst", async () => shift);
  const create = stub(prisma.posShift, "create", async () => {
    throw new Error("Duplicate");
  });
  const response = await fetch(`${base}/open`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      branchId: "branch",
      registerId: "register",
      openingCash: 0,
    }),
  });
  assert.equal(response.status, 409);
  assert.equal(create.mock.callCount(), 0);
});
test("closed shifts and unsettled restaurant tickets remain protected", async () => {
  stub(prisma.posShift, "findUnique", async () => ({
    ...shift,
    status: "CLOSED",
  }));
  assert.equal(
    (await close({ shiftId: shift.id, closingCash: 0, note: "Reason" })).status,
    409,
  );
  stub(prisma.posShift, "findUnique", async () => shift);
  stub(prisma.restaurantTicket, "count", async () => 1);
  assert.equal(
    (await close({ shiftId: shift.id, closingCash: 0, note: "Reason" })).status,
    409,
  );
});

test("once a register is free the next cashier can open a fresh shift", async () => {
  stub(prisma.posShift, "findFirst", async () => null);
  const create = stub(prisma.posShift, "create", async () => ({
    ...shift,
    id: "new-shift",
    cashierId: "owner",
  }));
  const response = await fetch(`${base}/open`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      branchId: "branch",
      registerId: "register",
      openingCash: 1000,
    }),
  });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).cashierId, "owner");
  assert.equal(
    (create.mock.calls[0]?.arguments[0] as Prisma.PosShiftCreateArgs).data
      .cashierId,
    "owner",
  );
});
