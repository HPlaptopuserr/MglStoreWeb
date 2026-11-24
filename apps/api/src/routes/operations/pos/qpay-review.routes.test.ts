import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import router from "./qpay.routes";
import { JWT_SECRET } from "./_shared";

let server: Server;
let base: string;
let paid = false;
let providerFails = false;
let archiveFails = false;
let foreign = false;
let otherPayment = false;
let missingQr = false;
let qrArrived = false;
let writes: Array<Record<string, unknown>>;
let status: "EXPIRED" | "PAID" | "PENDING" = "EXPIRED";
let currentStatus: "EXPIRED" | "PAID" | "PENDING" = "EXPIRED";
const originalFetch = globalThis.fetch;
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => { Reflect.set(target, key, previous); });
}
const checkout = { clientSaleId: "sale", branchId: "branch", shiftId: "shift", lines: [{ productId: "product", qty: 1, unitPrice: 21600 }] };
const snapshot = JSON.stringify({ clientSaleId: "sale", registerId: "register", cart: checkout.lines,
  paymentEntries: [{ method: "QR", status: "pending", invoiceId: "invoice", amount: 21600 }] });
const invoice = () => ({ id: "invoice", organizationId: "org", registerId: "register", amount: 21600,
  status, paidAt: null, consumedAt: null, expiresAt: new Date(0), qrText: "",
  register: { qpayEnabled: true, qpayMerchantId: "merchant", qpayTerminalId: "SYSTEMQR" },
  webhookPayload: { provider: "SYSTEMQR", providerInvoiceId: missingQr ? undefined : "bank-invoice", merchantCode: "merchant", checkout } });
before(async () => {
  process.env.SYSTEMQR_BASE_URL = "https://review-provider.invalid";
  process.env.SYSTEMQR_DEEPLINK_URL = "https://review-provider.invalid";
  process.env.SYSTEMQR_USERNAME = "test";
  process.env.SYSTEMQR_PASSWORD = "test";
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (!url.startsWith("https://review-provider.invalid")) return originalFetch(input, init);
    if (providerFails) throw new Error("provider offline");
    return Response.json(url.endsWith("/login") ? { status: "000", entity: "test-token" } : {
      status: "000", entity: { status: paid ? "000" : null, invoiceNumber: "bank-invoice" },
    });
  };
  const app = express(); app.use(express.json(), router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.on("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/pos/payments/qpay/review`;
});
after(async () => { globalThis.fetch = originalFetch; await new Promise<void>(resolve => server.close(() => resolve())); });
afterEach(() => { while (restores.length) restores.pop()?.(); });
beforeEach(() => {
  paid = providerFails = archiveFails = foreign = otherPayment = missingQr = qrArrived = false;
  status = currentStatus = "EXPIRED"; writes = [];
  stub(prisma.organization, "findUnique", async () => null);
  stub(prisma.user, "findUnique", async () => ({ id: "cashier", role: "USER", isActive: true, deletedAt: null }));
  stub(prisma.organizationMember, "findFirst", async () => foreign ? null : ({ organizationId: "org", role: "STAFF", capabilities: ["POS_CASHIER"] }));
  stub(prisma.organizationMember, "count", async () => foreign ? 0 : 1);
  stub(prisma.qPayInvoice, "findUnique", async () => invoice());
  stub(prisma.qPayInvoice, "findUniqueOrThrow", async () => ({ ...invoice(), status: currentStatus, qrText: qrArrived ? "newly-created-qr" : "" }));
  stub(prisma.qPayInvoice, "count", async () => 0);
  stub(prisma.cardPaymentAttempt, "count", async () => otherPayment ? 1 : 0);
  stub(prisma.posSaleIdempotency, "count", async () => 0);
  stub(prisma, "$transaction", async (run: (tx: typeof prisma) => Promise<unknown>) => run(prisma));
  stub(prisma, "$queryRaw", async () => []);
  stub(prisma, "$executeRaw", async () => 1);
  stub(prisma.auditLog, "create", async ({ data }: { data: Record<string, unknown> }) => {
    if (archiveFails) throw new Error("storage offline");
    writes.push(data); return { id: "audit" };
  });
  stub(prisma.qPayInvoice, "update", async ({ data }: { data: Record<string, unknown> }) => { writes.push(data); return invoice(); });
});
const post = (cancelMissingQr = false) => fetch(base, { method: "POST", headers: { "Content-Type": "application/json",
  Authorization: `Bearer ${jwt.sign({ userId: "cashier", organizationId: "org" }, JWT_SECRET)}` },
  body: JSON.stringify({ invoiceId: "invoice", snapshot, cancelMissingQr }) });
test("archives unpaid expired checkout without claiming cancellation, releasing stock, or consuming payment", async () => {
  const response = await post(); assert.equal(response.status, 200); assert.deepEqual(await response.json(), { archiveId: "audit" });
  assert.equal(writes.length, 2);
  assert.equal((writes[0]?.meta as Record<string, unknown>).snapshot, snapshot);
  assert.deepEqual(Object.keys(writes[1]!), ["webhookPayload"]);
  const payload = writes[1]?.webhookPayload as Record<string, unknown>;
  assert.equal(payload.reviewArchiveId, "audit"); assert.equal(payload.providerCancellationConfirmed, undefined);
  assert.deepEqual(payload.checkout, checkout);
});
test("provider outage, concurrent payment, other payment evidence and archive failure retain checkout", async () => {
  for (const fail of [() => { providerFails = true; }, () => { currentStatus = "PAID"; }, () => { otherPayment = true; }, () => { archiveFails = true; }]) {
    providerFails = archiveFails = otherPayment = false; currentStatus = "EXPIRED"; writes = []; fail();
    assert.equal((await post()).status, 503); assert.equal(writes.length, 0);
  }
});
test("a pending invoice cannot be detached just because the browser asks", async () => {
  status = "PENDING"; assert.equal((await post()).status, 409); assert.equal(writes.length, 0);
});
test("confirmed payment and foreign organization cannot be quarantined", async () => {
  status = "PAID";
  assert.equal((await post()).status, 409);
  assert.equal(writes.length, 0);
  status = "EXPIRED"; foreign = true;
  assert.ok([401, 403].includes((await post()).status));
  assert.equal(writes.length, 0);
});


test("missing QR requests detach immediately while preserving a durable reconciliation record", async () => {
  missingQr = true;
  status = currentStatus = "PENDING";
  providerFails = true;
  const response = await post(true);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { archiveId: "audit" });
  assert.equal(writes.length, 2);
  assert.equal(writes[1].status, "EXPIRED");
  const payload = writes[1].webhookPayload as Record<string, unknown>;
  assert.equal(payload.providerCancellationConfirmed, false);
  assert.equal(payload.requiresPaymentReconciliation, true);
  assert.equal(payload.reviewArchiveId, "audit");
  assert.deepEqual(payload.checkout, checkout);
});
test("missing-QR cancellation cannot detach a created QR or a payment that completed concurrently", async () => {
  status = currentStatus = "PENDING";
  assert.equal((await post(true)).status, 409);
  assert.equal(writes.length, 0);
  missingQr = true;
  currentStatus = "PAID";
  assert.equal((await post(true)).status, 503);
  assert.equal(writes.length, 0);
  currentStatus = "PENDING";
  qrArrived = true;
  assert.equal((await post(true)).status, 503);
  assert.equal(writes.length, 0);
});
