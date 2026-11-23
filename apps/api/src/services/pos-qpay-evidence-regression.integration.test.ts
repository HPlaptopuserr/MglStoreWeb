import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma, type Prisma } from "@mgl/database";
import { reconcilePosQrPayment } from "./pos-qpay-reconciliation";
import { encodeSystemQrMerchantAuth } from "./systemqr-merchant-auth";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled = process.env.QR_LIFECYCLE_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_card_recovery_test_");

/** Provider checks are mocked; all persistence uses an isolated local database. */
test("QR callback evidence preserves payment identity, concurrent recovery and duplicate delivery", { skip: !enabled }, async t => {
  const token = randomUUID();
  const org = await prisma.organization.create({ data: {
    name: "QR evidence regression", slug: token, taxId: token, status: "ACTIVE",
    qpayEnabled: true, qpayMerchantId: token, qpayInvoiceCode: "SYSTEMQR",
    qpayMerchantKey: encodeSystemQrMerchantAuth("evidence-test", "test-only-password"),
  } });
  const cashier = await prisma.user.create({ data: { email: `${token}@example.invalid` } });
  const branch = await prisma.branch.create({ data: { organizationId: org.id, name: "Test", address: "Test" } });
  const register = await prisma.posRegister.create({ data: {
    organizationId: org.id, branchId: branch.id, name: "Test", mode: "RETAIL",
    qpayEnabled: true, qpayMerchantId: token, qpayTerminalId: "SYSTEMQR",
  } });
  const originalFetch = globalThis.fetch;
  let entity: Record<string, unknown> | null = null;
  let fail = false;
  let onCheck: (() => Promise<void>) | null = null;
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/login")) {
      const request: unknown = JSON.parse(String(init?.body));
      assert.ok(request && typeof request === "object" && "username" in request);
      assert.equal(request.username, "evidence-test");
      return Response.json({ status: "000", entity: "test-provider-token" });
    }
    assert.ok(url.endsWith("/checkInvoice"), "reconciliation must never create a charge, cancel or refund a payment");
    const duringCheck = onCheck;
    onCheck = null;
    if (duringCheck) await duringCheck();
    if (fail) throw new Error("Provider unavailable");
    return Response.json({ status: "000", entity });
  };
  const fixture = async (withProviderIdentity = true) => {
    const id = randomUUID();
    const payload: Prisma.InputJsonObject = {
      provider: "SYSTEMQR", merchantScope: "REGISTER", merchantCode: token,
      ...(withProviderIdentity ? { providerInvoiceId: id } : {}),
      checkout: { clientSaleId: randomUUID(), branchId: branch.id, shiftId: randomUUID(),
        lines: [{ productId: randomUUID(), qty: 1, unitPrice: 100 }] },
    };
    const invoice = await prisma.qPayInvoice.create({ data: {
      id, organizationId: org.id, registerId: register.id, initiatedById: cashier.id,
      amount: 100, qrText: "frozen-qr", status: "EXPIRED",
      expiresAt: new Date(Date.now() - 60_000), webhookPayload: payload,
    }, include: { register: true } });
    entity = { status: null, invoiceNumber: id, amount: 100 };
    return { invoice, payload };
  };
  try {
    await t.test("a callback claiming success cannot override a bank-confirmed unpaid invoice", async () => {
      const { invoice } = await fixture();
      assert.equal((await reconcilePosQrPayment(invoice, { status: "PAID", amount: 100 })).state, "UNPAID");
      const stored = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
      assert.equal(stored.status, "EXPIRED");
      assert.equal(stored.paidAt, null);
      assert.equal(stored.paymentId, null);
    });
    await t.test("an ambiguous or unrelated bank response cannot release or pay an invoice", async () => {
      for (const value of [null, {}, { status: null }, { status: null, invoiceNumber: "other", amount: 100 }]) {
        const { invoice } = await fixture();
        entity = value;
        assert.equal((await reconcilePosQrPayment(invoice)).state, "UNKNOWN");
        assert.equal((await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: invoice.id } })).status, "EXPIRED");
      }
    });
    await t.test("an early callback cannot invent the provider invoice missing from an uncertain creation", async () => {
      const { invoice } = await fixture(false);
      const before = calls.length;
      assert.equal((await reconcilePosQrPayment(invoice, { invoiceNumber: "untrusted", status: "PAID" })).state, "UNKNOWN");
      assert.equal(calls.length, before);
      assert.equal((await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: invoice.id } })).consumedAt, null);
    });
    await t.test("a successful late payment preserves recovery metadata committed while the provider was queried", async () => {
      const { invoice, payload } = await fixture();
      entity = { status: "000", invoiceNumber: invoice.id, amount: 100 };
      onCheck = async () => {
        await prisma.qPayInvoice.update({ where: { id: invoice.id }, data: {
          webhookPayload: { ...payload, reviewArchiveId: "durable-review", requiresPaymentReconciliation: true,
            paymentLifecycleReview: { archiveId: "bank-verified-unpaid-audit", providerState: "UNPAID" } },
        } });
      };
      assert.equal((await reconcilePosQrPayment(invoice)).state, "PAID");
      const current = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
      const saved = current.webhookPayload as Prisma.JsonObject;
      assert.equal(saved.reviewArchiveId, "durable-review");
      assert.equal(saved.requiresPaymentReconciliation, true);
      assert.deepEqual(saved.paymentLifecycleReview, { archiveId: "bank-verified-unpaid-audit", providerState: "UNPAID" });
      assert.deepEqual(saved.checkout, payload.checkout);
      assert.equal(current.paymentId, `systemqr-${invoice.id}`);
    });
    await t.test("duplicate and concurrent callbacks retain exactly one provider payment reference", async () => {
      const { invoice } = await fixture();
      entity = { status: "000", invoiceNumber: invoice.id, amount: 100 };
      const results = await Promise.all([reconcilePosQrPayment(invoice), reconcilePosQrPayment(invoice)]);
      assert.ok(results.every(result => result.state === "PAID"));
      const before = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
      await reconcilePosQrPayment(invoice);
      const after = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
      assert.equal(after.paymentId, `systemqr-${invoice.id}`);
      assert.equal(after.paidAt?.getTime(), before.paidAt?.getTime());
      assert.equal(await prisma.qPayInvoice.count({ where: { paymentId: after.paymentId } }), 1);
    });
    await t.test("already consumed payment data is never detached or overwritten by a stale callback", async () => {
      const { invoice, payload } = await fixture();
      entity = { status: "000", invoiceNumber: invoice.id, amount: 100 };
      onCheck = async () => {
        await prisma.qPayInvoice.update({ where: { id: invoice.id }, data: {
          status: "PAID", paidAt: new Date(), consumedAt: new Date(), saleReference: "completed-sale",
          paymentId: `systemqr-${invoice.id}`, webhookPayload: { ...payload, consumedProof: "retained" },
        } });
      };
      assert.equal((await reconcilePosQrPayment(invoice)).state, "PAID");
      const current = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
      assert.equal(current.saleReference, "completed-sale");
      assert.ok(current.consumedAt);
      assert.equal((current.webhookPayload as Prisma.JsonObject).consumedProof, "retained");
    });
    await t.test("a wrong amount or bank outage cannot settle an invoice", async () => {
      const { invoice } = await fixture();
      entity = { status: "000", invoiceNumber: invoice.id, amount: 99 };
      await assert.rejects(reconcilePosQrPayment(invoice), /зөрүүтэй/);
      fail = true;
      await assert.rejects(reconcilePosQrPayment(invoice), /Provider unavailable/);
      fail = false;
      const current = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
      assert.equal(current.status, "EXPIRED");
      assert.equal(current.paymentId, null);
    });
  } finally {
    globalThis.fetch = originalFetch;
    await prisma.$disconnect();
  }
});
