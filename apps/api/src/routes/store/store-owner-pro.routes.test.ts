import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import { emptyStoreMiniAppSettings } from "@mgl/types";
import router from "./store-owner-pro.routes";
import { storeOwnerProExpiresAt } from "../../services/store-owner-pro-policy";
import { getStoreOwnerProAccess } from "../../services/store-owner-pro.service";

type Payment = NonNullable<
  Awaited<ReturnType<typeof prisma.storeOwnerProPayment.findFirst>>
>;
type PaymentWhere = {
  id?: string;
  userId?: string;
  status?: string;
  amount?: number;
  providerInvoiceId?: null | { not: null };
  invoiceExpiresAt?: { gt: Date };
  accessExpiresAt?: { gt: Date };
};
let payments: Payment[] = [];
let requests: Array<{ url: string; body: Record<string, unknown> }> = [];
let settled = false;
let inactive = false;
let adminGranted = false;
let server: Server, base: string;
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
function matches(payment: Payment, where: PaymentWhere) {
  return (
    (!where.id || payment.id === where.id) &&
    (!where.userId || payment.userId === where.userId) &&
    (!where.status || payment.status === where.status) &&
    (!where.amount || payment.amount === where.amount) &&
    (where.providerInvoiceId !== null || payment.providerInvoiceId === null) &&
    (typeof where.providerInvoiceId !== "object" ||
      where.providerInvoiceId === null ||
      payment.providerInvoiceId !== null) &&
    (!where.invoiceExpiresAt ||
      payment.invoiceExpiresAt > where.invoiceExpiresAt.gt) &&
    (!where.accessExpiresAt ||
      Boolean(
        payment.accessExpiresAt &&
        payment.accessExpiresAt > where.accessExpiresAt.gt,
      ))
  );
}
function headers(userId = "buyer") {
  return {
    Authorization: `Bearer ${jwt.sign({ userId, role: "USER" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
    "Content-Type": "application/json",
  };
}
async function invoice() {
  const response = await originalFetch(`${base}/invoice`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ amount: 1, durationMonths: 99 }),
  });
  assert.equal(response.status, 200);
  return (await response.json()) as {
    invoiceId: string;
    amount: number;
    qrText: string;
  };
}
before(async () => {
  const app = express();
  app.use(express.json(), router);
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/store/store-owners/pro`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});
beforeEach(() => {
  payments = [];
  requests = [];
  settled = false;
  inactive = false;
  adminGranted = false;
  Object.assign(process.env, {
    STORE_OWNERS_MINU_MERCHANT_CODE: "pro-merchant",
    STORE_OWNERS_MINU_USERNAME: "pro-test-master",
    STORE_OWNERS_MINU_PASSWORD: "pro-test-secret",
    API_PUBLIC_URL: "https://api.example.com",
  });
  const settings = emptyStoreMiniAppSettings();
  settings["store-owners"] = {
    enabled: true,
    sourceIds: ["vendor"],
    allowedPhones: [],
  };
  stub(prisma.siteSetting, "findUnique", async () => ({
    value: JSON.stringify({
      settings: {
        ...settings,
        "store-owners": {
          ...settings["store-owners"],
          allowedPhones: adminGranted ? ["99112233"] : [],
        },
      },
      grants: adminGranted ? [{ phone: "99112233", userId: "buyer" }] : [],
    }),
  }));
  stub(
    prisma.user,
    "findFirst",
    async ({ where }: { where: { id: string } }) =>
      inactive ? null : { id: where.id },
  );
  stub(
    prisma,
    "$transaction",
    async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      callback(prisma),
  );
  stub(prisma, "$queryRaw", async () => [{ id: "buyer" }]);
  stub(
    prisma.storeOwnerProPayment,
    "findFirst",
    async ({ where }: { where: PaymentWhere }) =>
      payments.find((p) => matches(p, where)) ?? null,
  );
  stub(
    prisma.storeOwnerProPayment,
    "findUniqueOrThrow",
    async ({ where }: { where: { id: string } }) => {
      const payment = payments.find((p) => p.id === where.id);
      if (!payment) throw new Error("Not found");
      return payment;
    },
  );
  stub(
    prisma.storeOwnerProPayment,
    "create",
    async ({
      data,
    }: {
      data: Partial<Payment> &
        Pick<
          Payment,
          | "userId"
          | "amount"
          | "merchantCode"
          | "merchantUsername"
          | "invoiceExpiresAt"
        >;
    }) => {
      const payment: Payment = {
        id: `pro-${payments.length + 1}`,
        status: "PENDING",
        providerInvoiceId: null,
        qrText: "",
        deepLinks: [],
        paidAt: null,
        accessExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      payments.push(payment);
      return payment;
    },
  );
  stub(
    prisma.storeOwnerProPayment,
    "update",
    async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<Payment>;
    }) => {
      const payment = payments.find((p) => p.id === where.id);
      assert.ok(payment);
      Object.assign(payment, data);
      return payment;
    },
  );
  stub(
    prisma.storeOwnerProPayment,
    "updateMany",
    async ({
      where,
      data,
    }: {
      where: PaymentWhere;
      data: Partial<Payment>;
    }) => {
      const selected = payments.filter((p) => matches(p, where));
      selected.forEach((p) => Object.assign(p, data));
      return { count: selected.length };
    },
  );
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({
      url,
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return Response.json(
      url.endsWith("/login")
        ? { status: "000", entity: "test-token" }
        : url.endsWith("/createInvoice")
          ? {
              status: "000",
              entity: {
                invoiceNumber: "provider-invoice",
                mainQr: "test-qr",
                deeplinkList: [],
              },
            }
          : { status: "000", entity: { status: settled ? "000" : null } },
    );
  };
});

