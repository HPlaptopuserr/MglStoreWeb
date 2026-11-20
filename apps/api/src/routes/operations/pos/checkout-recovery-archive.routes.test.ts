import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import router from "./checkout-recovery-archive.routes";
import { JWT_SECRET } from "./_shared";

let server: Server;
let base: string;
let registerOrg: string;
let existingArchive: { id: string } | null;
let archiveFails: boolean;
let writes: Array<Record<string, unknown>>;
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => { Reflect.set(target, key, previous); });
}
const body = {
  organizationId: "org-a", registerId: "register-a", clientSaleId: "old-credit",
  snapshot: '{"cart":[],"paymentEntries":[{"method":"QR","amount":20000,"status":"confirmed"}]}',
  reason: "EMPTY_CART_PAYMENT",
};
const headers = {
  Authorization: `Bearer ${jwt.sign({ userId: "cashier", organizationId: "org-a" }, JWT_SECRET)}`,
  "Content-Type": "application/json",
};
before(async () => {
  const app = express();
  app.use(express.json({ limit: "256kb" }), router);
  server = await new Promise<Server>(resolve => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/pos/payments/recovery/archive`;
});
after(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
afterEach(() => { while (restores.length) restores.pop()?.(); });
beforeEach(() => {
  registerOrg = "org-a";
  existingArchive = null;
  archiveFails = false;
  writes = [];
  stub(prisma.user, "findUnique", async () => ({ id: "cashier", role: "USER", isActive: true, deletedAt: null }));
  stub(prisma.organizationMember, "findFirst", async () => ({ organizationId: "org-a", role: "STAFF", capabilities: ["POS_CASHIER"] }));
  stub(prisma.posRegister, "findUnique", async () => ({ organizationId: registerOrg, deletedAt: null, isActive: true, activationStatus: "APPROVED" }));
  stub(prisma, "$transaction", async (run: (tx: typeof prisma) => Promise<unknown>) => run(prisma));
  stub(prisma, "$executeRaw", async () => 1);
  stub(prisma, "$queryRaw", async () => []);
  stub(prisma.cardPaymentAttempt, "findFirst", async () => null);
  stub(prisma.qPayInvoice, "findFirst", async () => null);
  stub(prisma.posSaleIdempotency, "findFirst", async () => null);

  stub(prisma.auditLog, "findFirst", async () => existingArchive);
  stub(prisma.auditLog, "create", async ({ data }: { data: Record<string, unknown> }) => {
    if (archiveFails) throw new Error("Database unavailable");
    writes.push(data);
    return { id: "archive-proof" };
  });
});
const post = (input: Record<string, unknown> = body) => fetch(base, {
  method: "POST", headers, body: JSON.stringify(input),
});

test("archives exact financial evidence and acknowledges only after storage", async () => {
  const response = await post();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { archiveId: "archive-proof" });
  assert.equal(writes.length, 1);
  const meta = writes[0].meta as Record<string, unknown>;
  assert.equal(meta.snapshot, body.snapshot);
  assert.equal(meta.organizationId, "org-a");
  assert.equal(meta.registerId, "register-a");
  assert.equal(meta.reviewRequired, true);
  assert.equal(meta.financialStateUnchanged, true);
  assert.match(String(meta.snapshotHash), /^[0-9a-f]{64}$/);
});

test("retries reuse the durable archive acknowledgement", async () => {
  existingArchive = { id: "previous-archive" };
  const response = await post();
  assert.deepEqual(await response.json(), { archiveId: "previous-archive" });
  assert.equal(writes.length, 0);
});

test("malformed JSON can be preserved intact for manual recovery", async () => {
  const response = await post({ ...body, snapshot: '{"paymentEntries": [', reason: "INVALID_SNAPSHOT", clientSaleId: null });
  assert.equal(response.status, 200);
  assert.equal((writes[0].meta as Record<string, unknown>).snapshot, '{"paymentEntries": [');
});

test("unauthenticated and foreign organization or register requests cannot archive", async () => {
  assert.equal((await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).status, 401);
  assert.equal((await post({ ...body, organizationId: "org-b" })).status, 403);
  registerOrg = "org-b";
  assert.equal((await post()).status, 403);
  assert.equal(writes.length, 0);
});

test("invalid or oversized payloads never create an archive", async () => {
  for (const invalid of [
    { ...body, snapshot: "" }, { ...body, snapshot: "x".repeat(120001) },
    { ...body, reason: "CANCEL_PAYMENT" }, { ...body, clientSaleId: {} },
  ]) assert.equal((await post(invalid)).status, 400);
  assert.equal(writes.length, 0);
});

test("storage failure returns no acknowledgement so the browser retains its slot", async () => {
  archiveFails = true;
  const response = await post();
  assert.equal(response.status, 503);
  assert.equal("archiveId" in await response.json(), false);
});

const missingId = "2e23d295-d49d-4ac7-ac9b-91e30dff2b81";
const missingSnapshot = {
  registerId: body.registerId, clientSaleId: "missing-checkout", cart: [{ productId: "preserved" }],
  paymentEntries: [{ method: "CARD", status: "pending", amount: 25100, attemptId: missingId }],
};
const missingBody = { ...body, reason: "MISSING_CARD_ATTEMPT", clientSaleId: "missing-checkout", snapshot: JSON.stringify(missingSnapshot) };

test("missing card attempt archives exact evidence and IDs only after globally checking absence", async () => {
  const queries: unknown[] = [];
  stub(prisma.cardPaymentAttempt, "findFirst", async (query: unknown) => { queries.push(query); return null; });
  const response = await post(missingBody);
  assert.equal(response.status, 200);
  assert.deepEqual(queries[0], { where: { id: { in: [missingId] } }, select: { id: true } });
  const meta = writes[0]?.meta as Record<string, unknown>;
  assert.equal(meta.snapshot, missingBody.snapshot);
  assert.equal(meta.reason, "MISSING_CARD_ATTEMPT");
  assert.deepEqual(meta.missingAttemptIds, [missingId]);
  assert.equal(meta.financialStateUnchanged, true);
  assert.equal(meta.reviewRequired, true);
});

test("an existing card attempt in any scope or any related money evidence prevents detachment", async () => {
  const targets = [prisma.cardPaymentAttempt, prisma.qPayInvoice, prisma.posSaleIdempotency];
  for (const target of targets) {
    const original: unknown = Reflect.get(target, "findFirst");
    Reflect.set(target, "findFirst", async () => ({ id: "existing-real-evidence" }));
    try { assert.equal((await post(missingBody)).status, 409); }
    finally { Reflect.set(target, "findFirst", original); }
  }
  assert.equal(writes.length, 0);
});

test("missing attempt reason rejects confirmed, cash, QR, duplicate and mismatched snapshots", async () => {
  const entry = missingSnapshot.paymentEntries[0];
  for (const snapshot of [
    { ...missingSnapshot, registerId: "other-register" },
    { ...missingSnapshot, clientSaleId: "other-checkout" },
    { ...missingSnapshot, paymentEntries: [] },
    { ...missingSnapshot, paymentEntries: [{ ...entry, status: "confirmed" }] },
    { ...missingSnapshot, paymentEntries: [{ ...entry, method: "CASH" }] },
    { ...missingSnapshot, paymentEntries: [{ ...entry, method: "QR" }] },
    { ...missingSnapshot, paymentEntries: [entry, entry] },
    { ...missingSnapshot, paymentEntries: [{ ...entry, attemptId: "" }] },
    { ...missingSnapshot, paymentEntries: [{ ...entry, amount: 0 }] },
  ]) assert.equal((await post({ ...missingBody, snapshot: JSON.stringify(snapshot) })).status, 400);
  assert.equal((await post({ ...missingBody, snapshot: "malformed" })).status, 400);
  assert.equal(writes.length, 0);
});

test("missing request storage failure retains active slot and replay reuses acknowledgement", async () => {
  archiveFails = true;
  assert.equal((await post(missingBody)).status, 503);
  archiveFails = false;
  existingArchive = { id: "durable-missing-proof" };
  const response = await post(missingBody);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { archiveId: "durable-missing-proof" });
  assert.equal(writes.length, 0);
});

test("a different real card tied through checkout identity also prevents missing-request detachment", async () => {
  stub(prisma.cardPaymentAttempt, "findFirst", async ({ where }: { where: Record<string, unknown> }) =>
    "id" in where ? null : { id: "another-attempt-for-this-checkout" },
  );
  const response = await post(missingBody);
  assert.equal(response.status, 409);
  assert.equal(writes.length, 0);
});
