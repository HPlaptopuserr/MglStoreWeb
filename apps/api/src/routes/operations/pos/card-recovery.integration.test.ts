import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import recoveryRoutes from "./card-recovery.routes";
import cardRoutes from "./card-payments.routes";
import salesRoutes from "./sales.routes";
import registerRoutes from "./registers.routes";
import { JWT_SECRET, pushEcrApiKey, pushEcrClientId } from "./_shared";
import { cardRecoveryDayRange } from "../../../services/card-payment-recovery";
import { reconcileMinuCardAttempt, reconcilePendingMinuCards } from "../../../services/minu-card-reconciliation";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled =
  process.env.CARD_RECOVERY_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_card_recovery_test_");

async function listen(server: Server): Promise<string> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test server address");
  return `http://127.0.0.1:${address.port}`;
}
async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

test("recovery dates use Ulaanbaatar day boundaries and reject invalid dates", () => {
  const range = cardRecoveryDayRange("2026-10-28");
  assert.equal(range.gte.toISOString(), "2026-10-27T16:00:00.000Z");
  assert.equal(range.lt.toISOString(), "2026-10-28T16:00:00.000Z");
  for (const value of [
    "2026-02-30",
    "2026-13-01",
    "",
    undefined,
    "2026-10-28T00:00:00Z",
  ])
    assert.throws(() => cardRecoveryDayRange(value));
});