test("Pro uses a calendar month in Mongolia, including leap years and month-end clamping", () => {
  assert.equal(
    storeOwnerProExpiresAt(new Date("2026-01-31T15:59:00Z")).toISOString(),
    "2026-02-28T15:59:00.000Z",
  );
  assert.equal(
    storeOwnerProExpiresAt(new Date("2028-01-31T02:00:00Z")).toISOString(),
    "2028-02-29T02:00:00.000Z",
  );
  // UTC January 31 is already February 1 in Mongolia.
  assert.equal(
    storeOwnerProExpiresAt(new Date("2026-01-31T17:00:00Z")).toISOString(),
    "2026-02-28T17:00:00.000Z",
  );
  assert.equal(
    storeOwnerProExpiresAt(new Date("2026-12-10T05:00:00Z")).toISOString(),
    "2027-01-10T05:00:00.000Z",
  );
});
test("guest and inactive accounts cannot buy or inspect Pro", async () => {
  assert.equal((await originalFetch(base)).status, 401);
  inactive = true;
  assert.equal(
    (
      await originalFetch(`${base}/invoice`, {
        method: "POST",
        headers: headers(),
      })
    ).status,
    401,
  );
  assert.equal(requests.length, 0);
});
test("server pins the fee, merchant and account and reuses the pending invoice", async () => {
  const first = await invoice();
  const second = await invoice();
  assert.equal(first.amount, 100000);
  assert.equal(first.invoiceId, second.invoiceId);
  assert.equal(payments[0].userId, "buyer");
  assert.equal(
    requests.filter((r) => r.url.endsWith("/createInvoice")).length,
    1,
  );
  assert.deepEqual(
    requests.find((r) => r.url.endsWith("/createInvoice"))?.body,
    {
      merchantCode: "pro-merchant",
      amount: 100000,
      referenceNumber: first.invoiceId,
      webhook: `https://api.example.com/api/store/store-owners/pro/callback?invoiceId=${first.invoiceId}`,
    },
  );
  assert.equal((await getStoreOwnerProAccess("buyer")).active, false);
});
test("forged callback cannot activate Pro and another user cannot check its invoice", async () => {
  const payment = await invoice();
  const count = requests.length;
  assert.equal(
    (
      await originalFetch(`${base}/invoices/${payment.invoiceId}/check`, {
        method: "POST",
        headers: headers("other"),
      })
    ).status,
    404,
  );
  assert.equal(requests.length, count);
  const callback = await originalFetch(
    `${base}/callback?invoiceId=${payment.invoiceId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: true, status: "PAID", amount: 100000 }),
    },
  );
  assert.equal(callback.status, 200);
  assert.equal(payments[0].status, "PENDING");
  assert.equal((await getStoreOwnerProAccess("buyer")).active, false);
});
test("provider-confirmed payment grants exactly one month once across retries and callbacks", async () => {
  const payment = await invoice();
  settled = true;
  const responses = await Promise.all([
    originalFetch(`${base}/invoices/${payment.invoiceId}/check`, {
      method: "POST",
      headers: headers(),
    }),
    originalFetch(`${base}/callback?invoiceId=${payment.invoiceId}`, {
      method: "POST",
    }),
  ]);
  responses.forEach((r) => assert.equal(r.status, 200));
  assert.ok(payments[0].paidAt);
  assert.equal(
    payments[0].accessExpiresAt?.toISOString(),
    storeOwnerProExpiresAt(payments[0].paidAt).toISOString(),
  );
  const expires = payments[0].accessExpiresAt?.toISOString();
  await originalFetch(`${base}/invoices/${payment.invoiceId}/check`, {
    method: "POST",
    headers: headers(),
  });
  assert.equal(payments[0].accessExpiresAt?.toISOString(), expires);
  assert.equal((await getStoreOwnerProAccess("buyer")).active, true);
  assert.equal(
    (
      await originalFetch(`${base}/invoice`, {
        method: "POST",
        headers: headers(),
      })
    ).status,
    409,
  );
  assert.equal(
    (await getStoreOwnerProAccess("buyer", payments[0].accessExpiresAt!))
      .active,
    false,
  );
});
test("late provider confirmation is recoverable after the QR timer expires", async () => {
  const payment = await invoice();
  payments[0].invoiceExpiresAt = new Date(Date.now() - 1000);
  const pending = await originalFetch(
    `${base}/invoices/${payment.invoiceId}/check`,
    { method: "POST", headers: headers() },
  );
  assert.equal(
    ((await pending.json()) as { status: string }).status,
    "EXPIRED",
  );
  settled = true;
  await originalFetch(`${base}/callback?invoiceId=${payment.invoiceId}`, {
    method: "POST",
  });
  assert.equal((await getStoreOwnerProAccess("buyer")).active, true);
});
test("missing Pro merchant fails closed before creating an invoice", async () => {
  delete process.env.STORE_OWNERS_MINU_MERCHANT_CODE;
  assert.equal(
    (
      await originalFetch(`${base}/invoice`, {
        method: "POST",
        headers: headers(),
      })
    ).status,
    503,
  );
  assert.equal(payments.length, 0);
  assert.equal(requests.length, 0);
});

test("reopening Pro recovers an expired paid invoice without buying twice", async () => {
  await invoice();
  payments[0].invoiceExpiresAt = new Date(Date.now() - 1000);
  settled = true;
  const response = await originalFetch(base, { headers: headers() });
  assert.equal(response.status, 200);
  assert.equal(((await response.json()) as { active: boolean }).active, true);
  assert.equal(
    (
      await originalFetch(`${base}/invoice`, {
        method: "POST",
        headers: headers(),
      })
    ).status,
    409,
  );
  assert.equal(
    requests.filter((r) => r.url.endsWith("/createInvoice")).length,
    1,
  );
});

test("admin ordering grant activates Pro immediately and prevents unnecessary payment", async () => {
  adminGranted = true;
  stub(prisma.storeOwnerProPayment, "findFirst", async () => {
    throw new Error("Admin access must not require payment/provider recovery");
  });
  const response = await originalFetch(base, { headers: headers() });
  assert.equal(response.status, 200);
  const access = (await response.json()) as {
    active: boolean;
    source: string;
    expiresAt: string | null;
  };
  assert.equal(access.active, true);
  assert.equal(access.source, "ADMIN");
  assert.equal(access.expiresAt, null);
  assert.equal(
    (
      await originalFetch(`${base}/invoice`, {
        method: "POST",
        headers: headers(),
      })
    ).status,
    409,
  );
  assert.equal(requests.length, 0);
  assert.equal(payments.length, 0);
});
test("removing an admin grant removes Pro unless a paid month remains active", async () => {
  adminGranted = true;
  const granted = await originalFetch(base, { headers: headers() });
  assert.equal(((await granted.json()) as { active: boolean }).active, true);
  adminGranted = false;
  const removed = await originalFetch(base, { headers: headers() });
  const access = (await removed.json()) as { active: boolean; source: string };
  assert.equal(access.active, false);
  assert.equal(access.source, "NONE");
});
