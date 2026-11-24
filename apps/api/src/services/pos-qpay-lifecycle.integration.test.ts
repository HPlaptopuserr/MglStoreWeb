import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import salesRouter, { executePosSale } from "../routes/operations/pos/sales.routes";
import { JWT_SECRET, type AuthUser, type CreateSaleBody } from "../routes/operations/pos/_shared";
import { encodeSystemQrMerchantAuth } from "./systemqr-merchant-auth";
import { processPosQrInvoiceLifecycle } from "./pos-qpay-lifecycle";
import { reconcilePosQrPayment } from "./pos-qpay-reconciliation";
import { loadUnsettledShiftPayments } from "../routes/operations/pos/unsettled-shift-payments";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled = process.env.QR_LIFECYCLE_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_card_recovery_test_");

test("durable QR lifecycle completes offline baskets once and keeps uncertain payments recoverable", { skip: !enabled }, async t => {
  const token = randomUUID();
  const org = await prisma.organization.create({ data: {
    name: "QR lifecycle regression", slug: token, taxId: token, status: "ACTIVE",
    qpayEnabled: true, qpayMerchantId: token, qpayInvoiceCode: "SYSTEMQR",
    qpayMerchantKey: encodeSystemQrMerchantAuth("lifecycle-test", "test-only-password"),
  } });
  const cashier = await prisma.user.create({ data: { email: `${token}@example.invalid` } });
  await prisma.organizationMember.create({ data: {
    organizationId: org.id, userId: cashier.id, role: "STAFF", capabilities: ["POS_CASHIER"], isPrimary: true,
  } });
  const branch = await prisma.branch.create({ data: { organizationId: org.id, name: "Test", address: "Test" } });
  const actor: AuthUser = { id: cashier.id, role: "USER", isActive: true, deletedAt: null,
    organizationId: org.id, orgRole: "STAFF", capabilities: ["POS_CASHIER"] };
  const originalFetch = globalThis.fetch;
  const bankStates = new Map<string, "PAID" | "UNPAID" | "UNKNOWN">();
  let unavailable = false;
  let cancellationFails = false;
  const requests: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith("http://127.0.0.1:")) return originalFetch(input, init);
    requests.push(url);
    if (url.endsWith("/login")) return Response.json({ status: "000", entity: "lifecycle-test-token" });
    if (url.endsWith("/cancelQr")) return Response.json(cancellationFails
      ? { status: "001", message: "Provider system error" } : { status: "000" });
    assert.ok(url.endsWith("/checkInvoice"), "automatic recovery must never create or refund a bank charge");
    if (unavailable) throw new Error("Bank offline");
    const request: unknown = JSON.parse(String(init?.body));
    assert.ok(request && typeof request === "object" && "invoiceNumber" in request);
    const invoiceNumber = String(request.invoiceNumber);
    const state = bankStates.get(invoiceNumber);
    return Response.json({ status: "000", entity: state === "UNKNOWN" ? null : {
      status: state === "PAID" ? "000" : null, invoiceNumber, amount: 100,
    } });
  };
  const app = express(); app.use(express.json(), salesRouter);
  const server = createServer(app); server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${jwt.sign({ userId: cashier.id, organizationId: org.id }, JWT_SECRET)}` };
  const fixture = async (eligible: boolean | null = true, closed = false, amount = 100) => {
    const register = await prisma.posRegister.create({ data: {
      organizationId: org.id, branchId: branch.id, name: randomUUID(), activationStatus: "APPROVED", isActive: true,
      qpayEnabled: true, qpayMerchantId: token, qpayTerminalId: `SYSTEMQR:${randomUUID()}`, ebarimtEnabled: true,
    } });
    const shift = await prisma.posShift.create({ data: {
      organizationId: org.id, branchId: branch.id, registerId: register.id, cashierId: cashier.id,
      openingCash: 0, status: closed ? "CLOSED" : "OPEN", ...(closed ? { closedAt: new Date() } : {}),
    } });
    const product = await prisma.product.create({ data: { organizationId: org.id, name: "Frozen QR product", price: 100, stock: 5 } });
    const clientSaleId = randomUUID();
    const lines = [{ productId: product.id, qty: 1, unitPrice: 100, priceType: "UNIT" as const, discountAmount: 0, taxRate: 0 }];
    const checkout = { clientSaleId, branchId: branch.id, shiftId: shift.id, lines,
      ...(eligible !== null ? { autoFinalizeEligible: eligible } : {}) };
    const id = randomUUID();
    const payload: Prisma.InputJsonObject = { provider: "SYSTEMQR", merchantScope: "REGISTER", merchantCode: token,
      providerInvoiceId: id, checkout };
    const invoice = await prisma.qPayInvoice.create({ data: {
      id, organizationId: org.id, registerId: register.id, initiatedById: cashier.id, amount,
      qrText: "original-qr", status: "PAID", paidAt: new Date(Date.now() - 30_000),
      expiresAt: new Date(Date.now() - 60_000), webhookPayload: payload,
    } });
    const sale: CreateSaleBody = { organizationId: org.id, registerId: register.id, branchId: branch.id, shiftId: shift.id,
      clientSaleId, lines, paymentMethod: "QPAY", paymentBreakdown: [{ method: "QPAY", amount, invoiceId: id }], loyalty: { mode: "NONE" } };
    return { register, shift, product, invoice, checkout, payload, sale };
  };
  const countSales = (registerId: string) => prisma.posSale.count({ where: { registerId } });
  const stock = async (id: string) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;
  try {
    await t.test("a paid basket is completed with the browser offline and fiscal work is retained", async () => {
      const f = await fixture();
      await processPosQrInvoiceLifecycle(f.invoice.id);
      const invoice = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
      assert.equal(await countSales(f.register.id), 1);
      assert.equal(await stock(f.product.id), 4);
      assert.ok(invoice.consumedAt);
      assert.ok(invoice.saleReference);
      const metadata = invoice.webhookPayload as Prisma.JsonObject;
      const receipt = metadata.autoFinalizedSale as Prisma.JsonObject;
      assert.equal(receipt.receiptNo, invoice.saleReference);
      assert.equal(receipt.clientSaleId, f.checkout.clientSaleId);
      assert.equal(receipt.fiscalPending, true);
      await processPosQrInvoiceLifecycle(f.invoice.id);
      assert.equal(await countSales(f.register.id), 1);
      assert.equal(await stock(f.product.id), 4);
    });
    await t.test("internal recovery commits its durable fiscal marker in the same transaction as payment consumption", async () => {
      const f = await fixture();
      const result = await executePosSale(f.sale, actor, undefined, { verifiedQrInvoiceId: f.invoice.id });
      assert.equal(result.status, 201, JSON.stringify(result));
      // No lifecycle follow-up runs here: this is the process-crash boundary.
      const invoice = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
      assert.ok(invoice.consumedAt);
      const marker = (invoice.webhookPayload as Prisma.JsonObject).autoFinalizedSale as Prisma.JsonObject;
      assert.equal(marker.receiptNo, invoice.saleReference);
      assert.equal(marker.clientSaleId, f.checkout.clientSaleId);
      assert.equal(marker.fiscalPending, true);
      assert.equal(await countSales(f.register.id), 1);
      assert.equal(await stock(f.product.id), 4);
    });
    await t.test("a browser sale racing the worker consumes payment and stock exactly once", async () => {
      const f = await fixture();
      await Promise.all([processPosQrInvoiceLifecycle(f.invoice.id), executePosSale(f.sale, actor)]);
      const replay = await executePosSale(f.sale, actor);
      assert.ok(replay.status === 200 || replay.status === 201, JSON.stringify(replay));
      assert.equal(await countSales(f.register.id), 1);
      assert.equal(await stock(f.product.id), 4);
      const invoice = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
      assert.ok(invoice.consumedAt);
      assert.ok(invoice.saleReference);
    });
    await t.test("late full QR recovers its original closed shift while HTTP clients cannot bypass closure", async () => {
      const f = await fixture(true, true);
      const external = await fetch(`${base}/pos/sales`, { method: "POST", headers,
        body: JSON.stringify({ ...f.sale, recovery: { verifiedQrInvoiceId: f.invoice.id }, verifiedQrInvoiceId: f.invoice.id }) });
      assert.equal(external.status, 409, await external.clone().text());
      assert.equal(await countSales(f.register.id), 0);
      await processPosQrInvoiceLifecycle(f.invoice.id);
      assert.equal(await countSales(f.register.id), 1);
      assert.equal(await stock(f.product.id), 4);
      const sale = await prisma.posSale.findFirstOrThrow({ where: { registerId: f.register.id } });
      assert.equal(sale.shiftId, f.shift.id);
      assert.equal(sale.cashierId, cashier.id);
      assert.equal((await prisma.posShift.findUniqueOrThrow({ where: { id: f.shift.id } })).status, "CLOSED");
    });
    await t.test("legacy, ineligible and partial baskets remain recoverable without an invented sale", async () => {
      for (const [eligible, amount] of [[null, 100], [false, 100], [true, 50]] as const) {
        const f = await fixture(eligible, false, amount);
        await processPosQrInvoiceLifecycle(f.invoice.id);
        assert.equal(await countSales(f.register.id), 0);
        assert.equal(await stock(f.product.id), 5);
        const invoice = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
        assert.equal(invoice.status, "PAID");
        assert.equal(invoice.consumedAt, null);
        assert.equal(typeof (invoice.webhookPayload as Prisma.JsonObject).autoFinalizeReviewRequired, "string");
      }
    });
    await t.test("mixed payment evidence and revoked cashier access keep paid invoices in recovery", async () => {
      const mixed = await fixture();
      await prisma.cardPaymentAttempt.create({ data: {
        organizationId: org.id, registerId: mixed.register.id, terminalId: randomUUID(), amount: 1, status: "APPROVED",
        providerPayload: { provider: "MINU_AGENT", checkout: mixed.checkout },
      } });
      await processPosQrInvoiceLifecycle(mixed.invoice.id);
      assert.equal(await countSales(mixed.register.id), 0);
      assert.equal(await stock(mixed.product.id), 5);
      const denied = await fixture();
      await prisma.user.update({ where: { id: cashier.id }, data: { isActive: false } });
      try { await processPosQrInvoiceLifecycle(denied.invoice.id); }
      finally { await prisma.user.update({ where: { id: cashier.id }, data: { isActive: true } }); }
      assert.equal(await countSales(denied.register.id), 0);
      assert.equal(await stock(denied.product.id), 5);
      for (const f of [mixed, denied]) {
        const invoice = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
        assert.equal(invoice.status, "PAID");
        assert.equal(invoice.consumedAt, null);
        assert.equal(typeof (invoice.webhookPayload as Prisma.JsonObject).autoFinalizeReviewRequired, "string");
      }
    });
    await t.test("an expired bank-verified unpaid invoice is resolved before shift closure and stays tracked for late payment", async () => {
      const f = await fixture();
      await prisma.qPayInvoice.update({ where: { id: f.invoice.id }, data: { status: "PENDING", paidAt: null } });
      bankStates.set(f.invoice.id, "UNPAID");
      await processPosQrInvoiceLifecycle(f.invoice.id);
      let invoice = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
      assert.equal(invoice.status, "EXPIRED");
      assert.equal(invoice.consumedAt, null);
      assert.equal(await countSales(f.register.id), 0);
      assert.equal(await stock(f.product.id), 5);
      assert.deepEqual(await loadUnsettledShiftPayments(prisma, { ...f.shift, registerId: f.register.id }), { cardCount: 0, qrCount: 0 });
      bankStates.set(f.invoice.id, "PAID");
      await reconcilePosQrPayment({ ...invoice, register: f.register }, { event: "authenticated-late-payment" });
      invoice = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
      assert.equal(invoice.status, "PAID");
      assert.deepEqual(await loadUnsettledShiftPayments(prisma, { ...f.shift, registerId: f.register.id }), { cardCount: 0, qrCount: 1 });
      await prisma.qPayInvoice.update({ where: { id: f.invoice.id }, data: { paidAt: new Date(Date.now() - 30_000) } });
      await processPosQrInvoiceLifecycle(f.invoice.id);
      assert.equal(await countSales(f.register.id), 1);
      assert.equal(await stock(f.product.id), 4);
    });
    await t.test("bank cancellation failure cannot block the next cash customer and late money remains recoverable without overselling", async () => {
      const f = await fixture();
      await prisma.product.update({ where: { id: f.product.id }, data: { stock: 1 } });
      await prisma.qPayInvoice.update({ where: { id: f.invoice.id }, data: { status: "PENDING", paidAt: null } });
      await prisma.posCardStockReservation.create({ data: { organizationId: org.id, registerId: f.register.id,
        clientSaleId: f.checkout.clientSaleId, productId: f.product.id, quantity: 1 } });
      bankStates.set(f.invoice.id, "UNPAID"); cancellationFails = true;
      try { await processPosQrInvoiceLifecycle(f.invoice.id); }
      finally { cancellationFails = false; }
      assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 0);
      const cash = await executePosSale({ ...f.sale, clientSaleId: randomUUID(), paymentMethod: "CASH",
        paymentBreakdown: [{ method: "CASH", amount: 100 }] }, actor);
      assert.equal(cash.status, 201, JSON.stringify(cash));
      assert.equal(await stock(f.product.id), 0);
      bankStates.set(f.invoice.id, "PAID");
      await processPosQrInvoiceLifecycle(f.invoice.id);
      await prisma.qPayInvoice.update({ where: { id: f.invoice.id }, data: { paidAt: new Date(Date.now() - 30_000) } });
      await processPosQrInvoiceLifecycle(f.invoice.id);
      const current = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
      assert.equal(current.status, "PAID"); assert.equal(current.consumedAt, null);
      assert.equal(await countSales(f.register.id), 1); assert.equal(await stock(f.product.id), 0);
      assert.equal((current.webhookPayload as Prisma.JsonObject).autoFinalizeReviewRequired, "ORIGINAL_SALE_VALIDATION_REQUIRES_RETRY");
    });
    await t.test("unknown responses and provider outages never make an invoice disappear from accounting", async () => {
      for (const offline of [false, true]) {
        const f = await fixture();
        await prisma.qPayInvoice.update({ where: { id: f.invoice.id }, data: { status: "PENDING", paidAt: null } });
        bankStates.set(f.invoice.id, "UNKNOWN");
        unavailable = offline;
        try { await processPosQrInvoiceLifecycle(f.invoice.id); } catch (error: unknown) {
          assert.ok(offline && error instanceof Error);
        } finally { unavailable = false; }
        const invoice = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: f.invoice.id } });
        assert.equal(invoice.status, "PENDING");
        assert.equal(invoice.consumedAt, null);
        assert.deepEqual(await loadUnsettledShiftPayments(prisma, { ...f.shift, registerId: f.register.id }), { cardCount: 0, qrCount: 1 });
        assert.equal(await countSales(f.register.id), 0);
      }
    });
    assert.ok(requests.length > 0);
  } finally {
    globalThis.fetch = originalFetch;
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
});
