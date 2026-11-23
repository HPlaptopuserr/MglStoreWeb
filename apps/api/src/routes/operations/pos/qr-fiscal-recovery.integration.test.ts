import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import router from "./qr-fiscal-recovery.routes";
import { JWT_SECRET } from "./_shared";
import { processPosQrInvoiceLifecycle } from "../../../services/pos-qpay-lifecycle";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled = process.env.QR_LIFECYCLE_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_card_recovery_test_");

test("pending QR fiscal receipts are organization-scoped and dispatch claims cannot expire into duplicate tax receipts", { skip: !enabled }, async t => {
  const token = randomUUID();
  const organization = await prisma.organization.create({ data: { name: "Fiscal claim test", slug: token, taxId: token, status: "ACTIVE" } });
  const foreignOrg = await prisma.organization.create({ data: { name: "Foreign claim test", slug: `${token}-other`, taxId: `${token}-other`, status: "ACTIVE" } });
  const user = await prisma.user.create({ data: { email: `${token}@example.invalid` } });
  const colleague = await prisma.user.create({ data: { email: `${token}-colleague@example.invalid` } });
  const foreignUser = await prisma.user.create({ data: { email: `${token}-foreign@example.invalid` } });
  for (const [userId, organizationId] of [[user.id, organization.id], [colleague.id, organization.id], [foreignUser.id, foreignOrg.id]]) {
    await prisma.organizationMember.create({ data: { organizationId, userId, role: "STAFF", capabilities: ["POS_CASHIER"], isPrimary: true } });
  }
  const branch = await prisma.branch.create({ data: { organizationId: organization.id, name: "Test", address: "Test" } });
  const register = await prisma.posRegister.create({ data: { organizationId: organization.id, branchId: branch.id, name: "Test",
    activationStatus: "APPROVED", isActive: true, ebarimtEnabled: true } });
  const shift = await prisma.posShift.create({ data: { organizationId: organization.id, branchId: branch.id, registerId: register.id,
    cashierId: user.id, openingCash: 0 } });
  const fixture = async () => {
    const product = await prisma.product.create({ data: { organizationId: organization.id, name: "QR product", price: 100, stock: 3 } });
    const clientSaleId = randomUUID();
    const invoice = await prisma.qPayInvoice.create({ data: { organizationId: organization.id, registerId: register.id,
      initiatedById: user.id, amount: 100, qrText: "qr", status: "PAID", paidAt: new Date(Date.now() - 30_000),
      expiresAt: new Date(Date.now() - 60_000), webhookPayload: { provider: "SYSTEMQR", providerInvoiceId: randomUUID(),
        checkout: { clientSaleId, branchId: branch.id, shiftId: shift.id, autoFinalizeEligible: true,
          lines: [{ productId: product.id, qty: 1, unitPrice: 100, discountAmount: 0 }] } } } });
    await processPosQrInvoiceLifecycle(invoice.id);
    const saved = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
    const completed = (saved.webhookPayload as Prisma.JsonObject).completedSale as Prisma.JsonObject;
    assert.equal(typeof completed.saleId, "string");
    return { invoiceId: invoice.id, saleId: String(completed.saleId), clientSaleId };
  };
  const first = await fixture(); const second = await fixture();
  const app = express(); app.use(express.json(), router);
  const server = createServer(app); server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/pos/payments/qpay/pending-receipts`;
  const headers = (userId = user.id, organizationId = organization.id) => ({ "Content-Type": "application/json",
    Authorization: `Bearer ${jwt.sign({ userId, organizationId }, JWT_SECRET)}` });
  const claim = (invoiceId: string, saleId: string, requestId: string, userId = user.id, organizationId = organization.id) =>
    fetch(`${base}/${invoiceId}/claim`, { method: "POST", headers: headers(userId, organizationId), body: JSON.stringify({ saleId, requestId }) });
  try {
    await t.test("anonymous and foreign-organization callers cannot list or claim fiscal work", async () => {
      assert.equal((await fetch(`${base}?registerId=${register.id}`)).status, 401);
      assert.equal((await fetch(`${base}?registerId=${register.id}`, { headers: headers(foreignUser.id, foreignOrg.id) })).status, 403);
      assert.equal((await claim(first.invoiceId, first.saleId, randomUUID(), foreignUser.id, foreignOrg.id)).status, 403);
      const response = await fetch(`${base}?registerId=${register.id}`, { headers: headers() });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      const body = await response.json() as { receipts: { invoiceId: string; receipt: { id: string } }[] };
      assert.deepEqual(new Set(body.receipts.map(item => item.invoiceId)), new Set([first.invoiceId, second.invoiceId]));
      assert.equal(body.receipts.find(item => item.invoiceId === first.invoiceId)?.receipt.id, first.saleId);
    });
    await t.test("a different sale cannot borrow another invoice's dispatch claim", async () => {
      assert.equal((await claim(first.invoiceId, second.saleId, randomUUID())).status, 409);
    });
    let winningRequest = "";
    let winningClaim = "";
    await t.test("simultaneous windows with distinct request IDs produce exactly one durable claim", async () => {
      const requestIds = [randomUUID(), randomUUID()];
      const results = await Promise.all(requestIds.map(id => claim(first.invoiceId, first.saleId, id)));
      assert.deepEqual(results.map(response => response.status).sort(), [200, 409]);
      const index = results.findIndex(response => response.status === 200);
      winningRequest = requestIds[index]!;
      const body = await results[index]!.json() as { claimId: string; claimed: boolean };
      assert.equal(body.claimed, true);
      winningClaim = body.claimId;
      assert.equal(await prisma.auditLog.count({ where: { AND: [
        { meta: { path: ["event"], equals: "POS_FISCAL_DISPATCH_CLAIM" } },
        { meta: { path: ["saleId"], equals: first.saleId } },
      ] } }), 1);
    });
    await t.test("only the original actor with the same request can resume a saved local result", async () => {
      const same = await claim(first.invoiceId, first.saleId, winningRequest);
      assert.equal(same.status, 200);
      assert.equal((await same.json() as { claimId: string }).claimId, winningClaim);
      assert.equal((await claim(first.invoiceId, first.saleId, winningRequest, colleague.id)).status, 409);
    });
    await t.test("uncertain dispatch claims do not expire into an automatic second fiscal dispatch", async () => {
      await prisma.auditLog.update({ where: { id: winningClaim }, data: { createdAt: new Date("2020-01-01T00:00:00Z") } });
      assert.equal((await claim(first.invoiceId, first.saleId, randomUUID())).status, 409);
      assert.equal((await claim(first.invoiceId, first.saleId, winningRequest)).status, 200);
    });
    await t.test("successful fiscal attachment suppresses the queue and returns the original receipt", async () => {
      await prisma.posSale.update({ where: { id: first.saleId }, data: { ebarimtStatus: "SUCCESS" } });
      const response = await claim(first.invoiceId, first.saleId, randomUUID());
      assert.equal(response.status, 200);
      const body = await response.json() as { alreadyIssued: boolean; receipt: { id: string } };
      assert.equal(body.alreadyIssued, true);
      assert.equal(body.receipt.id, first.saleId);
      const list = await (await fetch(`${base}?registerId=${register.id}`, { headers: headers() })).json() as { receipts: { invoiceId: string }[] };
      assert.ok(!list.receipts.some(receipt => receipt.invoiceId === first.invoiceId));
      assert.ok(list.receipts.some(receipt => receipt.invoiceId === second.invoiceId));
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
});
