import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import router from "./ebarimt-vat-recovery.routes";
import salesRouter from "./sales.routes";
import { JWT_SECRET } from "./_shared";
import {
  VAT_RECOVERY_ORGANIZATION_ID as org,
  VAT_RECOVERY_REGISTER_ID as register,
  VAT_RECOVERY_RECEIPTS as manifest,
} from "./ebarimt-vat-recovery.manifest";

let server: Server;
let base: string;
let actorOrg: string;
let writes: Array<Record<string, unknown>>;
let sale: {
  id: string;
  receiptNo: string;
  organizationId: string;
  registerId: string;
  status: string;
  grandTotal: number;
  ebarimtStatus: string;
  ebarimtError: string | null;
  ebarimtPayload: Record<string, unknown>;
};
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
const headers = {
  Authorization: `Bearer ${jwt.sign({ userId: "cashier", organizationId: org }, JWT_SECRET)}`,
  "Content-Type": "application/json",
};
const receiptNo = Object.keys(manifest)[0];
const source = {
  id: manifest[receiptNo],
  status: "ERROR",
  merchantTin: "75200179693",
  posNo: "10052245",
  type: "B2C_RECEIPT",
  totalAmount: 10865,
  totalCityTax: 0,
  message: "НӨАТ Шалгуур дүн: 987.73",
};
const response = {
  id: "075200179693001098059999910052245",
  status: "SUCCESS",
  merchantTin: "75200179693",
  posNo: "10052245",
  totalAmount: 10865,
  totalVAT: 987.73,
  date: "2026-11-11 19:00:00",
  receipts: [{ id: "sub-id" }],
};
before(async () => {
  const app = express();
  app.use(express.json(), router, salesRouter);
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/pos/ebarimt-vat-recovery`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
beforeEach(() => {
  actorOrg = org;
  writes = [];
  sale = {
    id: "sale",
    receiptNo,
    organizationId: org,
    registerId: register,
    status: "COMPLETED",
    grandTotal: 10865,
    ebarimtStatus: "FAILED",
    ebarimtError: JSON.stringify(source),
    ebarimtPayload: {},
  };
  stub(prisma.user, "findUnique", async () => ({
    id: "cashier",
    role: "USER",
    isActive: true,
    deletedAt: null,
  }));
  stub(prisma.organizationMember, "findFirst", async () => ({
    organizationId: actorOrg,
    role: "STAFF",
    capabilities: ["POS_CASHIER"],
  }));
  stub(
    prisma,
    "$transaction",
    async (run: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      run(prisma),
  );
  stub(prisma, "$queryRaw", async () => []);
  stub(prisma.organizationMember, "count", async () => 1);
  stub(prisma.posSale, "findUnique", async () => ({ ...sale }));
  stub(
    prisma.posSale,
    "findMany",
    async ({
      where,
    }: {
      where: {
        receiptNo: { in: string[] };
        organizationId: string;
        registerId: string;
      };
    }) => {
      assert.equal(where.organizationId, org);
      assert.equal(where.registerId, register);
      assert.equal(where.receiptNo.in.length, 25);
      return [{ ...sale }];
    },
  );
  stub(
    prisma.posSale,
    "update",
    async ({ data }: { data: Record<string, unknown> }) => {
      assert.ok(
        Object.keys(data).every((key) => key.startsWith("ebarimt")),
        "recovery cannot write stock, sale totals, payments or sale status",
      );
      writes.push(data);
      Object.assign(sale, data);
      return { ...sale };
    },
  );
  stub(prisma.posSaleIdempotency, "findUnique", async () => ({
    response: { grandTotal: 10865 },
  }));
  stub(prisma.posSaleIdempotency, "update", async () => ({}));
});
const post = (body: Record<string, unknown>) =>
  fetch(`${base}/sale`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

test("the frozen incident contains exactly 25 unique fiscal receipt IDs", () => {
  assert.equal(Object.keys(manifest).length, 25);
  assert.equal(new Set(Object.values(manifest)).size, 25);
});
test("start reserves once; a lost response or another browser cannot resubmit", async () => {
  const requestId = randomUUID();
  assert.equal((await post({ action: "START", requestId })).status, 200);
  assert.equal((await post({ action: "START", requestId })).status, 409);
  assert.equal(
    (await post({ action: "START", requestId: randomUUID() })).status,
    409,
  );
  assert.equal(writes.length, 1);
  const list = (await (
    await fetch(`${base}?registerId=${register}`, { headers })
  ).json()) as { receipts: Array<{ state: string }> };
  assert.equal(list.receipts[0].state, "SUBMITTED");
});
test("known success attaches once, can be safely replayed, and never reissues a sale", async () => {
  const requestId = randomUUID();
  await post({ action: "START", requestId });
  assert.equal(
    (await post({ action: "COMPLETE", requestId, response })).status,
    200,
  );
  assert.equal(
    (await post({ action: "COMPLETE", requestId, response })).status,
    200,
  );
  assert.equal(sale.ebarimtStatus, "SUCCESS");
  assert.equal(sale.status, "COMPLETED");
  assert.equal(sale.grandTotal, 10865);
  assert.equal(writes.length, 2);
});
test("wrong store, non-manifest sales and already successful receipts cannot start", async () => {
  actorOrg = "other";
  assert.equal(
    (await post({ action: "START", requestId: randomUUID() })).status,
    403,
  );
  actorOrg = org;
  sale.receiptNo = "not-in-manifest";
  assert.equal(
    (await post({ action: "START", requestId: randomUUID() })).status,
    409,
  );
  sale.receiptNo = receiptNo;
  sale.ebarimtStatus = "SUCCESS";
  assert.equal(
    (await post({ action: "START", requestId: randomUUID() })).status,
    409,
  );
  assert.equal(writes.length, 0);
});
test("mismatched response, total, tax and request identity never mark a receipt successful", async () => {
  const requestId = randomUUID();
  await post({ action: "START", requestId });
  for (const change of [
    { status: "ERROR" },
    { totalAmount: 1 },
    { totalVAT: 987.72 },
    { merchantTin: "other" },
    { id: manifest[receiptNo] },
  ])
    assert.equal(
      (
        await post({
          action: "COMPLETE",
          requestId,
          response: { ...response, ...change },
        })
      ).status,
      409,
    );
  assert.equal(
    (await post({ action: "COMPLETE", requestId: randomUUID(), response }))
      .status,
    409,
  );
  assert.equal(sale.ebarimtStatus, "FAILED");
  assert.equal(writes.length, 1);
});


test("a late FAILED attachment never erases a recovered fiscal SUCCESS", async () => {
  const requestId = randomUUID();
  await post({ action: "START", requestId });
  await post({ action: "COMPLETE", requestId, response });
  const before = writes.length;
  const late = await fetch(base.replace("/pos/ebarimt-vat-recovery", "/pos/sales/sale/ebarimt"), {
    method: "POST", headers, body: JSON.stringify({ status: "FAILED", error: "old browser response" }),
  });
  assert.equal(late.status, 200);
  assert.equal(sale.ebarimtStatus, "SUCCESS");
  assert.equal(writes.length, before);
});
