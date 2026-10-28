import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import recoveryRoutes from "./card-recovery.routes";
import salesRoutes from "./sales.routes";
import { JWT_SECRET } from "./_shared";
import { cardRecoveryDayRange } from "../../../services/card-payment-recovery";

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
    const providerCalls: string[] = [];
    const provider = express();
    provider.use(express.json());
    provider.use((req, res) => {
      providerCalls.push(req.path);
      if (req.path === "/agent/login")
        return res.json({ status: "000", entity: "test-token" });
      if (req.path !== "/agent/checkTxn")
        return res
          .status(500)
          .json({ message: "NEW CHARGES ARE FORBIDDEN IN RECOVERY" });
      if (providerUnavailable)
        return res.status(503).json({ message: "Unavailable" });
      return res.json({
        status: "000",
        entity: {
          invoice: req.body.invoice,
          status: paid ? "000" : "10",
          rrn: paid ? "123456789012" : null,
          error: paid ? "false" : "true",
          message: paid ? "Гүйлгээ амжилттай" : "Үлдэгдэл хүрээгүй",
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
    app.use(salesRoutes);
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
        "successful recovery produces a normal receipt and deducts stock once",
        async () => {
          const result = await sell();
          const body = await result.text();
          assert.equal(result.status, 201, body);
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
      assert.ok(providerCalls.length > 0);
      assert.ok(
        providerCalls.every(
          (path) => path === "/agent/login" || path === "/agent/checkTxn",
        ),
        JSON.stringify(providerCalls),
      );
    } finally {
      if (previousMinuUrl === undefined) delete process.env.MINU_AGENT_BASE_URL;
      else process.env.MINU_AGENT_BASE_URL = previousMinuUrl;
      await close(server);
      await close(providerServer);
      await prisma.$disconnect();
    }
  },
);
