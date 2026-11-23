import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import {
  creditRepaymentHandler,
  attachCreditPaymentEbarimt,
  listCreditRepayments,
  getCreditRepayment,
} from "./credit-repayments";
import { JWT_SECRET } from "./_shared";
import {
  allocateCreditRepayment,
  creditRepaymentCents,
  sameCreditRepaymentAmount,
} from "./credit-repayment-amount";

type Credit = ReturnType<typeof fixture>;
function fixture(
  id: string,
  principalAmount = 100000,
  createdAt = new Date("2026-01-01"),
) {
  return {
    id,
    organizationId: "org",
    customerId: null,
    saleId: `sale-${id}`,
    branchId: "branch",
    registerId: "register",
    shiftId: "shift",
    cashierId: "cashier",
    targetType: "CUSTOMER",
    borrowerId: "borrower",
    borrowerName: "Test",
    borrowerPhone: null,
    employeeId: null,
    employeeName: null,
    principalAmount,
    monthlyInterestRate: 0.012,
    totalInterest: 0,
    totalDue: principalAmount,
    termMonths: 12,
    status: "OPEN",
    paidAt: null as Date | null,
    paidAmount: null as number | null,
    paymentMethod: null as string | null,
    paymentNote: null as string | null,
    dueDate: new Date("2030-01-01"),
    createdAt,
    sale: { createdAt },
  };
}
let server: Server;
let base: string;
let credits: Credit[];
let cash: number[];
let audits: Array<{
  id: string;
  createdAt: Date;
  meta: Record<string, unknown>;
}>;
let membership = true;
let bank: {
  organizationId: string;
  amount: number;
  status: string;
  consumedAt: Date | null;
  saleReference: string | null;
  webhookPayload?: Record<string, unknown>;
  providerPayload?: Record<string, unknown>;
};
let auditFails = false;
let transactions = Promise.resolve();
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
  app.post("/bulk", creditRepaymentHandler(true));
  app.post("/credit/:id", creditRepaymentHandler(false));
  app.post("/receipt/:id", attachCreditPaymentEbarimt);
  app.get("/history", listCreditRepayments);
  app.get("/history/:id", getCreditRepayment);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
