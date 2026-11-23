import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import router from "../routes/operations/pos/qpay.routes";
import { JWT_SECRET } from "../routes/operations/pos/_shared";
import { encodeSystemQrMerchantAuth } from "./systemqr-merchant-auth";
import { processPosQrInvoiceLifecycle, reconcilePendingPosQrPayments } from "./pos-qpay-lifecycle";
import { reconcilePosQrPayment } from "./pos-qpay-reconciliation";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled = process.env.QR_LIFECYCLE_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_card_recovery_test_");

test("confirmed bank cancellation stops worker, status and retry observation while genuine late funds remain recoverable", { skip: !enabled }, async t => {
  const token = randomUUID();
  const org = await prisma.organization.create({ data: { name: "Cancellation stop test", slug: token, taxId: token, status: "ACTIVE",
    qpayEnabled: true, qpayMerchantId: token, qpayInvoiceCode: "SYSTEMQR", qpayMerchantKey: encodeSystemQrMerchantAuth("cancel-stop", "test-only-password") } });
  const user = await prisma.user.create({ data: { email: `${token}@example.invalid` } });
  await prisma.organizationMember.create({ data: { organizationId: org.id, userId: user.id, role: "STAFF", capabilities: ["POS_CASHIER"], isPrimary: true } });
  const branch = await prisma.branch.create({ data: { organizationId: org.id, name: "Test", address: "Test" } });
  const register = await prisma.posRegister.create({ data: { organizationId: org.id, branchId: branch.id, name: "Test",
    activationStatus: "APPROVED", isActive: true, qpayEnabled: true, qpayMerchantId: token, qpayTerminalId: "SYSTEMQR" } });
  const fixture = async (confirmed = true) => {
    const id = randomUUID();
    const payload: Prisma.InputJsonObject = { provider: "SYSTEMQR", merchantScope: "REGISTER", merchantCode: token, providerInvoiceId: id,
      providerCancellationConfirmed: confirmed, ...(confirmed ? { cancelledAt: new Date().toISOString() } : {}),
      checkout: { clientSaleId: randomUUID(), branchId: branch.id, shiftId: randomUUID(), autoFinalizeEligible: false,
        lines: [{ productId: randomUUID(), qty: 1, unitPrice: 100 }] } };
    const invoice = await prisma.qPayInvoice.create({ data: { id, organizationId: org.id, registerId: register.id,
      initiatedById: user.id, amount: 100, qrText: "original", status: "EXPIRED", expiresAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(Date.now() - 600_000), webhookPayload: payload }, include: { register: true } });
    return { invoice, payload };
  };
  let bankCalls = 0;
  let paid = false;
  let duringCheck: (() => Promise<void>) | null = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith("http://127.0.0.1:")) return originalFetch(input, init);
    const request = JSON.parse(String(init?.body)) as { invoiceNumber: string; merchantCode?: string; username?: string };
    // A scheduler can legitimately process fixtures belonging to other stores.
    // Count only this store's provider calls so the regression is suite-safe.
    if (url.endsWith("/login")) {
      if (request.username === "cancel-stop") bankCalls += 1;
      return Response.json({ status: "000", entity: "cancel-test-token" });
    }
    assert.ok(url.endsWith("/checkInvoice"), "cancelled observations must not create or cancel another bank request");
    if (request.merchantCode === token) bankCalls += 1;
    const run = request.merchantCode === token ? duringCheck : null;
    if (run) { duringCheck = null; await run(); }
    return Response.json({ status: "000", entity: { status: paid ? "000" : null, invoiceNumber: request.invoiceNumber, amount: 100 } });
  };
  const app = express(); app.use(express.json(), router);
  const server = createServer(app); server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/pos/payments/qpay`;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${jwt.sign({ userId: user.id, organizationId: org.id }, JWT_SECRET)}` };
  try {
    await t.test("confirmed cancellation is omitted by the scheduler and direct worker without any bank request", async () => {
      const f = await fixture();
      const before = bankCalls;
      await processPosQrInvoiceLifecycle(f.invoice.id);
      await reconcilePendingPosQrPayments();
      assert.equal(bankCalls, before);
      const current = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
      assert.equal(current.status, "EXPIRED");
      assert.equal(current.updatedAt.getTime(), f.invoice.updatedAt.getTime());
    });
    await t.test("manual provider refresh and cancellation retry are local idempotent reads after bank confirmation", async () => {
      const f = await fixture();
      const before = bankCalls;
      for (const refresh of ["0", "1"]) {
        const response = await fetch(`${base}/status/${f.invoice.id}?refresh=${refresh}`, { headers });
        assert.equal(response.status, 200);
        const body = await response.json() as { status: string; providerCancellationConfirmed: boolean; reconciliationPending: boolean };
        assert.equal(body.status, "EXPIRED"); assert.equal(body.providerCancellationConfirmed, true); assert.equal(body.reconciliationPending, false);
      }
      const cancel = await fetch(`${base}/cancel`, { method: "POST", headers, body: JSON.stringify({ invoiceId: f.invoice.id, requireProviderCancellation: true }) });
      assert.equal(cancel.status, 200, await cancel.clone().text());
      assert.equal((await cancel.json() as { providerCancellationConfirmed: boolean }).providerCancellationConfirmed, true);
      const checkout = f.payload.checkout as Prisma.InputJsonObject;
      const review = await fetch(`${base}/review`, { method: "POST", headers, body: JSON.stringify({ invoiceId: f.invoice.id,
        snapshot: JSON.stringify({ clientSaleId: checkout.clientSaleId, registerId: register.id,
          paymentEntries: [{ method: "QR", status: "pending", invoiceId: f.invoice.id }] }) }) });
      assert.equal(review.status, 409, await review.clone().text());
      assert.equal(bankCalls, before);
    });
    await t.test("a cancellation confirmed during an in-flight unpaid check cannot be reopened or archived", async () => {
      const f = await fixture(false);
      duringCheck = async () => {
        await prisma.qPayInvoice.update({ where: { id: f.invoice.id }, data: { status: "EXPIRED",
          webhookPayload: { ...f.payload, providerCancellationConfirmed: true, cancelledAt: "bank-confirmed-during-check" } } });
      };
      await processPosQrInvoiceLifecycle(f.invoice.id);
      const current = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
      const payload = current.webhookPayload as Prisma.JsonObject;
      assert.equal(current.status, "EXPIRED"); assert.equal(payload.providerCancellationConfirmed, true);
      assert.equal(payload.cancelledAt, "bank-confirmed-during-check"); assert.equal(payload.paymentLifecycleReview, undefined);
      const before = bankCalls;
      await processPosQrInvoiceLifecycle(f.invoice.id);
      await fetch(`${base}/status/${f.invoice.id}?refresh=1`, { headers });
      assert.equal(bankCalls, before);
    });
    await t.test("a true late bank approval is still accepted despite historical cancellation proof", async () => {
      const f = await fixture();
      paid = true;
      const before = bankCalls;
      assert.equal((await reconcilePosQrPayment(f.invoice, { event: "authenticated-late-payment" })).state, "PAID");
      paid = false;
      assert.ok(bankCalls > before);
      const current = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
      assert.equal(current.status, "PAID"); assert.equal(current.paymentId, `systemqr-${f.invoice.id}`); assert.ok(current.paidAt);
      assert.equal((current.webhookPayload as Prisma.JsonObject).providerCancellationConfirmed, true);
    });
    await t.test("local expiry without cancellation proof continues bank reconciliation", async () => {
      const f = await fixture(false);
      const before = bankCalls;
      await processPosQrInvoiceLifecycle(f.invoice.id);
      assert.ok(bankCalls > before);
      const current = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
      assert.ok((current.webhookPayload as Prisma.JsonObject).paymentLifecycleReview);
      assert.equal((current.webhookPayload as Prisma.JsonObject).providerCancellationConfirmed, false);
    });
  } finally {
    globalThis.fetch = originalFetch;
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
});