test(
  "cashier recovery verifies Minu without charging and stock is deducted once by a standard sale",
  { skip: !enabled },
  async (t) => {
    let paid = false;
    let providerUnavailable = false;
    let omitRrn = false;
    let wrongInvoice = false;
    let allowInvoice = false;
    let terminalDeclined = false;
    let observedCancellation = false;
    let insufficientFunds = false;
    let terminalRefusal: string | undefined;
    let invoiceCalls = 0;
    let loginUnavailable = false;
    let loseInvoiceResponse = false;
    const providerCalls: string[] = [];
    const provider = express();
    provider.use(express.json());
    provider.use((req, res) => {
      providerCalls.push(req.path);
      if (req.path === "/agent/login")
        return loginUnavailable ? res.status(503).json({ message: "Login unavailable" })
          : res.json({ status: "000", entity: "test-token" });
      if (req.path === "/agent/invoice" && allowInvoice) {
        invoiceCalls += 1;
        if (loseInvoiceResponse) return req.socket.destroy();
        return res.json({ status: "000", message: "Successful" });
      }
      if (req.path !== "/agent/checkTxn")
        return res
          .status(500)
          .json({ message: "NEW CHARGES ARE FORBIDDEN IN RECOVERY" });
      if (providerUnavailable)
        return res.status(503).json({ message: "Unavailable" });
      return res.json({
        status: "000",
        entity: {
          invoice: wrongInvoice ? "different-invoice" : req.body.invoice,
          status: terminalDeclined ? "DECLINED" : paid ? "000" : "10",
          rrn: paid && !omitRrn ? "123456789012" : null,
          error: terminalDeclined ? "DECLINED" : paid ? "false" : "true",
          message: terminalRefusal ?? (insufficientFunds ? "Үлдэгдэл хүрээгүй" : observedCancellation ? "Гүйлгээ цуцлагдлаа" : paid ? "Гүйлгээ амжилттай" : undefined),
          cardNo: "DO-NOT-EXPOSE",
        },
      });
    });
    const providerServer = createServer(provider);
    const previousMinuUrl = process.env.MINU_AGENT_BASE_URL;
    process.env.MINU_AGENT_BASE_URL = await listen(providerServer);
    const app = express();
    app.use(express.json());
    app.use(recoveryRoutes);
    app.use(cardRoutes);
    app.use(salesRoutes);
    app.use(registerRoutes);
    const server = createServer(app);
    const base = await listen(server);
    try {
      const organization = await prisma.organization.create({
        data: {
          name: "Recovery test",
          slug: "recovery-test",
          taxId: "recovery-test",
          status: "ACTIVE",
          minuAgentEnabled: true,
          minuAgentUsername: "test-user",
          minuAgentPassword: "test-password",
          minuAgentBranchId: "1",
        },
      });
      const user = await prisma.user.create({
        data: { email: "cashier@recovery.invalid", role: "USER" },
      });
      await prisma.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "STAFF",
          capabilities: ["POS_CASHIER"],
          isPrimary: true,
        },
      });
      const branch = await prisma.branch.create({
        data: {
          organizationId: organization.id,
          name: "Test",
          address: "Test",
        },
      });
      const register = await prisma.posRegister.create({
        data: {
          organizationId: organization.id,
          branchId: branch.id,
          name: "Test",
          isActive: true,
          activationStatus: "APPROVED",
          cardProviderType: "MINU_AGENT",
        },
      });
      const shift = await prisma.posShift.create({
        data: {
          organizationId: organization.id,
          branchId: branch.id,
          registerId: register.id,
          cashierId: user.id,
          openingCash: 0,
        },
      });
      const product = await prisma.product.create({
        data: {
          organizationId: organization.id,
          name: "Test product",
          price: 19570,
          stock: 1,
        },
      });
      const attempt = await prisma.cardPaymentAttempt.create({
        data: {
          organizationId: organization.id,
          registerId: register.id,
          terminalId: "TEST-TERMINAL",
          amount: 39140,
          status: "PENDING",
          providerPayload: {
            provider: "MINU_AGENT",
            invoice: "recovery-invoice",
          },
        },
      });
      const token = jwt.sign(
        { userId: user.id, organizationId: organization.id },
        JWT_SECRET,
      );
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      const path = `/pos/payments/card/recovery/${attempt.id}/verify`;
      const verify = (amount = 39140) =>
        fetch(`${base}${path}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ registerId: register.id, amount }),
        });
      const saleBody = {
        organizationId: organization.id,
        registerId: register.id,
        branchId: branch.id,
        shiftId: shift.id,
        clientSaleId: "card-recovery-test",
        paymentMethod: "CARD",
        paymentBreakdown: [
          { method: "CARD", amount: 39140, attemptId: attempt.id },
        ],
        lines: [
          {
            productId: product.id,
            qty: 2,
            unitPrice: 19570,
            discountAmount: 0,
            taxRate: 0,
          },
        ],
      };
      const sell = (body = saleBody) =>
        fetch(`${base}/pos/sales`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
      const stock = async () =>
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
          .stock;
      const sales = () =>
        prisma.posSale.count({ where: { organizationId: organization.id } });
      const untouched = async () => {
        assert.equal(await stock(), 1);
        assert.equal(await sales(), 0);
        assert.equal(
          (
            await prisma.cardPaymentAttempt.findUniqueOrThrow({
              where: { id: attempt.id },
            })
          ).consumedAt,
          null,
        );
      };

      await t.test(
        "anonymous and cross-organization access is refused",
        async () => {
          const date = new Date(Date.now() + 8 * 3600000)
            .toISOString()
            .slice(0, 10);
          assert.equal(
            (
              await fetch(
                `${base}/pos/payments/card/recovery?registerId=${register.id}&date=${date}`,
              )
            ).status,
            401,
          );
          const otherOrg = await prisma.organization.create({
            data: {
              name: "Other",
              slug: "other",
              taxId: "other",
              status: "ACTIVE",
            },
          });
          const otherBranch = await prisma.branch.create({
            data: {
              organizationId: otherOrg.id,
              name: "Other",
              address: "Test",
            },
          });
          const otherRegister = await prisma.posRegister.create({
            data: {
              organizationId: otherOrg.id,
              branchId: otherBranch.id,
              name: "Other",
              isActive: true,
              activationStatus: "APPROVED",
            },
          });
          assert.equal(
            (
              await fetch(
                `${base}/pos/payments/card/recovery?registerId=${otherRegister.id}&date=${date}`,
                { headers },
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await fetch(`${base}${path}`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  registerId: otherRegister.id,
                  amount: 39140,
                }),
              })
            ).status,
            403,
          );
          const result = await fetch(
            `${base}/pos/payments/card/recovery?registerId=${register.id}&date=${date}`,
            { headers },
          );
          assert.equal(result.status, 200);
          const text = await result.text();
          assert.ok(text.includes(attempt.id));
          assert.ok(!text.includes("test-password"));
          await untouched();
        },
      );
      await t.test(
        "amount mismatch, failed payment and provider outage leave inventory untouched",
        async () => {
          assert.equal((await verify(39150)).status, 400);
          assert.equal((await verify()).status, 409);
          providerUnavailable = true;
          assert.equal((await verify()).status, 502);
          providerUnavailable = false;
          assert.equal(
            (
              await prisma.cardPaymentAttempt.findUniqueOrThrow({
                where: { id: attempt.id },
              })
            ).status,
            "PENDING",
          );
          await untouched();
        },
      );
      await t.test(
        "Minu-approved reference can be attached without a sale or stock movement",
        async () => {
          paid = true;
          const response = await verify();
          assert.equal(response.status, 200);
          const body = await response.text();
          assert.ok(body.includes("123456789012"));
          assert.ok(!body.includes("DO-NOT-EXPOSE"));
          assert.equal(
            (
              await prisma.cardPaymentAttempt.findUniqueOrThrow({
                where: { id: attempt.id },
              })
            ).status,
            "APPROVED",
          );
          await untouched();
        },
      );
      await t.test(
        "insufficient stock rolls back the sale and payment consumption together",
        async () => {
          const result = await sell();
          assert.ok(result.status >= 400, await result.text());
          await untouched();
          assert.equal(
            await prisma.inventoryLedger.count({
              where: { productId: product.id },
            }),
            0,
          );
          await prisma.product.update({
            where: { id: product.id },
            data: { stock: 10 },
          });
        },
      );
      await t.test(
        "a sale taking over five seconds records the paid card and deducts stock once",
        async () => {
          // Reproduce the production P2028 failure in this disposable DB only.
          await prisma.$executeRawUnsafe(`
            CREATE FUNCTION test_card_recovery_slow_sale() RETURNS trigger
            LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(6); RETURN NEW; END $$
          `);
          try {
            await prisma.$executeRawUnsafe(`
              CREATE TRIGGER test_card_recovery_slow_sale BEFORE INSERT ON "PosSale"
              FOR EACH ROW EXECUTE FUNCTION test_card_recovery_slow_sale()
            `);
            const startedAt = Date.now();
            const result = await sell();
            const body = await result.text();
            assert.equal(result.status, 201, body);
            assert.ok(Date.now() - startedAt >= 6_000);
            assert.ok(body.includes("receiptNo"));
            assert.ok(body.includes("39140"));
            assert.equal(await stock(), 8);
            assert.equal(await sales(), 1);
            assert.ok(
              (
                await prisma.cardPaymentAttempt.findUniqueOrThrow({
                  where: { id: attempt.id },
                })
              ).consumedAt,
            );
          } finally {
            await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS test_card_recovery_slow_sale ON "PosSale"');
            await prisma.$executeRawUnsafe('DROP FUNCTION test_card_recovery_slow_sale()');
          }
        },
      );
      await t.test(
        "idempotent retry and attempts to reuse the payment cannot deduct stock again",
        async () => {
          const retry = await sell();
          assert.equal(retry.status, 200, await retry.text());
          const duplicate = await sell({
            ...saleBody,
            clientSaleId: "another-sale",
          });
          assert.equal(duplicate.status, 409, await duplicate.text());
          assert.equal((await verify()).status, 409);
          assert.equal(await stock(), 8);
          assert.equal(await sales(), 1);
        },
      );
      await t.test(
        "concurrent finalizations consume a verified payment only once",
        async () => {
          const second = await prisma.cardPaymentAttempt.create({
            data: {
              organizationId: organization.id,
              registerId: register.id,
              terminalId: "TEST-TERMINAL",
              amount: 39140,
              status: "APPROVED",
              transactionId: "rrn-second",
              providerPayload: {
                provider: "MINU_AGENT",
                invoice: "second-invoice",
              },
            },
          });
          const results = await Promise.all(
            ["concurrent-a", "concurrent-b"].map((clientSaleId) =>
              sell({
                ...saleBody,
                clientSaleId,
                paymentBreakdown: [
                  { method: "CARD", amount: 39140, attemptId: second.id },
                ],
              }),
            ),
          );
          assert.deepEqual(
            results.map((result) => result.status).sort(),
            [201, 409],
          );
          assert.equal(await stock(), 6);
          assert.equal(await sales(), 2);
        },
      );
      await t.test(
        "10000 mixed sale uses 5000 card, 2000 QR and 3000 cash, waits for bank confirmation and deducts stock once",
        async () => {
          await prisma.product.update({ where: { id: product.id }, data: { price: 10000 } });
          const card = await prisma.cardPaymentAttempt.create({
            data: {
              organizationId: organization.id,
              registerId: register.id,
              terminalId: "TEST-TERMINAL",
              amount: 5000,
              status: "APPROVED",
              transactionId: "test-split-card",
            },
          });
          const qr = await prisma.qPayInvoice.create({
            data: {
              organizationId: organization.id,
              registerId: register.id,
              amount: 2000,
              qrText: "test-split-qr",
              expiresAt: new Date(Date.now() + 60000),
              status: "PENDING",
            },
          });
          const splitBody = {
            ...saleBody,
            clientSaleId: "split-payment-10000",
            paymentMethod: "MIXED",
            lines: [
              {
                productId: product.id,
                qty: 1,
                unitPrice: 10000,
                discountAmount: 0,
                taxRate: 0,
              },
            ],
            paymentBreakdown: [
              { method: "CARD", amount: 5000, attemptId: card.id },
              { method: "QR", amount: 2000, invoiceId: qr.id },
              {
                method: "CASH",
                amount: 3000,
                cash: { receivedAmount: 3000, changeAmount: 0 },
              },
            ],
          };
          const submit = (body: unknown = splitBody) =>
            fetch(`${base}/pos/sales`, {
              method: "POST",
              headers,
              body: JSON.stringify(body),
            });
          const pending = await submit();
          assert.equal(pending.status, 409, await pending.text());
          assert.equal(await stock(), 6);
          assert.equal(
            (
              await prisma.cardPaymentAttempt.findUniqueOrThrow({
                where: { id: card.id },
              })
            ).consumedAt,
            null,
          );
          await prisma.qPayInvoice.update({
            where: { id: qr.id },
            data: {
              status: "PAID",
              paymentId: "test-split-qr-paid",
              paidAt: new Date(),
            },
          });
          for (const amount of [2000, 4000]) {
            const incomplete = await submit({
              ...splitBody,
              paymentBreakdown: splitBody.paymentBreakdown.map((entry) =>
                entry.method === "CASH"
                  ? {
                      ...entry,
                      amount,
                      cash: { receivedAmount: amount, changeAmount: 0 },
                    }
                  : entry,
              ),
            });
            assert.equal(incomplete.status, 400, await incomplete.text());
            assert.equal(await stock(), 6);
          }
          const completed = await submit();
          const text = await completed.text();
          assert.equal(completed.status, 201, text);
          const receipt = JSON.parse(text) as {
            receiptNo: string;
            paymentMethod: string;
            grandTotal: number;
            paymentBreakdown: Array<{
              method: string;
              amount: number;
              cash?: { receivedAmount: number; changeAmount: number };
            }>;
          };
          assert.equal(receipt.paymentMethod, "MIXED");
          assert.equal(receipt.grandTotal, 10000);
          assert.deepEqual(
            receipt.paymentBreakdown.map((entry) => [
              entry.method,
              entry.amount,
            ]),
            [
              ["CARD", 5000],
              ["QPAY", 2000],
              ["CASH", 3000],
            ],
          );
          assert.deepEqual(receipt.paymentBreakdown[2].cash, {
            receivedAmount: 3000,
            changeAmount: 0,
          });
          assert.equal(await stock(), 5);
          assert.equal(await sales(), 3);
          assert.equal(
            (
              await prisma.qPayInvoice.findUniqueOrThrow({
                where: { id: qr.id },
              })
            ).saleReference,
            receipt.receiptNo,
          );
          assert.equal(
            (
              await prisma.cardPaymentAttempt.findUniqueOrThrow({
                where: { id: card.id },
              })
            ).saleReference,
            receipt.receiptNo,
          );
          const retry = await submit();
          assert.equal(retry.status, 200, await retry.text());
          assert.equal(await stock(), 5);
          assert.equal(await sales(), 3);
        },
      );
      assert.ok(providerCalls.length > 0);
      assert.ok(
        providerCalls.every(
          (path) => path === "/agent/login" || path === "/agent/checkTxn",
        ),
        JSON.stringify(providerCalls),
      );
      await t.test("normal status polling completes a late Minu approval without RRN or recovery", async () => {
        omitRrn = true;
        paid = false;
        const card = await prisma.cardPaymentAttempt.create({ data: {
          organizationId: organization.id, registerId: register.id,
          terminalId: "TEST-TERMINAL", amount: 10000, status: "FAILED",
          message: "Invoice response timeout",
          providerPayload: { provider: "MINU_AGENT", invoice: "late-paid-invoice" },
        } });
        const status = () => fetch(`${base}/pos/payments/card/status/${card.id}`, { headers });
        assert.equal((await status()).status, 200);
        assert.equal((await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: card.id } })).status, "PENDING");
        providerUnavailable = true;
        assert.equal((await status()).status, 200);
        assert.equal((await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: card.id } })).status, "PENDING");
        providerUnavailable = false;
        paid = true;
        wrongInvoice = true;
        await status();
        assert.equal((await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: card.id } })).status, "PENDING");
        wrongInvoice = false;
        const response = await status();
        const text = await response.text();
        assert.ok(text.includes('"status":"APPROVED"'), text);
        assert.ok(text.includes('"transactionId":"late-paid-invoice"'), text);
        assert.ok(!text.includes("DO-NOT-EXPOSE"));
        paid = false;
        await reconcileMinuCardAttempt(card);
        assert.equal((await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: card.id } })).status, "APPROVED", "a stale pending response cannot downgrade approval");
        paid = true;
        const beforeStock = await stock();
        const beforeSales = await sales();
        const body = { ...saleBody, clientSaleId: "automatic-card-completion",
          lines: [{ productId: product.id, qty: 1, unitPrice: 10000, discountAmount: 0, taxRate: 0 }],
          paymentBreakdown: [{ method: "CARD", amount: 10000, attemptId: card.id }],
        };
        const submit = () => fetch(`${base}/pos/sales`, { method: "POST", headers, body: JSON.stringify(body) });
        const first = await submit();
        assert.equal(first.status, 201, await first.text());
        const retry = await submit();
        assert.equal(retry.status, 200, await retry.text());
        assert.equal(await stock(), beforeStock - 1);
        assert.equal(await sales(), beforeSales + 1);
        const beforeChecks = providerCalls.length;
        await status();
        assert.equal(providerCalls.length, beforeChecks, "consumed payments never query Minu again");
        assert.ok(providerCalls.every(path => path === "/agent/login" || path === "/agent/checkTxn"));
      });
      await t.test("the server reconciles the original invoice while the browser is offline without creating a sale", async () => {
        const beforeSales = await sales();
        const card = await prisma.cardPaymentAttempt.create({ data: {
          organizationId: organization.id, registerId: register.id,
          terminalId: "TEST-TERMINAL", amount: 6500, status: "PENDING",
          updatedAt: new Date(Date.now() - 60_000),
          providerPayload: { provider: "MINU_AGENT", invoice: "browser-offline-invoice" },
        } });
        await reconcilePendingMinuCards();
        const updated = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: card.id } });
        assert.equal(updated.status, "APPROVED");
        assert.equal(updated.transactionId, "browser-offline-invoice");
        assert.equal(await sales(), beforeSales);
        assert.equal(invoiceCalls, 0, "background checks never charge the terminal");
      });
      await t.test("retrying a client payment identity dispatches only one Minu invoice", async () => {
        allowInvoice = true;
        await prisma.posRegister.update({ where: { id: register.id }, data: { cardEnabled: true, cardTerminalId: "TEST-IDEMPOTENT" } });
        const attemptId = crypto.randomUUID();
        const body = { attemptId, registerId: register.id, organizationId: organization.id, terminalId: "TEST-IDEMPOTENT", amount: 28500 };
        const authorize = (payload: unknown = body) => fetch(`${base}/pos/payments/card/authorize`, { method: "POST", headers, body: JSON.stringify(payload) });
        const response = await authorize();
        assert.equal(response.status, 201, await response.text());
        const row = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: attemptId } });
        assert.ok(JSON.stringify(row.providerPayload).includes("MGL-"), "invoice identity exists before the provider responds");
        const retry = await authorize();
        assert.equal(retry.status, 200, await retry.text());
        assert.equal((await authorize({ ...body, amount: 28501 })).status, 409);
        const result = await fetch(`${base}/pos/payments/card/status/${attemptId}`, { headers });
        assert.equal(result.status, 200);
        assert.equal(invoiceCalls, 1);
      });

      const fixture = async () => {
        const terminalId = crypto.randomUUID();
        const register = await prisma.posRegister.create({ data: { organizationId: organization.id, branchId: branch.id,
          name: terminalId, cardEnabled: true, cardProviderType: "MINU_AGENT", cardTerminalId: terminalId,
          activationStatus: "APPROVED", isActive: true } });
        const shift = await prisma.posShift.create({ data: { organizationId: organization.id, branchId: branch.id,
          registerId: register.id, cashierId: user.id, openingCash: 0 } });
        const product = await prisma.product.create({ data: { organizationId: organization.id, name: "Reserved product", stock: 1, price: 50_000_000 } });
        const clientSaleId = crypto.randomUUID();
        const lines = [{ productId: product.id, qty: 1, unitPrice: 50_000_000, priceType: "UNIT", discountAmount: 0, taxRate: 0 }];
        const body = { attemptId: crypto.randomUUID(), organizationId: organization.id, registerId: register.id,
          terminalId, amount: 50_000_000, checkout: { clientSaleId, branchId: branch.id, shiftId: shift.id, lines } };
        const authorize = (payload: unknown = body) => fetch(`${base}/pos/payments/card/authorize-v2`, { method: "POST", headers, body: JSON.stringify(payload) });
        const legacyAuthorize = (payload: unknown = body) => fetch(`${base}/pos/payments/card/authorize`, { method: "POST", headers, body: JSON.stringify(payload) });
        const status = () => fetch(`${base}/pos/payments/card/status/${body.attemptId}`, { headers });
        const sale = { ...saleBody, clientSaleId, registerId: register.id, shiftId: shift.id, lines,
          paymentBreakdown: [{ method: "CARD", amount: body.amount, attemptId: body.attemptId }] };
        return { body, authorize, legacyAuthorize, status, sale, product, register };
      };

      await t.test("login failure never reserves a terminal or stock and can be retried", async () => {
        const f = await fixture();
        const before = invoiceCalls;
        // A fresh credential avoids the token cached by earlier test fixtures.
        await prisma.organization.update({ where: { id: organization.id }, data: { minuAgentUsername: "login-failure-test" } });
        loginUnavailable = true;
        try {
          const response = await f.authorize();
          assert.equal(response.status, 502);
          assert.equal((await response.json() as { code: string }).code, "CARD_PAYMENT_NOT_STARTED");
          assert.equal(await prisma.cardPaymentAttempt.count({ where: { id: f.body.attemptId } }), 0);
          assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 0);
          assert.equal(invoiceCalls, before);
          loginUnavailable = false;
          assert.equal((await f.authorize()).status, 201);
          await f.status();
          assert.equal(invoiceCalls, before + 1);
        } finally {
          loginUnavailable = false;
          await prisma.organization.update({ where: { id: organization.id }, data: { minuAgentUsername: "test-user" } });
        }
      });

      await t.test("a new request automatically clears a confirmed old refusal without a cashier unlock", async () => {
        const f = await fixture();
        paid = false;
        assert.equal((await f.authorize()).status, 201);
        await f.status();
        const before = invoiceCalls;
        terminalRefusal = "Пин буруу";
        try {
          const retryId = crypto.randomUUID();
          const response = await f.authorize({ ...f.body, attemptId: retryId });
          assert.equal(response.status, 201, await response.clone().text());
          assert.equal((await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } })).status, "DECLINED");
          await fetch(`${base}/pos/payments/card/status/${retryId}`, { headers });
          assert.equal(invoiceCalls, before + 1);
        } finally { terminalRefusal = undefined; paid = true; }
      });

      await t.test("lost invoice response is checked automatically and never causes a second debit", async () => {
        const f = await fixture();
        paid = false;
        loseInvoiceResponse = true;
        const before = invoiceCalls;
        try {
          assert.equal((await f.authorize()).status, 201);
          await f.status();
          const retry = () => f.authorize({ ...f.body, attemptId: crypto.randomUUID() });
          providerUnavailable = true;
          assert.equal((await retry()).status, 409);
          providerUnavailable = false;
          assert.equal((await retry()).status, 409, "unknown bank outcome must not cause another invoice");
          assert.equal(invoiceCalls, before + 1);
          assert.equal((await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } })).status, "PENDING");
          paid = true;
          assert.equal((await retry()).status, 409, "late bank approval is retained instead of charged again");
          assert.equal((await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } })).status, "APPROVED");
          assert.equal(invoiceCalls, before + 1);
        } finally { loseInvoiceResponse = false; providerUnavailable = false; paid = true; }
      });

      await t.test("register config advertises the v2 contract without changing legacy terminal fields", async () => {
        const f = await fixture();
        const response = await fetch(`${base}/pos/register-config?registerId=${f.register.id}`, { headers });
        assert.equal(response.status, 200, await response.clone().text());
        const config = await response.json() as { cardFlowVersion: number; cardPaymentMode: string; cardProviderType: string; cardTerminalId: string; hasOwnCardTerminal: boolean };
        assert.equal(config.cardFlowVersion, 2);
        assert.equal(config.cardPaymentMode, "API");
        assert.equal(config.cardProviderType, "MINU_AGENT");
        assert.equal(config.cardTerminalId, f.body.terminalId);
        assert.equal(config.hasOwnCardTerminal, true);
      });

      await t.test("missing merchant settings never switch either API version to manual cards", async () => {
        const f = await fixture();
        const before = providerCalls.length;
        await prisma.organization.update({ where: { id: organization.id }, data: { minuAgentEnabled: false } });
        try {
          assert.equal((await f.legacyAuthorize()).status, 422);
          assert.equal(await prisma.cardPaymentAttempt.count({ where: { id: f.body.attemptId } }), 0);
          const modern = await f.authorize();
          assert.equal(modern.status, 422);
          assert.equal((await modern.json() as { code: string }).code, "MINU_CONFIG_INCOMPLETE");
          assert.equal(await prisma.cardPaymentAttempt.count({ where: { id: f.body.attemptId } }), 0);
          assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 0);
          assert.equal(providerCalls.length, before);
        } finally { await prisma.organization.update({ where: { id: organization.id }, data: { minuAgentEnabled: true } }); }
      });

      await t.test("a legacy Minu payment continues through rollout on the same invoice", async () => {
        const f = await fixture();
        paid = false;
        const before = invoiceCalls;
        assert.equal((await f.legacyAuthorize()).status, 201);
        await f.status();
        const original = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } });
        const modernRetry = await f.authorize();
        assert.equal(modernRetry.status, 200);
        assert.equal((await modernRetry.json() as { status: string }).status, "PENDING");
        paid = true;
        assert.equal((await f.status().then(r => r.json()) as { status: string }).status, "APPROVED");
        const saved = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } });
        assert.equal((saved.providerPayload as Record<string, unknown>).invoice, (original.providerPayload as Record<string, unknown>).invoice);
        assert.equal(invoiceCalls, before + 1);
        const sale = await fetch(`${base}/pos/sales`, { method: "POST", headers, body: JSON.stringify(f.sale) });
        assert.equal(sale.status, 201, await sale.text());
      });

      await t.test("a legacy client bridge result can finish on the upgraded API", async () => {
        const f = await fixture();
        await prisma.posRegister.update({ where: { id: f.register.id }, data: { cardProviderType: "ANDROID_PGW", terminalBridgeUrl: "http://127.0.0.1:8787" } });
        assert.equal((await f.legacyAuthorize({ ...f.body, clientBridge: true })).status, 201);
        const result = await fetch(`${base}/pos/payments/card/client-bridge-result`, { method: "POST", headers,
          body: JSON.stringify({ attemptId: f.body.attemptId, result: { status: "APPROVED", rrn: "legacy-bank-proof" } }) });
        assert.equal(result.status, 200);
        const stored = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } });
        assert.equal(stored.status, "APPROVED");
        assert.equal(stored.traceno, "legacy-bank-proof");
        assert.notEqual((stored.providerPayload as Record<string, unknown>).mode, "manual-card");
        const sale = await fetch(`${base}/pos/sales`, { method: "POST", headers, body: JSON.stringify(f.sale) });
        assert.equal(sale.status, 201, await sale.text());
      });

      await t.test("incomplete automatic register settings reject payment without contacting a provider", async () => {
        const before = providerCalls.length;
        for (const config of [
          { cardProviderType: "MINU_AGENT", cardTerminalId: null, terminalBridgeUrl: null },
          { cardProviderType: "ANDROID_PGW", cardTerminalId: null, terminalBridgeUrl: null },
          { cardProviderType: "PUSH_ECR", cardTerminalId: null, terminalBridgeUrl: null },
          { cardProviderType: null, cardTerminalId: null, terminalBridgeUrl: null },
          { cardProviderType: "UNKNOWN", cardTerminalId: null, terminalBridgeUrl: null },
        ]) {
          const f = await fixture();
          await prisma.posRegister.update({ where: { id: f.register.id }, data: config });
          const result = await f.authorize();
          assert.equal(result.status, 422, await result.clone().text());
          assert.equal((await result.json() as { code: string }).code, "CARD_CONFIG_INCOMPLETE");
          assert.equal(await prisma.cardPaymentAttempt.count({ where: { id: f.body.attemptId } }), 0);
          assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 0);
        }
        assert.equal(providerCalls.length, before);
      });

      await t.test("missing Push ECR credentials cannot approve an API payment as manual", async () => {
        assert.equal(pushEcrApiKey, "", "integration tests require empty PUSH_ECR_API_KEY");
        assert.equal(pushEcrClientId, "", "integration tests require empty PUSH_ECR_CLIENT_ID");
        const f = await fixture();
        await prisma.posRegister.update({ where: { id: f.register.id }, data: { cardProviderType: "PUSH_ECR" } });
        const result = await f.authorize();
        assert.equal(result.status, 422);
        assert.equal((await result.json() as { code: string }).code, "CARD_CONFIG_INCOMPLETE");
        assert.equal(await prisma.cardPaymentAttempt.count({ where: { id: f.body.attemptId } }), 0);
      });

      await t.test("an unconfigured till records manual cards, completes the sale once and never inherits another terminal", async () => {
        const f = await fixture();
        await prisma.posRegister.update({ where: { id: f.register.id }, data: { cardEnabled: false, cardProviderType: null, cardTerminalId: null } });
        const config = await fetch(`${base}/pos/register-config?registerId=${f.register.id}`, { headers });
        assert.equal((await config.json() as { cardPaymentMode: string }).cardPaymentMode, "MANUAL");
        const before = providerCalls.length;
        const response = await f.authorize();
        assert.equal(response.status, 201, await response.text());
        const saved = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } });
        assert.equal(saved.status, "APPROVED");
        assert.match(saved.transactionId ?? "", /^manual-card-/);
        assert.equal(saved.traceno, null);
        assert.equal((saved.providerPayload as Record<string, unknown>).provider, "MANUAL_CARD");
        assert.equal((await f.authorize()).status, 200);
        assert.equal((await f.status()).status, 200);
        assert.equal(providerCalls.length, before);
        assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 0);
        const send = () => fetch(`${base}/pos/sales`, { method: "POST", headers, body: JSON.stringify(f.sale) });
        const sold = await send();
        assert.equal(sold.status, 201, await sold.text());
        assert.equal((await send()).status, 200);
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 0);
      });

      await t.test("a disconnected API terminal cannot be approved by manual fallback, including old tabs", async () => {
        const f = await fixture();
        await prisma.posRegister.update({ where: { id: f.register.id }, data: { cardProviderType: "ANDROID_PGW", terminalBridgeUrl: "http://127.0.0.1:8787" } });
        const before = providerCalls.length;
        const response = await f.authorize({ ...f.body, clientBridge: true });
        assert.equal(response.status, 201, await response.text());
        for (const endpoint of ["client-bridge-result", "client-bridge-result-v2"]) {
          const result = await fetch(`${base}/pos/payments/card/${endpoint}`, { method: "POST", headers,
            body: JSON.stringify({ attemptId: f.body.attemptId, result: { status: "APPROVED", manualCard: true, message: "Гараар авсан картын төлбөр бүртгэгдлээ" } }) });
          assert.equal(result.status, 422);
          assert.equal((await result.json() as { code: string }).code, "CARD_MANUAL_FALLBACK_FORBIDDEN");
        }
        const saved = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } });
        assert.equal(saved.status, "PENDING");
        assert.equal((saved.providerPayload as Record<string, unknown>).mode, "client-bridge");
        assert.equal(saved.transactionId, null);
        assert.equal(saved.traceno, null);
        assert.equal(providerCalls.length, before);
        const sold = await fetch(`${base}/pos/sales`, { method: "POST", headers, body: JSON.stringify(f.sale) });
        assert.equal(sold.status, 409, await sold.text());
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 1);
      });

      await t.test("a bridge preflight failure stays declined and cannot complete a sale", async () => {
        const f = await fixture();
        await prisma.posRegister.update({ where: { id: f.register.id }, data: { cardProviderType: "ANDROID_PGW", terminalBridgeUrl: "http://127.0.0.1:8787" } });
        assert.equal((await f.authorize({ ...f.body, clientBridge: true })).status, 201);
        const result = await fetch(`${base}/pos/payments/card/client-bridge-result-v2`, { method: "POST", headers,
          body: JSON.stringify({ attemptId: f.body.attemptId, result: { status: "DECLINED", message: "Төлбөр эхлээгүй" } }) });
        assert.equal((await result.json() as { status: string }).status, "DECLINED");
        const sold = await fetch(`${base}/pos/sales`, { method: "POST", headers, body: JSON.stringify(f.sale) });
        assert.equal(sold.status, 409, await sold.text());
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 1);
      });

      await t.test("a lost bridge response remains pending until the terminal result arrives", async () => {
        const f = await fixture();
        await prisma.posRegister.update({ where: { id: f.register.id }, data: { cardProviderType: "ANDROID_PGW", terminalBridgeUrl: "http://127.0.0.1:8787" } });
        const request = { ...f.body, checkout: undefined, clientBridge: true };
        assert.equal((await f.authorize(request)).status, 201);
        const record = (result: Record<string, unknown>) => fetch(`${base}/pos/payments/card/client-bridge-result-v2`, { method: "POST", headers,
          body: JSON.stringify({ attemptId: f.body.attemptId, result }) });
        const pending = await record({ status: "PENDING", message: "Хариу ирээгүй" });
        assert.equal((await pending.json() as { status: string }).status, "PENDING");
        for (const unknown of [{ status: "FAILED", message: "Unknown terminal response" }, {}, { status: "000", message: "Successful" }]) {
          const result = await record(unknown);
          assert.equal((await result.json() as { status: string }).status, "PENDING");
        }
        assert.equal((await f.status().then(r => r.json()) as { status: string }).status, "PENDING");
        assert.equal((await f.authorize(request)).status, 200);
        const send = () => fetch(`${base}/pos/sales`, { method: "POST", headers, body: JSON.stringify(f.sale) });
        assert.equal((await send()).status, 409);
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 1);
        const approved = await record({ status: "APPROVED", rrn: "bridge-bank-proof" });
        assert.equal((await approved.json() as { status: string }).status, "APPROVED");
        const saved = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } });
        assert.equal(saved.transactionId, "bridge-bank-proof");
        assert.equal((saved.providerPayload as Record<string, unknown>).provider, "ANDROID_PGW");
        assert.equal((saved.providerPayload as Record<string, unknown>).mode, "client-bridge");
        assert.equal((await send()).status, 201);
        assert.equal((await send()).status, 200);
        const lateFailure = await record({ status: "PENDING", message: "Late timeout" });
        assert.equal((await lateFailure.json() as { status: string }).status, "APPROVED");
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 0);
      });

      await t.test("an accepted Minu payment cannot become manual after a timeout or configuration change", async () => {
        const f = await fixture();
        paid = false;
        assert.equal((await f.authorize()).status, 201);
        providerUnavailable = true;
        try { assert.equal((await f.status().then(r => r.json()) as { status: string }).status, "PENDING"); }
        finally { providerUnavailable = false; }
        const forged = await fetch(`${base}/pos/payments/card/client-bridge-result`, { method: "POST", headers,
          body: JSON.stringify({ attemptId: f.body.attemptId, result: { status: "APPROVED", manualCard: true } }) });
        assert.equal(forged.status, 403);
        await prisma.posRegister.update({ where: { id: f.register.id }, data: { cardEnabled: false } });
        const retry = await f.authorize();
        assert.equal((await retry.json() as { status: string }).status, "PENDING");
        const replacement = await f.authorize({ ...f.body, attemptId: crypto.randomUUID() });
        assert.equal(replacement.status, 409);
        assert.equal((await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } })).status, "PENDING");
        paid = true;
      });

      await t.test("price, stock and shift failures are rejected before a terminal invoice is sent", async () => {
        const f = await fixture();
        const before = invoiceCalls;
        await prisma.product.update({ where: { id: f.product.id }, data: { price: 60_000_000 } });
        const priceRejected = await f.authorize();
        assert.equal(priceRejected.status, 409);
        assert.equal((await priceRejected.json() as { code: string }).code, "CARD_PAYMENT_NOT_STARTED");
        await prisma.product.update({ where: { id: f.product.id }, data: { price: 50_000_000, stock: 0 } });
        assert.equal((await f.authorize()).status, 409);
        await prisma.product.update({ where: { id: f.product.id }, data: { stock: 1 } });
        assert.equal((await f.authorize({ ...f.body, checkout: { ...f.body.checkout, shiftId: "unknown" } })).status, 409);
        assert.equal(await prisma.cardPaymentAttempt.count({ where: { id: f.body.attemptId } }), 0);
        assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 0);
        assert.equal(invoiceCalls, before);
      });

      await t.test("legacy unknown payments stay recoverable without permanently blocking the new dispatch flow", async () => {
        const f = await fixture();
        const history = await prisma.cardPaymentAttempt.create({ data: {
          organizationId: organization.id, registerId: f.register.id, terminalId: f.body.terminalId,
          amount: 12000, status: "PENDING",
          providerPayload: { provider: "MINU_AGENT", invoice: "original-legacy-invoice" },
        } });
        const before = invoiceCalls;
        const response = await f.authorize();
        assert.equal(response.status, 201, await response.text());
        const created = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } });
        const payload = created.providerPayload as Record<string, unknown>;
        assert.equal(payload.terminalGuardVersion, 1);
        const unchanged = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: history.id } });
        assert.equal(unchanged.status, "PENDING");
        assert.deepEqual(unchanged.providerPayload, history.providerPayload);
        assert.equal(unchanged.transactionId, null);
        assert.equal(unchanged.consumedAt, null);
        assert.equal(unchanged.saleReference, null);
        await f.status();
        assert.equal(invoiceCalls, before + 1);
      });

      await t.test("simultaneous different requests on one terminal dispatch only one invoice", async () => {
        const f = await fixture();
        const before = invoiceCalls;
        const responses = await Promise.all([f.authorize(), f.authorize({ ...f.body, attemptId: crypto.randomUUID() })]);
        assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
        // Wait for the background provider dispatch to finish before counting.
        const accepted = await prisma.cardPaymentAttempt.findFirstOrThrow({ where: { terminalId: f.body.terminalId } });
        await fetch(`${base}/pos/payments/card/status/${accepted.id}`, { headers });
        assert.equal(invoiceCalls, before + 1);
        assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 1);
      });

      await t.test("simultaneous retries of the same request return the same attempt and never charge twice", async () => {
        const f = await fixture();
        const before = invoiceCalls;
        const results = await Promise.all([f.authorize(), f.authorize()]);
        assert.deepEqual(results.map(r => r.status).sort(), [200, 201]);
        await f.status();
        assert.equal(invoiceCalls, before + 1);
        assert.equal(await prisma.cardPaymentAttempt.count({ where: { id: f.body.attemptId } }), 1);
      });

      await t.test("paid basket keeps its validated price, protects stock and rejects altered sale lines", async () => {
        const f = await fixture();
        const response = await f.authorize();
        assert.equal(response.status, 201, await response.text());
        await f.status();
        await prisma.product.update({ where: { id: f.product.id }, data: { price: 60_000_000 } });
        const competing = { ...f.sale, clientSaleId: crypto.randomUUID(), paymentMethod: "CASH",
          paymentBreakdown: [{ method: "CASH", amount: 60_000_000 }], lines: [{ ...f.sale.lines[0], unitPrice: 60_000_000 }] };
        const blocked = await fetch(`${base}/pos/sales`, { method: "POST", headers, body: JSON.stringify(competing) });
        assert.equal(blocked.status, 409, await blocked.text());
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 1);
        const changed = await fetch(`${base}/pos/sales`, { method: "POST", headers, body: JSON.stringify({ ...f.sale, lines: [{ ...f.sale.lines[0], qty: 2, unitPrice: 25_000_000 }] }) });
        assert.equal(changed.status, 409, await changed.text());
        const sold = await fetch(`${base}/pos/sales`, { method: "POST", headers, body: JSON.stringify(f.sale) });
        assert.equal(sold.status, 201, await sold.text());
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 0);
        assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 0);
        const retry = await fetch(`${base}/pos/sales`, { method: "POST", headers, body: JSON.stringify(f.sale) });
        assert.equal(retry.status, 200, await retry.text());
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 0);
        const before = invoiceCalls;
        assert.equal((await f.authorize({ ...f.body, attemptId: crypto.randomUUID() })).status, 409);
        assert.equal(invoiceCalls, before, "a completed sale cannot be charged again with a new attempt ID");
      });

      await t.test("pending and failed unknown bank states retain stock, explicit decline releases it", async () => {
        const f = await fixture();
        paid = false;
        const result = await f.authorize();
        assert.equal(result.status, 201, await result.text());
        await f.status();
        assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 1);
        await prisma.cardPaymentAttempt.update({ where: { id: f.body.attemptId }, data: { status: "FAILED", message: "network timeout" } });
        assert.equal((await f.authorize({ ...f.body, attemptId: crypto.randomUUID() })).status, 409);
        terminalDeclined = true;
        try {
          const status = await f.status();
          assert.equal(status.status, 200);
          assert.equal((await status.json() as { status: string }).status, "DECLINED");
          assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 0);
          assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 1);
        } finally { terminalDeclined = false; paid = true; }
      });

      await t.test("observed Minu cancellation releases stock without sending a cancel or another invoice", async () => {
        const f = await fixture();
        paid = false;
        assert.equal((await f.authorize()).status, 201);
        await f.status();
        const before = invoiceCalls;
        const callOffset = providerCalls.length;
        observedCancellation = true;
        try {
          const response = await f.status();
          const result = await response.json() as { status: string; message: string };
          assert.equal(result.status, "DECLINED");
          assert.equal(result.message, "Гүйлгээ цуцлагдлаа");
          assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 0);
          assert.equal(invoiceCalls, before);
          assert.ok(providerCalls.slice(callOffset).every((path) => ["/agent/login", "/agent/checkTxn"].includes(path)));
        } finally { observedCancellation = false; paid = true; }
      });

      await t.test("insufficient funds reaches the till, preserves the basket and permits another payment", async () => {
        const f = await fixture();
        paid = false;
        assert.equal((await f.authorize()).status, 201);
        await f.status();
        const original = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } });
        assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 1);
        const before = invoiceCalls;
        const callOffset = providerCalls.length;
        insufficientFunds = true;
        try {
          const response = await f.status();
          assert.equal(response.status, 200);
          const result = await response.json() as { status: string; message: string };
          assert.equal(result.status, "DECLINED");
          assert.equal(result.message, "Үлдэгдэл хүрээгүй");
          assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 0);
          assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 1);
          const stored = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } });
          assert.equal(stored.consumedAt, null);
          assert.equal(stored.saleReference, null);
          assert.equal(stored.transactionId, null);
          assert.deepEqual((stored.providerPayload as Record<string, unknown>).checkout, (original.providerPayload as Record<string, unknown>).checkout);
          assert.equal(invoiceCalls, before);
          assert.ok(providerCalls.slice(callOffset).every((path) => ["/agent/login", "/agent/checkTxn"].includes(path)));
        } finally { insufficientFunds = false; }
        // A distinct, deliberate payment attempt may use the same intact basket.
        assert.equal((await f.authorize({ ...f.body, attemptId: crypto.randomUUID() })).status, 201);
        paid = true;
      });

      for (const message of ["Not permitted", "Transaction refused", "Пин буруу", "System Error", "SystemError"]) {
        await t.test(`${message} releases the pending payment without clearing its basket or issuing another invoice`, async () => {
          const f = await fixture();
          paid = false;
          assert.equal((await f.authorize()).status, 201);
          await f.status();
          const original = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } });
          assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 1);
          const before = invoiceCalls;
          const callOffset = providerCalls.length;
          terminalRefusal = message;
          try {
            const response = await f.status();
            const result = await response.json() as { status: string; message: string };
            assert.equal(response.status, 200);
            assert.equal(result.status, "DECLINED");
            assert.equal(result.message, message);
            assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 0);
            assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 1);
            const stored = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } });
            assert.equal(stored.consumedAt, null);
            assert.equal(stored.saleReference, null);
            assert.equal(stored.transactionId, null);
            assert.equal((stored.providerPayload as Record<string, unknown>).terminalGuardVersion, 1,
              "the status, rather than deleting audit evidence, removes the terminal guard");
            assert.deepEqual((stored.providerPayload as Record<string, unknown>).checkout, (original.providerPayload as Record<string, unknown>).checkout);
            assert.equal(invoiceCalls, before);
            assert.ok(providerCalls.slice(callOffset).every(path => ["/agent/login", "/agent/checkTxn"].includes(path)));
          } finally { terminalRefusal = undefined; }
          const repeated = await f.authorize();
          assert.equal((await repeated.json() as { status: string }).status, "DECLINED");
          assert.equal(invoiceCalls, before, "retrying the failed request ID must never send another invoice");
          const retryId = crypto.randomUUID();
          assert.equal((await f.authorize({ ...f.body, attemptId: retryId })).status, 201);
          await fetch(`${base}/pos/payments/card/status/${retryId}`, { headers });
          assert.equal(invoiceCalls, before + 1, "only a deliberate new attempt dispatches a new invoice");
          paid = true;
        });
      }

      await t.test("a stale bank poll cannot overwrite newer review evidence", async () => {
        const f = await fixture();
        paid = false;
        assert.equal((await f.authorize()).status, 201);
        const stale = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: f.body.attemptId } });
        const payload = stale.providerPayload;
        assert.ok(payload && typeof payload === "object" && !Array.isArray(payload));
        await prisma.cardPaymentAttempt.update({ where: { id: stale.id }, data: {
          updatedAt: new Date(stale.updatedAt.getTime() + 1),
          providerPayload: { ...payload, legacyMinuReview: { runId: "newer-evidence" } },
        } });
        paid = true;
        const result = await reconcileMinuCardAttempt(stale);
        assert.equal(result.attempt.status, "PENDING");
        assert.deepEqual((result.attempt.providerPayload as Record<string, unknown>).legacyMinuReview, { runId: "newer-evidence" });
        const fresh = await f.status();
        assert.equal((await fresh.json() as { status: string }).status, "APPROVED");
        const saved = await prisma.cardPaymentAttempt.findUniqueOrThrow({ where: { id: stale.id } });
        assert.deepEqual((saved.providerPayload as Record<string, unknown>).legacyMinuReview, { runId: "newer-evidence" });
      });

      await t.test("declining a second card preserves the first payment and its stock until a mixed sale commits", async () => {
        const f = await fixture();
        f.body.amount = 25_000_000;
        assert.equal((await f.authorize()).status, 201);
        await f.status();
        const secondId = crypto.randomUUID();
        assert.equal((await f.authorize({ ...f.body, attemptId: secondId })).status, 201);
        terminalDeclined = true;
        try { await fetch(`${base}/pos/payments/card/status/${secondId}`, { headers }); }
        finally { terminalDeclined = false; }
        assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 1);
        const result = await fetch(`${base}/pos/sales`, { method: "POST", headers, body: JSON.stringify({ ...f.sale, paymentMethod: "MIXED",
          paymentBreakdown: [{ method: "CARD", amount: 25_000_000, attemptId: f.body.attemptId }, { method: "CASH", amount: 25_000_000 }] }) });
        assert.equal(result.status, 201, await result.text());
        assert.equal(await prisma.posCardStockReservation.count({ where: { productId: f.product.id } }), 0);
      });
    } finally {
      if (previousMinuUrl === undefined) delete process.env.MINU_AGENT_BASE_URL;
      else process.env.MINU_AGENT_BASE_URL = previousMinuUrl;
      await close(server);
      await close(providerServer);
      await prisma.$disconnect();
    }
  },
);
