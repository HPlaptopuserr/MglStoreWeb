import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { prisma } from "@mgl/database";
import { loadUnsettledShiftPayments } from "./unsettled-shift-payments";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled = process.env.SHIFT_PAYMENT_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_card_recovery_test_");

class RollbackFixtures extends Error {}

test("shift payment guard isolates frozen and legacy paid evidence without blocking unrelated sessions", { skip: !enabled }, async () => {
  try {
    await prisma.$transaction(async (tx) => {
      const token = randomUUID();
      const org = await tx.organization.create({ data: {
        name: "Shift guard test", slug: token, taxId: token, status: "ACTIVE",
      } });
      const cashier = await tx.user.create({ data: { email: `${token}@example.invalid` } });
      const other = await tx.user.create({ data: { email: `other-${token}@example.invalid` } });
      const branch = await tx.branch.create({ data: { organizationId: org.id, name: "Test", address: "Test" } });
      const register = await tx.posRegister.create({ data: {
        organizationId: org.id, branchId: branch.id, name: "Test", mode: "RETAIL",
      } });
      const shift = {
        id: randomUUID(), organizationId: org.id, registerId: register.id,
        cashierId: cashier.id, openedAt: new Date("2026-11-20T00:00:00Z"),
      };
      const current = new Date("2026-11-20T01:00:00Z");
      const card = await tx.cardPaymentAttempt.create({ data: {
        organizationId: org.id, registerId: register.id, terminalId: "test", amount: 100,
        status: "APPROVED", initiatedById: cashier.id, createdAt: current,
      } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 1, qrCount: 0 });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, { ...shift, organizationId: randomUUID() }), { cardCount: 0, qrCount: 0 });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, { ...shift, registerId: randomUUID() }), { cardCount: 0, qrCount: 0 });
      await tx.cardPaymentAttempt.update({ where: { id: card.id }, data: { initiatedById: other.id } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 0, qrCount: 0 });
      await tx.cardPaymentAttempt.update({ where: { id: card.id }, data: { initiatedById: cashier.id, createdAt: new Date("2026-11-19T00:00:00Z") } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 0, qrCount: 0 });
      await tx.cardPaymentAttempt.update({ where: { id: card.id }, data: {
        status: "PENDING", createdAt: current, providerPayload: { checkout: { shiftId: shift.id } },
      } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 1, qrCount: 0 });
      await tx.cardPaymentAttempt.update({ where: { id: card.id }, data: {
        providerPayload: { checkout: { shiftId: "another-shift" } },
      } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 0, qrCount: 0 });
      const qr = await tx.qPayInvoice.create({ data: {
        organizationId: org.id, registerId: register.id, amount: 100, qrText: "test",
        status: "PAID", initiatedById: cashier.id, createdAt: current, expiresAt: current,
      } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 0, qrCount: 1 });
      await tx.qPayInvoice.update({ where: { id: qr.id }, data: { consumedAt: current } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 0, qrCount: 0 });
      await tx.qPayInvoice.update({ where: { id: qr.id }, data: {
        consumedAt: null, status: "PENDING", webhookPayload: { checkout: { shiftId: shift.id } },
      } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 0, qrCount: 1 });
      await tx.qPayInvoice.update({ where: { id: qr.id }, data: {
        webhookPayload: { checkout: { shiftId: "another-shift" } },
      } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 0, qrCount: 0 });
      await tx.qPayInvoice.update({ where: { id: qr.id }, data: {
        status: "EXPIRED", webhookPayload: { checkout: { shiftId: shift.id }, providerCancellationConfirmed: false },
      } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 0, qrCount: 1 });
      await tx.qPayInvoice.update({ where: { id: qr.id }, data: {
        webhookPayload: { checkout: { shiftId: shift.id }, providerCancellationConfirmed: true },
      } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 0, qrCount: 0 });
      await tx.qPayInvoice.update({ where: { id: qr.id }, data: {
        webhookPayload: { checkout: { shiftId: shift.id }, providerCancellationConfirmed: false, cancelledAt: current.toISOString() },
      } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 0, qrCount: 1 });
      await tx.qPayInvoice.update({ where: { id: qr.id }, data: {
        webhookPayload: { checkout: { shiftId: shift.id }, paymentLifecycleReview: { archiveId: "forged-review" } },
      } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 0, qrCount: 1 });
      const review = await tx.auditLog.create({ data: {
        userId: cashier.id, action: "POS_REGISTER_UPDATED", meta: {
          event: "POS_EXPIRED_UNPAID_QR_REVIEW", organizationId: org.id,
          registerId: register.id, shiftId: shift.id, invoiceId: qr.id, providerState: "UNPAID",
        },
      } });
      await tx.qPayInvoice.update({ where: { id: qr.id }, data: {
        webhookPayload: { checkout: { shiftId: shift.id }, paymentLifecycleReview: { archiveId: review.id } },
      } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 0, qrCount: 0 });
      await tx.qPayInvoice.update({ where: { id: qr.id }, data: { status: "PAID" } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 0, qrCount: 1 });
      await tx.qPayInvoice.update({ where: { id: qr.id }, data: { status: "EXPIRED" } });
      await tx.auditLog.update({ where: { id: review.id }, data: { meta: {
        event: "POS_EXPIRED_UNPAID_QR_REVIEW", organizationId: org.id,
        registerId: "another-register", shiftId: shift.id, invoiceId: qr.id, providerState: "UNPAID",
      } } });
      assert.deepEqual(await loadUnsettledShiftPayments(tx, shift), { cardCount: 0, qrCount: 1 });
      throw new RollbackFixtures();
    }, { timeout: 20_000 });
  } catch (error: unknown) {
    if (!(error instanceof RollbackFixtures)) throw error;
  } finally {
    await prisma.$disconnect();
  }
});
