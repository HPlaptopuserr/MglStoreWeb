import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import router from "./shifts.routes";
import { JWT_SECRET, SELF_SERVICE_SHIFT_NOTE } from "./_shared";

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
  mode: "RETAIL",
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
  app.use("/api/mobile", router);
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
  stub(prisma.organization, "findUnique", async () => ({ businessPosEnabled: true }));
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
    mode: "RETAIL",
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
      mode: "RETAIL",
      status: "OPEN",
      AND: [
        { OR: [{ cashierId: "owner" }, { registerId: "register" }] },
        {
          OR: [
            { note: null },
            { note: { not: SELF_SERVICE_SHIFT_NOTE } },
          ],
        },
      ],
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
test("self-service opens an internal shift without adopting the occupied register", async () => {
  const find = stub(prisma.posShift, "findFirst", async () => null);
  const create = stub(prisma.posShift, "create", async () => ({
    ...shift,
    id: "self-service-shift",
    cashierId: "owner",
    registerId: null,
    note: SELF_SERVICE_SHIFT_NOTE,
    register: null,
  }));
  const response = await fetch(`${base}/open`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source: "SELF_SERVICE",
      branchId: "branch",
      openingCash: 0,
    }),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(
    (find.mock.calls[0]?.arguments[0] as Prisma.PosShiftFindFirstArgs).where,
    {
      organizationId: "store",
      branchId: "branch",
      registerId: null,
      status: "OPEN",
      mode: "SELF_SERVICE",
      note: SELF_SERVICE_SHIFT_NOTE,
    },
  );
  assert.deepEqual(
    (create.mock.calls[0]?.arguments[0] as Prisma.PosShiftCreateArgs).data,
    {
      organizationId: "store",
      branchId: "branch",
      registerId: null,
      cashierId: "owner",
      openingCash: 0,
      note: SELF_SERVICE_SHIFT_NOTE,
      mode: "SELF_SERVICE",
      status: "OPEN",
    },
  );
});
test("self-service reuses the branch internal shift across kiosk users", async () => {
  stub(prisma.posShift, "findFirst", async () => ({
    ...shift,
    id: "self-service-shift",
    registerId: null,
    note: SELF_SERVICE_SHIFT_NOTE,
    register: null,
  }));
  const create = stub(prisma.posShift, "create", async () => {
    throw new Error("must reuse the existing self-service shift");
  });
  const response = await fetch(`${base}/open`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source: "SELF_SERVICE",
      branchId: "branch",
      openingCash: 0,
    }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).id, "self-service-shift");
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
  stub(prisma.posShift, "findUnique", async () => ({ ...shift, mode: "RESTAURANT" }));
  stub(prisma.restaurantTicket, "updateMany", async () => ({ count: 0 }));
  stub(prisma.restaurantTicket, "findMany", async () => [{ ticketNo: "ticket", status: "OPEN", table: null }]);
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


test("App Control disables mobile POS for an owner with an existing session", async () => {
  stub(prisma.organization, "findUnique", async () => ({ businessPosEnabled: false }));
  const response = await fetch(`${base.replace("/api/pos/", "/api/mobile/pos/")}/register-current?registerId=register`, { headers });
  assert.equal(response.status, 403);
  const payload = await response.json() as { message: string };
  assert.match(payload.message, /App Control/);
});


test("mobile App Control does not disable Vendor POS", async () => {
  stub(prisma.organization, "findUnique", async () => ({ businessPosEnabled: false }));
  stub(prisma.posShift, "findMany", async () => []);
  const response = await fetch(`${base}/register-current?registerId=register`, { headers });
  assert.equal(response.status, 200);
});


test("disabled mobile POS still permits closing an existing own shift", async () => {
  stub(prisma.organization, "findUnique", async () => ({ businessPosEnabled: false }));
  stub(prisma.posShift, "findUnique", async () => ({ ...shift, cashierId: "owner" }));
  stub(prisma.posShift, "update", async () => ({ ...shift, cashierId: "owner", status: "CLOSED", closedAt: new Date() }));
  stub(prisma.auditLog, "create", async () => ({ id: "audit" }));
  const response = await fetch(`${base.replace("/api/pos/", "/api/mobile/pos/")}/close`, {
    method: "POST", headers, body: JSON.stringify({ shiftId: shift.id, closingCash: 1000 }),
  });
  assert.equal(response.status, 200);
});