beforeEach(() => {
  credits = [fixture("a")];
  audits = [];
  cash = [];
  transactions = Promise.resolve();
  auditFails = false;
  membership = true;
  bank = {
    organizationId: "org",
    amount: 30000,
    status: "PAID",
    consumedAt: null,
    saleReference: null,
  };
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
  stub(prisma.organizationMember, "count", async () => (membership ? 1 : 0));
  stub(
    prisma.posCreditSale,
    "findMany",
    async ({ where }: { where: { id: { in: string[] } } }) =>
      credits
        .filter((row) => where.id.in.includes(row.id))
        .map((row) => ({ ...row })),
  );
  stub(
    prisma.posCreditSale,
    "update",
    async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<Credit>;
    }) => {
      const row = credits.find((credit) => credit.id === where.id)!;
      Object.assign(row, data);
      return { ...row };
    },
  );
  const matches = (
    row: { id: string; meta: Record<string, unknown> },
    where: {
      id?: string;
      AND: Array<{ meta: { path: string[]; equals: unknown } }>;
    },
  ) =>
    (!where.id || row.id === where.id) &&
    where.AND.every(
      (filter) => row.meta[filter.meta.path[0]!] === filter.meta.equals,
    );
  stub(
    prisma.auditLog,
    "findFirst",
    async ({
      where,
    }: {
      where: {
        id?: string;
        AND: Array<{ meta: { path: string[]; equals: unknown } }>;
      };
    }) => audits.find((row) => matches(row, where)) ?? null,
  );
  stub(
    prisma.auditLog,
    "findMany",
    async ({
      where,
      take,
      cursor,
    }: {
      where: { AND: Array<{ meta: { path: string[]; equals: unknown } }> };
      take: number;
      cursor?: { id: string };
    }) => {
      const matching = audits
        .filter((row) => matches(row, where))
        .sort(
          (a, b) =>
            b.createdAt.getTime() - a.createdAt.getTime() ||
            b.id.localeCompare(a.id),
        );
      const start = cursor
        ? matching.findIndex((row) => row.id === cursor.id) + 1
        : 0;
      return matching.slice(start, start + take);
    },
  );
  stub(
    prisma.auditLog,
    "findUnique",
    async ({ where }: { where: { id: string } }) =>
      audits.find((row) => row.id === where.id) ?? null,
  );
  stub(
    prisma.auditLog,
    "findUniqueOrThrow",
    async ({ where }: { where: { id: string } }) =>
      audits.find((row) => row.id === where.id)!,
  );
  stub(
    prisma.auditLog,
    "create",
    async ({
      data,
    }: {
      data: { id: string; meta: Record<string, unknown> };
    }) => {
      if (auditFails) throw new Error("audit offline");
      const entry = { ...data, createdAt: new Date() };
      audits.push(entry);
      return entry;
    },
  );
  stub(
    prisma.auditLog,
    "update",
    async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { meta: Record<string, unknown> };
    }) => {
      Object.assign(audits.find((row) => row.id === where.id)!, data);
    },
  );
  stub(prisma.posShift, "findUnique", async () => ({
    id: "shift",
    organizationId: "org",
    branchId: "branch",
    registerId: "register",
    cashierId: "cashier",
    status: "OPEN",
  }));
  stub(
    prisma.posCashDrawerEvent,
    "create",
    async ({ data }: { data: { amount: number } }) => {
      cash.push(data.amount);
      return data;
    },
  );
  for (const delegate of [prisma.qPayInvoice, prisma.cardPaymentAttempt]) {
    stub(delegate, "findUnique", async () => ({ ...bank }));
    stub(
      delegate,
      "updateMany",
      async ({
        data,
      }: {
        data: { consumedAt: Date; saleReference: string };
      }) => {
        if (bank.consumedAt || bank.saleReference) return { count: 0 };
        Object.assign(bank, data);
        return { count: 1 };
      },
    );
  }
  stub(prisma, "$queryRaw", async () => []);
  stub(
    prisma,
    "$transaction",
    async (run: (tx: typeof prisma) => Promise<unknown>) => {
      const previous = transactions;
      let release: () => void = () => {};
      transactions = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      const backup = structuredClone({ credits, audits, cash, bank });
      try {
        return await run(prisma);
      } catch (error: unknown) {
        ({ credits, audits, cash, bank } = backup);
        throw error;
      } finally {
        release();
      }
    },
  );
});
const post = (
  amount: number,
  requestId = "request",
  extra: Record<string, unknown> = {},
  path = "/credit/a",
) =>
  fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt.sign({ userId: "cashier", organizationId: "org" }, JWT_SECRET)}`,
    },
    body: JSON.stringify({
      amount,
      requestId,
      paymentMethod: "CASH",
      shiftId: "shift",
      ...extra,
    }),
  });

test("partial cash payment, retry and final settlement preserve balance and exact drawer totals", async () => {
  const response = await post(30000);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.remainingDue, 70000);
  assert.equal(result.credit.status, "OPEN");
  assert.equal(credits[0]?.paidAmount, 30000);
  assert.equal(credits[0]?.paidAt, null);
  const retry = await post(30000);
  assert.equal(retry.status, 200);
  assert.deepEqual(await retry.json(), result);
  assert.deepEqual(cash, [30000]);
  assert.equal(audits.length, 1);
  assert.equal((await post(20000)).status, 409);
  const final = await post(70000, "final");
  assert.equal(final.status, 200);
  assert.equal((await final.json()).remainingDue, 0);
  assert.equal(credits[0]?.status, "PAID");
  assert.equal(credits[0]?.paidAmount, 100000);
  assert.ok(credits[0]?.paidAt);
  assert.deepEqual(cash, [30000, 70000]);
  assert.equal((await post(70000, "final")).status, 200);
});
test("bulk repayment allocates oldest credits first and leaves the unpaid remainder open", async () => {
  credits = [fixture("a", 10000), fixture("b", 80000, new Date("2026-02-01"))];
  const response = await post(
    50000,
    "bulk",
    { creditSaleIds: ["a", "b"] },
    "/bulk",
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).remainingDue, 40000);
  assert.equal(credits[0]?.status, "PAID");
  assert.equal(credits[1]?.status, "OPEN");
  assert.equal(credits[1]?.paidAmount, 40000);
  assert.deepEqual(cash, [50000]);
});
test("invalid and excessive amounts cannot consume a payment or change debt", async () => {
  for (const amount of [0, -1, 100000.01, 1.001])
    assert.equal((await post(amount, String(amount))).status, 400);
  assert.equal(credits[0]?.paidAmount, null);
  assert.equal(audits.length, 0);
  assert.deepEqual(cash, []);
});
test("QR and card repayments require an exact approved unconsumed bank payment", async () => {
  const response = await post(30000, "qr", {
    paymentMethod: "QR",
    qpayInvoiceId: "qr",
  });
  assert.equal(response.status, 200);
  assert.equal(credits[0]?.paidAmount, 30000);
  assert.ok(bank.consumedAt);
  assert.deepEqual(cash, []);
  assert.equal(
    (await post(30000, "reuse", { paymentMethod: "QR", qpayInvoiceId: "qr" }))
      .status,
    409,
  );
  bank = {
    ...bank,
    consumedAt: null,
    saleReference: null,
    status: "APPROVED",
    amount: 20000,
  };
  assert.equal(
    (
      await post(10000, "wrong", {
        paymentMethod: "CARD",
        cardAttemptId: "card",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await post(20000, "card", {
        paymentMethod: "CARD",
        cardAttemptId: "card",
      })
    ).status,
    200,
  );
  assert.equal(credits[0]?.paidAmount, 50000);
});
test("concurrent repayments cannot both spend the same outstanding balance", async () => {
  const responses = await Promise.all([post(60000, "one"), post(60000, "two")]);
  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [200, 400],
  );
  assert.equal(credits[0]?.paidAmount, 60000);
  assert.deepEqual(cash, [60000]);
});
test("allocation conserves cents and rejects an overpayment", () => {
  assert.deepEqual(allocateCreditRepayment([0.01, 0.02], 0.02), [0.01, 0.01]);
  assert.throws(() => allocateCreditRepayment([0.01], 0.02));
});

test("a ledger failure rolls back both cash and the credit balance", async () => {
  auditFails = true;
  assert.equal((await post(30000)).status, 503);
  assert.equal(credits[0]?.paidAmount, null);
  assert.deepEqual(cash, []);
  assert.equal(audits.length, 0);
});
test("simultaneous retries create one payment and return the same receipt identity", async () => {
  const responses = await Promise.all([post(30000), post(30000)]);
  assert.deepEqual(
    responses.map((response) => response.status),
    [200, 200],
  );
  assert.deepEqual(await responses[0]!.json(), await responses[1]!.json());
  assert.deepEqual(cash, [30000]);
  assert.equal(audits.length, 1);
});
test("installment fiscal receipts match the paid amount and replay without creating another bill", async () => {
  const payment = await post(30000);
  const result = await payment.json();
  assert.equal(
    (
      await post(
        30000,
        "receipt",
        { status: "SUCCESS", billId: "bill", payload: { totalAmount: 40000 } },
        `/receipt/${result.repaymentId}`,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await post(
        30000,
        "receipt",
        { status: "SUCCESS", billId: "bill", payload: { totalAmount: 30000 } },
        `/receipt/${result.repaymentId}`,
      )
    ).status,
    200,
  );
  const replay = await post(30000);
  assert.equal((await replay.json()).ebarimt.billId, "bill");
  assert.equal(
    (
      await post(
        30000,
        "receipt",
        {
          status: "SUCCESS",
          billId: "other-bill",
          payload: { totalAmount: 30000 },
        },
        `/receipt/${result.repaymentId}`,
      )
    ).status,
    409,
  );
});

test("a one-cent remainder never closes the loan", async () => {
  credits = [fixture("a", 0.03)];
  const response = await post(0.02);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.remainingDue, 0.01);
  assert.equal(result.credit.remainingDue, 0.01);
  assert.equal(credits[0]?.status, "OPEN");
  assert.equal(credits[0]?.paidAmount, 0.02);
  assert.equal(credits[0]?.paidAt, null);
  assert.equal((await post(0.01, "last-cent")).status, 200);
  assert.equal(credits[0]?.status, "PAID");
  assert.equal(credits[0]?.paidAmount, 0.03);
});

test("QR and card proof amounts reject a one-cent mismatch", async () => {
  for (const method of ["QR", "CARD"]) {
    bank = {
      organizationId: "org",
      amount: 0.02,
      status: method === "QR" ? "PAID" : "APPROVED",
      consumedAt: null,
      saleReference: null,
    };
    const response = await post(0.03, `mismatch-${method}`, {
      paymentMethod: method,
      qpayInvoiceId: "qr",
      cardAttemptId: "card",
    });
    assert.equal(response.status, 409);
    assert.equal(bank.consumedAt, null);
    assert.equal(credits[0]?.paidAmount, null);
  }
});

test("frozen or deferred retail payment proofs cannot be reassigned to a loan", async () => {
  for (const method of ["QR", "CARD"]) {
    for (const key of ["checkout", "saleIdentity", "deferredCheckout"]) {
      const evidence = { [key]: { clientSaleId: "retail-sale" } };
      bank = {
        organizationId: "org",
        amount: 30000,
        status: method === "QR" ? "PAID" : "APPROVED",
        consumedAt: null,
        saleReference: null,
        ...(method === "QR"
          ? { webhookPayload: evidence }
          : { providerPayload: evidence }),
      };
      assert.equal(
        (
          await post(30000, `${method}-${key}`, {
            paymentMethod: method,
            qpayInvoiceId: "qr",
            cardAttemptId: "card",
          })
        ).status,
        409,
      );
      assert.equal(bank.consumedAt, null);
      assert.equal(credits[0]?.paidAmount, null);
      assert.equal(audits.length, 0);
    }
  }
});

test("currency parsing rejects coercions, precision loss and unsafe amounts", () => {
  assert.equal(sameCreditRepaymentAmount(0.03, 0.02), false);
  assert.equal(sameCreditRepaymentAmount("30000.00", 30000), true);
  for (const amount of [
    true,
    false,
    [],
    {},
    "",
    " ",
    "1.001",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER,
  ]) {
    assert.equal(creditRepaymentCents(amount), null);
  }
  assert.throws(() => allocateCreditRepayment([0.001], 0.01));
  assert.throws(() => allocateCreditRepayment([Number.MAX_SAFE_INTEGER], 0.01));
});

test("invalid amount coercions do not post cash or credit entries", async () => {
  for (const amount of [true, false, [], {}, "", " "]) {
    const response = await post(30000, "coercion", { amount });
    assert.equal(response.status, 400);
  }
  assert.deepEqual(cash, []);
  assert.equal(credits[0]?.paidAmount, null);
  assert.equal(audits.length, 0);
});

const history = (path: string) =>
  fetch(base + path, {
    headers: {
      Authorization: `Bearer ${jwt.sign({ userId: "cashier", organizationId: "org" }, JWT_SECRET)}`,
    },
  });

test("repayment history paginates durable ledger records and reads a saved installment receipt", async () => {
  const firstResponse = await post(20000, "first");
  const first = await firstResponse.json();
  const secondResponse = await post(10000, "second");
  const second = await secondResponse.json();
  const page = await history("/history?organizationId=org&limit=1");
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("cache-control"), "no-store");
  const data = await page.json();
  assert.equal(data.payments.length, 1);
  assert.ok(data.nextCursor);
  const next = await history(
    `/history?organizationId=org&limit=1&cursor=${data.nextCursor}`,
  );
  const nextData = await next.json();
  assert.equal(nextData.payments.length, 1);
  assert.equal(nextData.nextCursor, null);
  assert.notEqual(nextData.payments[0].id, data.payments[0].id);
  assert.deepEqual(
    new Set([data.payments[0].id, nextData.payments[0].id]),
    new Set([first.repaymentId, second.repaymentId]),
  );
  const detail = await history(
    `/history/${first.repaymentId}?organizationId=org`,
  );
  assert.equal(detail.status, 200);
  const payment = (await detail.json()).payment;
  assert.equal(payment.paidAmount, 20000);
  assert.equal(payment.paymentMethod, "CASH");
  assert.deepEqual(payment.allocations, [{ creditSaleId: "a", amount: 20000 }]);
  assert.deepEqual(payment.borrowerNames, ["Test"]);
  assert.equal(payment.remainingDue, 80000);
  assert.equal(payment.response.repaymentId, first.repaymentId);
  assert.equal(audits.length, 2, "history must not write or reissue anything");
  assert.deepEqual(cash, [20000, 10000]);
});

test("history cannot disclose another organization's payments or use its cursor", async () => {
  const response = await post(30000);
  const payment = await response.json();
  const own = audits[0]!;
  audits.push({
    id: "foreign",
    createdAt: new Date(),
    meta: { ...own.meta, organizationId: "other-org" },
  });
  const page = await history("/history?organizationId=org");
  assert.deepEqual(
    (await page.json()).payments.map((item: { id: string }) => item.id),
    [payment.repaymentId],
  );
  assert.equal(
    (await history("/history/foreign?organizationId=org")).status,
    404,
  );
  assert.equal(
    (await history("/history?organizationId=org&cursor=foreign")).status,
    400,
  );
  membership = false;
  assert.equal(
    (await history("/history?organizationId=other-org")).status,
    403,
  );
  assert.equal(
    (await history(`/history/${payment.repaymentId}?organizationId=other-org`))
      .status,
    403,
  );
});
