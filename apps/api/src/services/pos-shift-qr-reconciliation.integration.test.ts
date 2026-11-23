import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma, PosQPayStatus } from "@mgl/database";
import { encodeSystemQrMerchantAuth } from "./systemqr-merchant-auth";
import { checkExpiredShiftQrPayments, archiveUnpaidShiftQrPayments } from "./pos-shift-qr-reconciliation";
import { loadUnsettledShiftPayments } from "../routes/operations/pos/unsettled-shift-payments";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled = process.env.SHIFT_PAYMENT_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_card_recovery_test_");

test("shift close verifies expired QR with the bank, preserves evidence and never releases paid or unknown payments", { skip: !enabled }, async t => {
  const token = randomUUID();
  const org = await prisma.organization.create({ data: {
    name: "Shift QR reconciliation", slug: token, taxId: token, status: "ACTIVE",
    qpayEnabled: true, qpayMerchantId: token, qpayInvoiceCode: "SYSTEMQR",
    qpayMerchantKey: encodeSystemQrMerchantAuth("shift-test", "test-only-password"),
  } });
  const cashier = await prisma.user.create({ data: { email: `${token}@example.invalid` } });
  const branch = await prisma.branch.create({ data: { organizationId: org.id, name: "Test", address: "Test" } });
  const register = await prisma.posRegister.create({ data: {
    organizationId: org.id, branchId: branch.id, name: "Test", mode: "RETAIL",
    qpayEnabled: true, qpayMerchantId: token, qpayTerminalId: "SYSTEMQR",
  } });
  const shift = { id: randomUUID(), organizationId: org.id, registerId: register.id,
    cashierId: cashier.id, openedAt: new Date(Date.now() - 86_400_000) };
  const payload = { provider: "SYSTEMQR", merchantScope: "REGISTER", merchantCode: token,
    providerInvoiceId: "provider-invoice", checkout: { shiftId: shift.id, clientSaleId: "frozen-basket", lines: [{ sku: "retained" }] },
    reviewArchiveId: "old-basket-review" };
  const invoice = await prisma.qPayInvoice.create({ data: {
    organizationId: org.id, registerId: register.id, initiatedById: cashier.id,
    amount: 100, qrText: "retained-qr", expiresAt: new Date(Date.now() - 60_000), webhookPayload: payload,
  } });
  const originalFetch = globalThis.fetch;
  let provider: object = { status: "000", entity: { status: null, invoiceNumber: "provider-invoice", amount: 100 } };
  let fail = false;
  let checkCalls = 0;
  globalThis.fetch = async (input, init) => {
    if (String(input).endsWith("/login")) {
      assert.equal(JSON.parse(String(init?.body)).username, "shift-test");
      return Response.json({ status: "000", entity: "test-token" });
    }
    assert.ok(String(input).endsWith("/checkInvoice"), "shift closure must never charge or pretend to cancel a bank invoice");
    checkCalls += 1;
    if (fail) throw new Error("Provider unavailable");
    return Response.json(provider);
  };
  try {
    await t.test("an old basket archive alone does not unblock accounting", async () => {
      assert.deepEqual(await loadUnsettledShiftPayments(prisma, shift), { cardCount: 0, qrCount: 1 });
    });
    await t.test("verified unpaid QR is archived without deleting payment or stock evidence", async () => {
      const proofs = await checkExpiredShiftQrPayments(shift);
      assert.equal(checkCalls, 1);
      assert.equal(proofs.length, 1);
      const count = await prisma.$transaction(tx => archiveUnpaidShiftQrPayments(tx, shift, proofs, cashier.id));
      assert.equal(count, 1);
      assert.deepEqual(await loadUnsettledShiftPayments(prisma, shift), { cardCount: 0, qrCount: 0 });
      const current = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
      assert.equal(current.status, "EXPIRED");
      assert.equal(current.paidAt, null);
      assert.equal(current.consumedAt, null);
      assert.equal(current.saleReference, null);
      assert.equal(current.qrText, "retained-qr");
      assert.deepEqual((current.webhookPayload as Record<string, unknown>).checkout, payload.checkout);
      assert.equal((current.webhookPayload as Record<string, unknown>).providerCancellationConfirmed, undefined);
    });
    await t.test("late paid evidence blocks even if an unpaid review exists", async () => {
      await prisma.qPayInvoice.update({ where: { id: invoice.id }, data: { status: "PAID", paidAt: new Date() } });
      assert.deepEqual(await loadUnsettledShiftPayments(prisma, shift), { cardCount: 0, qrCount: 1 });
      assert.equal((await checkExpiredShiftQrPayments(shift)).length, 0);
    });
    await t.test("a mismatched bank response cannot produce an unpaid proof", async () => {
      await prisma.qPayInvoice.update({ where: { id: invoice.id }, data: { status: "EXPIRED", paidAt: null, webhookPayload: payload } });
      provider = { status: "000", entity: { status: null, invoiceNumber: "different-invoice", amount: 100 } };
      assert.equal((await checkExpiredShiftQrPayments(shift)).length, 0);
      assert.deepEqual(await loadUnsettledShiftPayments(prisma, shift), { cardCount: 0, qrCount: 1 });
    });
    await t.test("bank outage leaves the invoice blocked", async () => {
      fail = true;
      await assert.rejects(checkExpiredShiftQrPayments(shift), { status: 503 });
      assert.deepEqual(await loadUnsettledShiftPayments(prisma, shift), { cardCount: 0, qrCount: 1 });
      fail = false;
    });
    await t.test("payment arriving after verification cannot be overwritten by the review", async () => {
      provider = { status: "000", entity: { status: null, invoiceNumber: "provider-invoice", amount: 100 } };
      const proofs = await checkExpiredShiftQrPayments(shift);
      await prisma.qPayInvoice.update({ where: { id: invoice.id }, data: { status: "PAID", paidAt: new Date() } });
      assert.equal(await prisma.$transaction(tx => archiveUnpaidShiftQrPayments(tx, shift, proofs, cashier.id)), 0);
      assert.deepEqual(await loadUnsettledShiftPayments(prisma, shift), { cardCount: 0, qrCount: 1 });
    });
    await t.test("provider-confirmed payment is recorded rather than archived", async () => {
      await prisma.qPayInvoice.update({ where: { id: invoice.id }, data: { status: "PENDING", paidAt: null, webhookPayload: payload } });
      provider = { status: "000", entity: { status: "000", invoiceNumber: "provider-invoice", amount: 100 } };
      assert.equal((await checkExpiredShiftQrPayments(shift)).length, 0);
      assert.equal((await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: invoice.id } })).status, PosQPayStatus.PAID);
      assert.deepEqual(await loadUnsettledShiftPayments(prisma, shift), { cardCount: 0, qrCount: 1 });
    });
  } finally {
    globalThis.fetch = originalFetch;
    await prisma.$disconnect();
  }
});