const drawerRequestId = "718f58d9-f3dd-4dde-883c-fd33f3e819af";
const postMovement = (body: Record<string, unknown>) => fetch(`${base}/drawer-events`, {
  method: "POST", headers, body: JSON.stringify({ shiftId: shift.id, ...body }),
});
const drawerEvent = {
  id: drawerRequestId, organizationId: "store", branchId: "branch", registerId: "register",
  shiftId: shift.id, cashierId: "owner", type: "PAID_OUT", amount: 250,
  note: "Нийлүүлэгч — бараа авсан", createdAt: new Date(),
};
function stubDrawerResponse() {
  stub(prisma.posShift, "findUniqueOrThrow", async () => shift);
  stub(prisma.posCashDrawerEvent, "findUnique", async () => null);
}

test("cash drawer expense records the actor and reduces expected cash without changing sales", async () => {
  stubDrawerResponse();
  let saved = false;
  const calls: string[] = [];
  stub(prisma, "$queryRaw", async () => { calls.push("lock"); return []; });
  stub(prisma.posShift, "findUnique", async () => { calls.push("shift"); return shift; });
  stub(prisma.posSale, "findMany", async () => [{
    shiftId: shift.id, receiptNo: "sale", grandTotal: 500, paymentMethod: "MIXED",
    paymentBreakdown: [{ method: "CASH", amount: 200 }, { method: "CARD", amount: 300 }],
  }]);
  stub(prisma.cardPaymentAttempt, "findMany", async () => []);
  stub(prisma.qPayInvoice, "findMany", async () => []);
  stub(prisma.posCashDrawerEvent, "findMany", async () => saved ? [drawerEvent] : []);
  const create = stub(prisma.posCashDrawerEvent, "create", async () => { saved = true; return drawerEvent; });
  const response = await postMovement({ type: "PAID_OUT", amount: 250, note: drawerEvent.note, requestId: drawerRequestId });
  assert.equal(response.status, 201);
  const data = await response.json();
  assert.equal(data.summary.cashSales, 200);
  assert.equal(data.summary.paidOut, 250);
  assert.equal(data.summary.expectedCash, 950);
  assert.equal(data.event.cashierId, "owner");
  assert.deepEqual(calls.slice(0, 2), ["lock", "shift"]);
  const args = create.mock.calls[0]?.arguments[0] as Prisma.PosCashDrawerEventCreateArgs;
  assert.equal(args.data.id, drawerRequestId);
  assert.equal(args.data.organizationId, "store");
});

test("cash drawer rejects missing expense purposes, invalid precision, and invalid request IDs", async () => {
  const create = stub(prisma.posCashDrawerEvent, "create", async () => drawerEvent);
  for (const body of [
    { type: "PAID_OUT", amount: 100, note: "  " },
    { type: "PAID_OUT", amount: 0, note: "Purchase" },
    { type: "PAID_OUT", amount: -100, note: "Purchase" },
    { type: "PAID_OUT", amount: 0.001, note: "Purchase" },
    { type: "PAID_OUT", amount: 100.001, note: "Purchase" },
    { type: "PAID_OUT", amount: "100", note: "Purchase" },
    { type: "PAID_OUT", amount: 100, note: "x".repeat(501) },
    { type: "PAID_OUT", amount: 100, note: "Purchase", requestId: "invalid" },
    { type: "UNKNOWN", amount: 100 },
  ]) assert.equal((await postMovement(body)).status, 400, JSON.stringify(body));
  assert.equal(create.mock.callCount(), 0);
});

test("cash drawer prevents withdrawals exceeding cash and allows withdrawing the exact balance", async () => {
  stubDrawerResponse();
  const create = stub(prisma.posCashDrawerEvent, "create", async () => ({ ...drawerEvent, amount: 1000 }));
  assert.equal((await postMovement({ type: "PAID_OUT", amount: 1000.01, note: "Purchase" })).status, 409);
  assert.equal(create.mock.callCount(), 0);
  assert.equal((await postMovement({ type: "PAID_OUT", amount: 1000, note: "Purchase" })).status, 201);
});

test("cash drawer rechecks a closed shift under the row lock", async () => {
  let locked = false;
  stub(prisma, "$queryRaw", async () => { locked = true; return []; });
  stub(prisma.posShift, "findUnique", async () => ({ ...shift, status: locked ? "CLOSED" : "OPEN" }));
  const create = stub(prisma.posCashDrawerEvent, "create", async () => drawerEvent);
  assert.equal((await postMovement({ type: "PAID_OUT", amount: 100, note: "Purchase" })).status, 409);
  assert.equal(create.mock.callCount(), 0);
});

