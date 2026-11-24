import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma, type Prisma } from "@mgl/database";
import { encodeSystemQrMerchantAuth } from "./systemqr-merchant-auth";
import { processPosQrInvoiceLifecycle } from "./pos-qpay-lifecycle";
import { reconcileResolvedPosReservations } from "./pos-reservation-reconciliation";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled = process.env.QR_LIFECYCLE_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_card_recovery_test_");

test("expired QR cancellation and cross-store reservation repair retain every unresolved payment", { skip: !enabled }, async t => {
  const orgs: string[] = [];
  const originalFetch = globalThis.fetch;
  let cancelFails = false;
  let unknown = false;
  let bankPaid = false;
  let afterCancel: (() => Promise<void>) | undefined;
  let cancellations = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/login")) return Response.json({ status: "000", entity: "reservation-test-token" });
    const body = JSON.parse(String(init?.body)) as { invoiceNumber: string };
    if (url.endsWith("/checkInvoice")) return Response.json({ status: "000", entity: unknown ? null : {
      status: bankPaid ? "000" : null, invoiceNumber: body.invoiceNumber, amount: 100,
    } });
    assert.ok(url.endsWith("/cancelQr"), `Unexpected provider operation: ${url}`);
    cancellations += 1;
    if (afterCancel) { const run = afterCancel; afterCancel = undefined; await run(); }
    if (cancelFails) throw new Error("Bank cancellation unavailable");
    return Response.json({ status: "000" });
  };
  const fixture = async () => {
    const key = randomUUID();
    const org = await prisma.organization.create({ data: { name: "Reservation prevention", slug: key, taxId: key,
      qpayEnabled: true, qpayMerchantId: key, qpayInvoiceCode: "SYSTEMQR",
      qpayMerchantKey: encodeSystemQrMerchantAuth("reservation-test", "test-password") } });
    orgs.push(org.id);
    const branch = await prisma.branch.create({ data: { organizationId: org.id, name: "Test", address: "Test" } });
    const register = await prisma.posRegister.create({ data: { organizationId: org.id, branchId: branch.id,
      name: "Test", qpayEnabled: true, qpayMerchantId: key, qpayTerminalId: "SYSTEMQR" } });
    const product = await prisma.product.create({ data: { organizationId: org.id, name: "Reserved product", price: 100, stock: 1 } });
    const checkout = { clientSaleId: randomUUID(), branchId: branch.id, shiftId: randomUUID(),
      lines: [{ productId: product.id, qty: 1, unitPrice: 100 }] };
    const invoiceId = randomUUID();
    const payload: Prisma.InputJsonObject = { provider: "SYSTEMQR", providerInvoiceId: invoiceId,
      merchantScope: "REGISTER", merchantCode: key, checkout };
    const invoice = await prisma.qPayInvoice.create({ data: { id: invoiceId, organizationId: org.id,
      registerId: register.id, amount: 100, qrText: "original", status: "PENDING",
      expiresAt: new Date(Date.now() - 60_000), webhookPayload: payload } });
    const reservation = await prisma.posCardStockReservation.create({ data: {
      organizationId: org.id, registerId: register.id, clientSaleId: checkout.clientSaleId,
      productId: product.id, quantity: 1, createdAt: new Date(Date.now() - 120_000),
    } });
    const count = () => prisma.posCardStockReservation.count({ where: { id: reservation.id } });
    return { org, register, product, checkout, invoice, payload, count };
  };
  try {
    await t.test("bank-confirmed expiry cancellation frees stock and stops further cancellation", async () => {
      const f = await fixture();
      const before = cancellations;
      await processPosQrInvoiceLifecycle(f.invoice.id);
      assert.equal(await f.count(), 0);
      const current = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
      assert.equal(current.status, "EXPIRED");
      assert.equal((current.webhookPayload as Prisma.JsonObject).providerCancellationConfirmed, true);
      await processPosQrInvoiceLifecycle(f.invoice.id);
      assert.equal(cancellations, before + 1);
      assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 1);
    });
    await t.test("failed cancellation frees only a freshly verified expired unpaid hold without inventing bank cancellation", async () => {
      const failed = await fixture();
      cancelFails = true;
      try { await processPosQrInvoiceLifecycle(failed.invoice.id); }
      finally { cancelFails = false; }
      assert.equal(await failed.count(), 0);
      const current = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: failed.invoice.id } });
      const payload = current.webhookPayload as Prisma.JsonObject;
      assert.equal(payload.providerCancellationConfirmed, false);
      assert.equal(payload.cancelledAt, undefined);
      assert.equal(payload.requiresPaymentReconciliation, true);
      assert.equal(typeof payload.inventoryReleaseAuditId, "string");
      assert.equal(current.consumedAt, null);
      const ambiguous = await fixture();
      unknown = true;
      const before = cancellations;
      try { await processPosQrInvoiceLifecycle(ambiguous.invoice.id); }
      finally { unknown = false; }
      assert.equal(await ambiguous.count(), 1);
      assert.equal(cancellations, before);
    });
    await t.test("a failed cancellation followed by unknown evidence or a late payment cannot release stock", async () => {
      for (const paid of [false, true]) {
        const f = await fixture();
        cancelFails = true;
        afterCancel = async () => { if (paid) bankPaid = true; else unknown = true; };
        try { await assert.rejects(processPosQrInvoiceLifecycle(f.invoice.id)); }
        finally { cancelFails = false; bankPaid = false; unknown = false; }
        assert.equal(await f.count(), 1);
        const current = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
        assert.equal((current.webhookPayload as Prisma.JsonObject).inventoryReleaseAuditId, undefined);
        if (paid) assert.equal(current.status, "PAID");
      }
    });
    await t.test("a paid callback racing cancellation is preserved with its stock reservation", async () => {
      const f = await fixture();
      afterCancel = async () => { await prisma.qPayInvoice.update({ where: { id: f.invoice.id }, data: {
        status: "PAID", paidAt: new Date(), paymentId: randomUUID(),
      } }); };
      await processPosQrInvoiceLifecycle(f.invoice.id);
      assert.equal(await f.count(), 1);
      const current = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
      assert.equal(current.status, "PAID");
      assert.notEqual((current.webhookPayload as Prisma.JsonObject).providerCancellationConfirmed, true);
    });
    await t.test("future invoices and split baskets with unresolved cards retain stock", async () => {
      const future = await fixture();
      await prisma.qPayInvoice.update({ where: { id: future.invoice.id }, data: { expiresAt: new Date(Date.now() + 60_000) } });
      const before = cancellations;
      await processPosQrInvoiceLifecycle(future.invoice.id);
      assert.equal(cancellations, before);
      assert.equal(await future.count(), 1);
      const mixed = await fixture();
      const card = await prisma.cardPaymentAttempt.create({ data: { organizationId: mixed.org.id, registerId: mixed.register.id,
        terminalId: randomUUID(), amount: 50, status: "FAILED", providerPayload: { provider: "MINU_AGENT", checkout: mixed.checkout } } });
      cancelFails = true;
      try { await processPosQrInvoiceLifecycle(mixed.invoice.id); }
      finally { cancelFails = false; }
      assert.equal(await mixed.count(), 1);
      await prisma.cardPaymentAttempt.update({ where: { id: card.id }, data: { status: "DECLINED" } });
      for (let i = 0; i < 6; i += 1) await reconcileResolvedPosReservations();
      assert.equal(await mixed.count(), 0);
    });
    await t.test("untrusted JSON and another invoice's release audit cannot waive a reservation", async () => {
      const owner = await fixture();
      cancelFails = true;
      try { await processPosQrInvoiceLifecycle(owner.invoice.id); }
      finally { cancelFails = false; }
      const proof = (await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: owner.invoice.id } })).webhookPayload as Prisma.JsonObject;
      for (const marker of [randomUUID(), String(proof.inventoryReleaseAuditId)]) {
        const f = await fixture();
        await prisma.qPayInvoice.update({ where: { id: f.invoice.id }, data: { status: "EXPIRED",
          webhookPayload: { ...f.payload, inventoryReleaseAuditId: marker, inventoryHoldExpiredAt: new Date().toISOString() } } });
        for (let i = 0; i < 6; i += 1) await reconcileResolvedPosReservations();
        assert.equal(await f.count(), 1);
      }
    });
    await t.test("repair clears resolved and orphaned baskets across stores while retaining pending and paid ones", async () => {
      const cancelled = await fixture();
      await prisma.qPayInvoice.update({ where: { id: cancelled.invoice.id }, data: {
        status: "EXPIRED", webhookPayload: { ...cancelled.payload, providerCancellationConfirmed: true },
      } });
      const orphan = await fixture();
      await prisma.qPayInvoice.delete({ where: { id: orphan.invoice.id } });
      const declined = await fixture();
      await prisma.qPayInvoice.delete({ where: { id: declined.invoice.id } });
      await prisma.cardPaymentAttempt.create({ data: { organizationId: declined.org.id, registerId: declined.register.id,
        terminalId: randomUUID(), amount: 100, status: "DECLINED", providerPayload: { provider: "MINU_AGENT", checkout: declined.checkout } } });
      const pending = await fixture();
      const paid = await fixture();
      await prisma.qPayInvoice.update({ where: { id: paid.invoice.id }, data: { status: "PAID", paidAt: new Date() } });
      const recent = await fixture();
      await prisma.qPayInvoice.delete({ where: { id: recent.invoice.id } });
      await prisma.posCardStockReservation.updateMany({ where: { organizationId: recent.org.id }, data: { createdAt: new Date() } });
      // More than one scheduler page: an unresolved early basket must not starve later stores.
      for (let i = 0; i < 30; i += 1) await fixture();
      for (let i = 0; i < 6; i += 1) await reconcileResolvedPosReservations();
      for (const f of [cancelled, orphan, declined]) assert.equal(await f.count(), 0);
      for (const f of [pending, paid, recent]) assert.equal(await f.count(), 1);
      const audits = await prisma.auditLog.count({ where: { meta: { path: ["event"], equals: "POS_RESOLVED_RESERVATION_RELEASED" } } });
      assert.ok(audits >= 3);
    });
  } finally {
    globalThis.fetch = originalFetch;
    await prisma.posCardStockReservation.deleteMany({ where: { organizationId: { in: orgs } } });
    await prisma.$disconnect();
  }
});
