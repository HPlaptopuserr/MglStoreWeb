import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import qpayRoutes from "./qpay.routes";
import salesRoutes from "./sales.routes";
import { JWT_SECRET } from "./_shared";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled = process.env.RECURRING_QR_RECOVERY_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_card_recovery_test_");
async function listen(server: Server): Promise<string> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}
async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

test("failed provider cancellation cannot detach an 8300 frozen QR and recovery restores the original payment", { skip: !enabled }, async (t) => {
  let paid = false;
  let invoiceCalls = 0;
  let providerChecks = 0;
  const provider = express();
  provider.use(express.json());
  provider.use((req, res) => {
    if (req.path === "/login") return res.json({ status: "000", entity: "test-token" });
    if (req.path === "/subMerchant/createInvoice") {
      invoiceCalls += 1;
      return res.json({ status: "000", entity: { invoiceNumber: `provider-${req.body.referenceNumber}`, mainQr: `QR-${req.body.referenceNumber}`, deeplinkList: [] } });
    }
    if (req.path === "/subMerchant/checkInvoice") {
      providerChecks += 1;
      return res.json({ status: "000", entity: { status: paid ? "000" : null, invoiceNumber: req.body.invoiceNumber, amount: 8300 } });
    }
    if (req.path.endsWith("/cancelQr")) return res.json({ status: "101", message: "Cancellation unavailable" });
    return res.status(500).json({ message: "Unexpected provider operation" });
  });
  const providerServer = createServer(provider);
  const providerUrl = await listen(providerServer);
  const envKeys = ["SYSTEMQR_BASE_URL", "SYSTEMQR_DEEPLINK_URL", "SYSTEMQR_USERNAME", "SYSTEMQR_PASSWORD"] as const;
  const previous = envKeys.map(key => process.env[key]);
  process.env.SYSTEMQR_BASE_URL = providerUrl;
  process.env.SYSTEMQR_DEEPLINK_URL = providerUrl;
  process.env.SYSTEMQR_USERNAME = `qr-regression-${randomUUID()}`;
  process.env.SYSTEMQR_PASSWORD = "local-test-password";
  const app = express();
  app.use(express.json(), qpayRoutes, salesRoutes);
  const server = createServer(app);
  const base = await listen(server);
  try {
    const key = randomUUID();
    const organization = await prisma.organization.create({ data: { name: "Recurring QR test", slug: key, taxId: key, status: "ACTIVE" } });
    const user = await prisma.user.create({ data: { email: `${key}@qr-regression.invalid` } });
    await prisma.organizationMember.create({ data: { organizationId: organization.id, userId: user.id, role: "STAFF", capabilities: ["POS_CASHIER"], isPrimary: true } });
    const branch = await prisma.branch.create({ data: { organizationId: organization.id, name: "Test", address: "Test" } });
    const register = await prisma.posRegister.create({ data: { organizationId: organization.id, branchId: branch.id, name: "Test", isActive: true, activationStatus: "APPROVED", qpayEnabled: true, qpayMerchantId: `merchant-${key}`, qpayTerminalId: "SYSTEMQR" } });
    const shift = await prisma.posShift.create({ data: { organizationId: organization.id, branchId: branch.id, registerId: register.id, cashierId: user.id, openingCash: 0 } });
    const product = await prisma.product.create({ data: { organizationId: organization.id, name: "8300 basket", price: 8300, stock: 1 } });
    const clientSaleId = randomUUID();
    const checkout = { clientSaleId, branchId: branch.id, shiftId: shift.id, lines: [{ productId: product.id, qty: 1, unitPrice: 8300, discountAmount: 0, priceType: "UNIT" }] };
    const headers = { Authorization: `Bearer ${jwt.sign({ userId: user.id, organizationId: organization.id }, JWT_SECRET)}`, "Content-Type": "application/json" };
    const post = (path: string, body: object, auth = headers) => fetch(`${base}${path}`, { method: "POST", headers: auth, body: JSON.stringify(body) });
    const requestId = randomUUID();
    const invoiceBody = { requestId, organizationId: organization.id, registerId: register.id, amount: 8300, checkout };
    const created = await post("/pos/payments/qpay/invoice", invoiceBody);
    assert.equal(created.status, 201, await created.clone().text());
    assert.equal((await created.json() as { invoiceId: string }).invoiceId, requestId);
    assert.equal(invoiceCalls, 1);
    await t.test("frozen cancellation without client proof flag requires actual provider acknowledgement", async () => {
      const cancel = await post("/pos/payments/qpay/cancel", { invoiceId: requestId });
      assert.ok(cancel.status >= 400, `frozen invoice was detached with HTTP ${cancel.status}: ${await cancel.text()}`);
      const stored = await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: requestId } });
      assert.equal(stored.status, "PENDING", "a failed cancellation must not mark a frozen checkout abandoned");
      const metadata = stored.webhookPayload;
      assert.ok(metadata && typeof metadata === "object" && !Array.isArray(metadata));
      assert.equal(metadata.checkoutAbandonedAt, undefined);
      assert.equal(metadata.cancelledAt, undefined);
      assert.equal(stored.consumedAt, null);
      assert.equal(await prisma.posCardStockReservation.count({ where: { productId: product.id } }), 1);
    });
    await t.test("a second QR for the same basket is rejected before calling the provider", async () => {
      const next = await post("/pos/payments/qpay/invoice", { ...invoiceBody, requestId: randomUUID() });
      assert.equal(next.status, 409, await next.clone().text());
      assert.equal((await next.json() as { code: string }).code, "QPAY_CHECKOUT_RECONCILIATION_REQUIRED");
      assert.equal(invoiceCalls, 1);
    });
    // Reproduce a browser that lost its ledger while invoice A remained unresolved.
    await prisma.qPayInvoice.update({ where: { id: requestId }, data: { status: "EXPIRED", expiresAt: new Date(Date.now() - 1000) } });
    await t.test("recovery returns an expired original frozen invoice and rejects foreign access", async () => {
      const checksBefore = providerChecks;
      const response = await fetch(`${base}/pos/payments/qpay/recovery?registerId=${register.id}&clientSaleId=${clientSaleId}`, { headers });
      assert.equal(response.status, 200, await response.clone().text());
      const result = await response.json() as { invoices: { invoiceId: string; checkout: { clientSaleId: string } }[] };
      const recovered = result.invoices.find(invoice => invoice.invoiceId === requestId);
      assert.ok(recovered, "the server must return the original expired invoice when the client ledger is empty");
      assert.equal(recovered.checkout.clientSaleId, clientSaleId);
      assert.equal(providerChecks, checksBefore, "ledger recovery reads stored evidence without a bank call");
      const wrongCheckout = await fetch(`${base}/pos/payments/qpay/recovery?registerId=${register.id}&clientSaleId=${randomUUID()}`, { headers });
      assert.deepEqual(await wrongCheckout.json(), { invoices: [] });
      const sameOrgRegister = await prisma.posRegister.create({ data: { organizationId: organization.id, branchId: branch.id, name: "Different register", isActive: true, activationStatus: "APPROVED" } });
      const wrongRegister = await fetch(`${base}/pos/payments/qpay/recovery?registerId=${sameOrgRegister.id}&clientSaleId=${clientSaleId}`, { headers });
      assert.deepEqual(await wrongRegister.json(), { invoices: [] });
      assert.equal((await fetch(`${base}/pos/payments/qpay/recovery?registerId=${register.id}&clientSaleId=${clientSaleId}`)).status, 401);

      const foreignOrg = await prisma.organization.create({ data: { name: "Other", slug: randomUUID(), taxId: randomUUID(), status: "ACTIVE" } });
      const foreignBranch = await prisma.branch.create({ data: { organizationId: foreignOrg.id, name: "Other", address: "Other" } });
      const foreignRegister = await prisma.posRegister.create({ data: { organizationId: foreignOrg.id, branchId: foreignBranch.id, name: "Other", isActive: true, activationStatus: "APPROVED" } });
      assert.equal((await fetch(`${base}/pos/payments/qpay/recovery?registerId=${foreignRegister.id}&clientSaleId=${clientSaleId}`, { headers })).status, 403);
      const otherHeaders = { ...headers, Authorization: `Bearer ${jwt.sign({ userId: user.id, organizationId: foreignOrg.id }, JWT_SECRET)}` };
      assert.equal((await fetch(`${base}/pos/payments/qpay/recovery?registerId=${register.id}&clientSaleId=${clientSaleId}`, { headers: otherHeaders })).status, 403);
    });
    await t.test("late payment reconciles the original invoice and creates exactly one original sale", async () => {
      paid = true;
      const status = await fetch(`${base}/pos/payments/qpay/status/${requestId}?refresh=1`, { headers });
      assert.equal(status.status, 200, await status.clone().text());
      assert.equal((await status.json() as { status: string }).status, "PAID");
      const sale = { ...checkout, organizationId: organization.id, registerId: register.id, paymentMethod: "QR", paymentBreakdown: [{ method: "QR", amount: 8300, invoiceId: requestId }] };
      const first = await post("/pos/sales", sale);
      assert.equal(first.status, 201, await first.clone().text());
      const receipt = await first.json() as { id: string; receiptNo: string };
      const retry = await post("/pos/sales", sale);
      assert.equal(retry.status, 200, await retry.clone().text());
      assert.equal((await retry.json() as { id: string }).id, receipt.id);
      assert.equal(await prisma.posSale.count({ where: { organizationId: organization.id } }), 1);
      assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 0);
      assert.equal((await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: requestId } })).saleReference, receipt.receiptNo);
      assert.equal(invoiceCalls, 1);
      const consumedRecovery = await fetch(`${base}/pos/payments/qpay/recovery?registerId=${register.id}&clientSaleId=${clientSaleId}`, { headers });
      assert.deepEqual(await consumedRecovery.json(), { invoices: [] });
    });
    await t.test("legacy invoices without a frozen checkout retain unpaid cancellation compatibility", async () => {
      paid = false;
      const legacy = await post("/pos/payments/qpay/invoice", { requestId: randomUUID(), organizationId: organization.id, registerId: register.id, amount: 8300 });
      assert.equal(legacy.status, 201, await legacy.clone().text());
      const legacyId = (await legacy.json() as { invoiceId: string }).invoiceId;
      const cancelled = await post("/pos/payments/qpay/cancel", { invoiceId: legacyId });
      assert.equal(cancelled.status, 200, await cancelled.clone().text());
      assert.equal((await cancelled.json() as { providerCancellationConfirmed: boolean }).providerCancellationConfirmed, false);
      assert.equal((await prisma.qPayInvoice.findUniqueOrThrow({ where: { id: legacyId } })).status, "EXPIRED");
    });
  } finally {
    envKeys.forEach((key, index) => { const value = previous[index]; if (value === undefined) delete process.env[key]; else process.env[key] = value; });
    await close(server);
    await close(providerServer);
    await prisma.$disconnect();
  }
});
