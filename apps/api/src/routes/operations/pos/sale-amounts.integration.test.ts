import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import salesRoutes from "./sales.routes";
import { JWT_SECRET } from "./_shared";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled = process.env.SALE_AMOUNTS_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_card_recovery_test_");

test("cash, credit and tax amounts preserve sale totals and retries without contacting a provider", { skip: !enabled }, async (t) => {
  const app = express();
  app.use(express.json());
  app.use(salesRoutes);
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const key = randomUUID();
    const organization = await prisma.organization.create({ data: { name: "Amount test", slug: key, taxId: key, status: "ACTIVE" } });
    const cashier = await prisma.user.create({ data: { email: `${key}@amounts.invalid` } });
    await prisma.organizationMember.create({ data: { userId: cashier.id, organizationId: organization.id, role: "STAFF", capabilities: ["POS_CASHIER"], isPrimary: true } });
    const branch = await prisma.branch.create({ data: { organizationId: organization.id, name: "Test", address: "Test" } });
    const register = await prisma.posRegister.create({ data: { organizationId: organization.id, branchId: branch.id, name: "Test", activationStatus: "APPROVED", isActive: true } });
    const shift = await prisma.posShift.create({ data: { organizationId: organization.id, branchId: branch.id, registerId: register.id, cashierId: cashier.id, openingCash: 0 } });
    const product = await prisma.product.create({ data: { organizationId: organization.id, name: "City-tax product", price: 1111, cityTaxRate: 1, taxType: "VAT_ABLE", stock: 10 } });
    const headers = { Authorization: `Bearer ${jwt.sign({ userId: cashier.id, organizationId: organization.id }, JWT_SECRET)}`, "Content-Type": "application/json" };
    const sale = {
      organizationId: organization.id, branchId: branch.id, registerId: register.id, shiftId: shift.id,
      lines: [{ productId: product.id, qty: 1, unitPrice: 1111, discountAmount: 0 }],
    };
    const submit = (body: object) => fetch(`${base}/pos/sales`, { method: "POST", headers, body: JSON.stringify(body) });
    await t.test("overpaid cash records net revenue and recomputes change, then retries once", async () => {
      const body = { ...sale, clientSaleId: randomUUID(), paymentMethod: "CASH", paymentBreakdown: [{ method: "CASH", amount: 1111, cash: { receivedAmount: 2000, changeAmount: 0 } }] };
      const first = await submit(body);
      assert.equal(first.status, 201, await first.clone().text());
      const receipt = await first.json() as { id: string; grandTotal: number; taxTotal: number; lines: { cityTaxAmount: number; taxAmount: number }[]; paymentBreakdown: { amount: number; cash: { receivedAmount: number; changeAmount: number } }[] };
      assert.equal(receipt.grandTotal, 1111);
      assert.equal(receipt.lines[0]?.cityTaxAmount, 11);
      assert.equal(receipt.lines[0]?.taxAmount, 100);
      assert.equal(receipt.taxTotal, 100);
      assert.deepEqual(receipt.paymentBreakdown[0], { method: "CASH", amount: 1111, cash: { receivedAmount: 2000, changeAmount: 889 } });
      const attach = (payload: object) => fetch(`${base}/pos/sales/${receipt.id}/ebarimt`, {
        method: "POST", headers, body: JSON.stringify(payload),
      });
      const invalidTotal = await attach({ status: "SUCCESS", billId: "wrong", payload: { totalAmount: 1112 } });
      assert.equal(invalidTotal.status, 409);
      assert.equal((await prisma.posSale.findUniqueOrThrow({ where: { id: receipt.id } })).ebarimtStatus, null);
      const invalidPayments = await attach({ status: "SUCCESS", billId: "wrong", payload: { totalAmount: 1111, payments: [{ paidAmount: 1110 }] } });
      assert.equal(invalidPayments.status, 409);
      const attached = await attach({ status: "SUCCESS", billId: "fiscal-test", payload: { totalAmount: 1111, totalVAT: 100, totalCityTax: 11, payments: [{ paidAmount: 1111 }] } });
      assert.equal(attached.status, 200, await attached.clone().text());
      const lateFailure = await attach({ status: "FAILED", error: "late network failure" });
      assert.equal(lateFailure.status, 200);
      const saved = await prisma.posSale.findUniqueOrThrow({ where: { id: receipt.id } });
      assert.equal(saved.ebarimtStatus, "SUCCESS");
      assert.equal(saved.ebarimtBillId, "fiscal-test");
      const retry = await submit(body);
      assert.equal(retry.status, 200);
      const retried = await retry.json() as { id: string; ebarimt: { status: string; billId: string; totalVAT: number; totalCityTax: number } };
      assert.equal(retried.id, receipt.id);
      assert.equal(retried.ebarimt.status, "SUCCESS");
      assert.equal(retried.ebarimt.billId, "fiscal-test");
      assert.equal(retried.ebarimt.totalVAT, 100);
      assert.equal(retried.ebarimt.totalCityTax, 11);
      const differentBill = await attach({ status: "SUCCESS", billId: "different-fiscal-bill", payload: { totalAmount: 1111 } });
      assert.equal(differentBill.status, 409);
      assert.equal((await differentBill.json() as { code: string }).code, "FISCAL_IDENTITY_MISMATCH");
      assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 9);
    });
    await t.test("multiple weighted half-cent lines and unit discounts preserve checkout, DB and fiscal totals", async () => {
      const first = await prisma.product.create({ data: { organizationId: organization.id, name: "Fractional first", unit: "kg", price: 1.5, taxType: "VAT_ABLE", stock: 1000 } });
      const second = await prisma.product.create({ data: { organizationId: organization.id, name: "Fractional second", unit: "kg", price: 1.5, taxType: "VAT_ABLE", stock: 1000 } });
      for (const discountAmount of [0, 0.5]) {
        const total = discountAmount ? 0.02 : 0.04;
        const body = { ...sale, clientSaleId: randomUUID(), paymentMethod: "CASH", paymentBreakdown: [{ method: "CASH", amount: total }], lines: [first, second].map(item => ({ productId: item.id, qty: 0.01, unitPrice: 1.5, discountAmount })) };
        const response = await submit(body);
        assert.equal(response.status, 201, await response.clone().text());
        const receipt = await response.json() as { id: string; grandTotal: number; subTotal: number; discountTotal: number; lines: { lineTotal: number }[] };
        assert.equal(receipt.grandTotal, total);
        assert.equal(receipt.subTotal, 0.04);
        assert.equal(receipt.discountTotal, discountAmount ? 0.02 : 0);
        const stored = await prisma.posSale.findUniqueOrThrow({ where: { id: receipt.id }, include: { lines: true } });
        assert.equal(stored.lines.reduce((sum, line) => sum + Math.round(Number(line.lineTotal) * 100), 0), Math.round(Number(stored.grandTotal) * 100));
        const attached = await fetch(`${base}/pos/sales/${receipt.id}/ebarimt`, { method: "POST", headers, body: JSON.stringify({ status: "SUCCESS", billId: randomUUID(), payload: { totalAmount: total, totalVAT: 0, totalCityTax: 0, payments: [{ paidAmount: total }] } }) });
        assert.equal(attached.status, 200, await attached.text());
      }
    });
    const credit = { targetType: "CUSTOMER", borrowerId: "borrower", borrowerName: "Test borrower", monthlyInterestRate: 0.012, termMonths: 1, totalDue: 1111 };
    await t.test("cash and credit split records only the principal as debt and preserves gross sale", async () => {
      const response = await submit({ ...sale, clientSaleId: randomUUID(), paymentMethod: "MIXED", paymentBreakdown: [{ method: "CASH", amount: 111, cash: { receivedAmount: 111 } }, { method: "CREDIT", amount: 1000, credit }] });
      assert.equal(response.status, 201, await response.clone().text());
      const receipt = await response.json() as { id: string; grandTotal: number };
      assert.equal(receipt.grandTotal, 1111);
      const debt = await prisma.posCreditSale.findUniqueOrThrow({ where: { saleId: receipt.id } });
      assert.equal(Number(debt.principalAmount), 1000);
      assert.equal(Number(debt.totalDue), 1000);
      assert.equal(debt.borrowerId, "borrower");
    });
    await t.test("multiple borrowers and mismatched totals fail before reducing stock", async () => {
      const before = (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock;
      const multiple = await submit({ ...sale, clientSaleId: randomUUID(), paymentMethod: "CREDIT", paymentBreakdown: [{ method: "CREDIT", amount: 500, credit }, { method: "CREDIT", amount: 611, credit: { ...credit, borrowerId: "another" } }] });
      assert.equal(multiple.status, 400, await multiple.text());
      const mismatched = await submit({ ...sale, clientSaleId: randomUUID(), paymentMethod: "CASH", paymentBreakdown: [{ method: "CASH", amount: 1110 }] });
      assert.equal(mismatched.status, 400, await mismatched.text());
      assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, before);
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
});