test("cash drawer denies other stores and other cashiers while allowing the cashier's own shift", async () => {
  stubDrawerResponse();
  const create = stub(prisma.posCashDrawerEvent, "create", async () => drawerEvent);
  stub(prisma.posShift, "findUnique", async () => ({ ...shift, organizationId: "other-store" }));
  assert.equal((await postMovement({ type: "PAID_OUT", amount: 100, note: "Purchase" })).status, 403);
  stub(prisma.posShift, "findUnique", async () => shift);
  stub(prisma.organizationMember, "findFirst", async () => ({ organizationId: "store", role: "STAFF", capabilities: ["POS_CASHIER"] }));
  assert.equal((await postMovement({ type: "PAID_OUT", amount: 100, note: "Purchase" })).status, 403);
  assert.equal(create.mock.callCount(), 0);
  stub(prisma.posShift, "findUnique", async () => ({ ...shift, cashierId: "owner" }));
  assert.equal((await postMovement({ type: "PAID_OUT", amount: 100, note: "Purchase" })).status, 201);
});

test("cash drawer retries reuse the recorded expense even after closure and reject a changed payload", async () => {
  stubDrawerResponse();
  stub(prisma.posCashDrawerEvent, "findUnique", async () => drawerEvent);
  stub(prisma.posShift, "findUnique", async () => ({ ...shift, status: "CLOSED" }));
  const create = stub(prisma.posCashDrawerEvent, "create", async () => drawerEvent);
  const body = { type: "PAID_OUT", amount: 250, note: drawerEvent.note, requestId: drawerRequestId };
  assert.equal((await postMovement(body)).status, 201);
  assert.equal((await postMovement({ ...body, amount: 300 })).status, 409);
  assert.equal(create.mock.callCount(), 0);
});

test("cash drawer paid-in and opening the drawer retain existing behavior", async () => {
  stubDrawerResponse();
  const create = stub(prisma.posCashDrawerEvent, "create", async () => ({ ...drawerEvent, type: "PAID_IN" }));
  assert.equal((await postMovement({ type: "PAID_IN", amount: 100 })).status, 201);
  assert.equal((await postMovement({ type: "OPEN_DRAWER" })).status, 201);
  assert.equal((create.mock.calls[1]?.arguments[0] as Prisma.PosCashDrawerEventCreateArgs).data.amount, 0);
});

test("cash drawer expenses flow into closing cash and variance", async () => {
  stub(prisma.posCashDrawerEvent, "findMany", async () => [drawerEvent]);
  const update = stub(prisma.posShift, "update", async () => ({ ...shift, status: "CLOSED", closingCash: 750, expectedCash: 750, cashDifference: 0 }));
  stub(prisma.auditLog, "create", async () => ({ id: "audit" }));
  const response = await close({ shiftId: shift.id, closingCash: 750, note: "Тооцоо нийлсэн" });
  assert.equal(response.status, 200);
  const args = update.mock.calls[0]?.arguments[0] as Prisma.PosShiftUpdateArgs;
  assert.equal(args.data.expectedCash, 750);
  assert.equal(args.data.cashDifference, 0);
});

test("cash drawer legacy mixed accounting queries only successful card and QR payments", async () => {
  stub(prisma.posSale, "findMany", async () => [{
    shiftId: shift.id, receiptNo: "legacy-sale", grandTotal: 1000,
    paymentMethod: "MIXED", paymentBreakdown: null,
  }]);
  const card = stub(prisma.cardPaymentAttempt, "findMany", async () => [{ saleReference: "legacy-sale", amount: 300 }]);
  const qr = stub(prisma.qPayInvoice, "findMany", async () => [{ saleReference: "legacy-sale", amount: 200 }]);
  const response = await fetch(`${base}/${shift.id}/drawer`, { headers });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).cashSales, 500);
  assert.equal((card.mock.calls[0]?.arguments[0] as Prisma.CardPaymentAttemptFindManyArgs).where?.status, "APPROVED");
  assert.equal((qr.mock.calls[0]?.arguments[0] as Prisma.QPayInvoiceFindManyArgs).where?.status, "PAID");
});

test("retail shift context rejects a restaurant register before loading shifts", async () => {
  stub(prisma.posRegister, "findUnique", async () => ({ id: "restaurant", organizationId: "store", mode: "RESTAURANT" }));
  const shifts = stub(prisma.posShift, "findMany", async () => []);
  const response = await fetch(`${base}/register-current?registerId=restaurant&mode=RETAIL`, { headers });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "POS_REGISTER_MODE_MISMATCH");
  assert.equal(shifts.mock.callCount(), 0);
});
test("explicit retail shift context keeps the mode filter", async () => {
  const shifts = stub(prisma.posShift, "findMany", async () => []);
  const response = await fetch(`${base}/register-current?registerId=register&mode=RETAIL`, { headers });
  assert.equal(response.status, 200);
  assert.equal((shifts.mock.calls[0]?.arguments[0] as Prisma.PosShiftFindManyArgs).where?.mode, "RETAIL");
});
