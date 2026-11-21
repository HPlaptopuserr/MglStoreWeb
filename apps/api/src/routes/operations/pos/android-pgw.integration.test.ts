import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import type { AddressInfo } from "node:net";
import express, { type Router as ExpressRouter } from "express";
import { createRequire } from "node:module";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import {
  bridgeRootKey,
  deriveBridgeSecret,
} from "../../../services/pos-bridge-keys";
import { signBridgePayload } from "../../../services/android-pgw-bridge";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled =
  process.env.PGW_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_card_recovery_test_");

test(
  "signed Vendor PGW purchase, sale and terminal commands against disposable PostgreSQL",
  { skip: !enabled },
  async (t) => {
    process.env.POS_BRIDGE_SHARED_SECRET = "local-legacy-integration-test-key";
    const cardRoutes = (
      createRequire(__filename)("./card-payments.routes") as {
        default: ExpressRouter;
      }
    ).default;
    const salesRoutes = (
      createRequire(__filename)("./sales.routes") as { default: ExpressRouter }
    ).default;
    const app = express();
    app.use(express.json());
    app.use(cardRoutes);
    app.use(salesRoutes);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const id = crypto.randomUUID();
      const organization = await prisma.organization.create({
        data: {
          name: "PGW test",
          slug: `pgw-${id}`,
          taxId: `pgw-${id}`,
          status: "ACTIVE",
        },
      });
      const user = await prisma.user.create({
        data: { email: `${id}@pgw.invalid`, role: "USER" },
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
        data: { organizationId: organization.id, name: "PGW", address: "Test" },
      });
      const register = await prisma.posRegister.create({
        data: {
          organizationId: organization.id,
          branchId: branch.id,
          name: "PGW",
          cardEnabled: true,
          cardProviderType: "ANDROID_PGW",
          terminalBridgeUrl: "http://127.0.0.1:17422",
          isActive: true,
          activationStatus: "APPROVED",
        },
      });
      const salt = "signed-pgw-integration-salt";
      await prisma.posBridgeBinding.create({
        data: {
          registerId: register.id,
          credentialSalt: salt,
          deviceId: "signed-pgw-integration-device",
          pairedAt: new Date(),
        },
      });
      const secret = deriveBridgeSecret(register.id, salt, bridgeRootKey());
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
          name: "PGW test item",
          price: 100,
          stock: 3,
        },
      });
      const headers = {
        Authorization: `Bearer ${jwt.sign({ userId: user.id, organizationId: organization.id }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
        "Content-Type": "application/json",
      };
      const post = (path: string, body: unknown) =>
        fetch(`${base}${path}`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
      const attemptId = crypto.randomUUID();
      const authorization = {
        attemptId,
        amount: 100,
        terminalId: "terminal-1",
        registerId: register.id,
        organizationId: organization.id,
        clientBridge: true,
      };
      const approve = {
        status: "APPROVED",
        provider: "ANDROID_PGW",
        attemptId,
        requestAmount: 100,
        requestedTerminalId: "terminal-1",
        rrn: "001234567890",
        data: attemptId,
      };
      const endpoint = "/pos/payments/card/client-bridge-result-v2";
      const signed = (result: Record<string, unknown>) => {
        const bridgeResponse = JSON.stringify(result);
        return {
          attemptId,
          result,
          bridgeResponse,
          bridgeSignature: signBridgePayload(bridgeResponse, secret),
        };
      };

      await t.test(
        "authorization and retry return one persisted identity and a request signature",
        async () => {
          const first = await post(
            "/pos/payments/card/authorize-v2",
            authorization,
          );
          assert.equal(first.status, 201, await first.clone().text());
          const body = await first.json();
          const expected = signBridgePayload(
            JSON.stringify({
              attemptId,
              amount: 100,
              terminalId: "terminal-1",
            }),
            secret,
          );
          assert.equal(body.bridgeRequestSignature, expected);
          const retry = await post(
            "/pos/payments/card/authorize-v2",
            authorization,
          );
          assert.equal(retry.status, 200);
          assert.equal((await retry.json()).bridgeRequestSignature, expected);
          assert.equal(
            await prisma.cardPaymentAttempt.count({ where: { id: attemptId } }),
            1,
          );
        },
      );
      await t.test(
        "forged and cross-attempt evidence cannot mark the pending payment approved",
        async () => {
          assert.equal(
            (await post(endpoint, { attemptId, result: approve })).status,
            422,
          );
          assert.equal(
            (await post(endpoint, signed({ ...approve, attemptId: "another" })))
              .status,
            422,
          );
          assert.equal(
            (
              await prisma.cardPaymentAttempt.findUniqueOrThrow({
                where: { id: attemptId },
              })
            ).status,
            "PENDING",
          );
          assert.equal(
            (
              await prisma.product.findUniqueOrThrow({
                where: { id: product.id },
              })
            ).stock,
            3,
          );
        },
      );
      await t.test(
        "signed approval is accepted once without moving stock prematurely",
        async () => {
          const response = await post(endpoint, signed(approve));
          assert.equal(response.status, 200);
          assert.equal((await response.json()).status, "APPROVED");
          const card = await prisma.cardPaymentAttempt.findUniqueOrThrow({
            where: { id: attemptId },
          });
          assert.equal(card.traceno, "001234567890");
          assert.equal(card.consumedAt, null);
        },
      );
      await t.test(
        "sale retry consumes the approved payment and stock exactly once",
        async () => {
          const sale = {
            organizationId: organization.id,
            branchId: branch.id,
            registerId: register.id,
            shiftId: shift.id,
            clientSaleId: crypto.randomUUID(),
            paymentMethod: "CARD",
            paymentBreakdown: [{ method: "CARD", amount: 100, attemptId }],
            lines: [
              {
                productId: product.id,
                qty: 1,
                unitPrice: 100,
                discountAmount: 0,
                taxRate: 0,
              },
            ],
          };
          const response = await post("/pos/sales", sale);
          assert.equal(response.status, 201, await response.clone().text());
          const first = await response.json();
          const retry = await post("/pos/sales", sale);
          assert.equal(retry.status, 200, await retry.clone().text());
          assert.equal((await retry.json()).id, first.id);
          assert.equal(
            (
              await prisma.product.findUniqueOrThrow({
                where: { id: product.id },
              })
            ).stock,
            2,
          );
          assert.equal(
            await prisma.posSale.count({
              where: { organizationId: organization.id },
            }),
            1,
          );
        },
      );
      await t.test(
        "late signed decline cannot overwrite a consumed approval",
        async () => {
          assert.equal(
            (
              await (
                await post(endpoint, signed({ ...approve, status: "DECLINED" }))
              ).json()
            ).status,
            "APPROVED",
          );
        },
      );
      await t.test(
        "PGW void is bound to the sold payment's real RRN and audited separately from stock",
        async () => {
          const input = {
            operation: "void",
            registerId: register.id,
            attemptId,
          };
          const response = await post(
            "/pos/payments/android-pgw/command",
            input,
          );
          assert.equal(response.status, 200, await response.clone().text());
          const { command } = await response.json();
          assert.equal(command.rrn, "001234567890");
          assert.equal(command.requestId, `void_${attemptId}`);
          const bridgeResponse = JSON.stringify({
            command,
            status: "APPROVED",
          });
          const verified = await post("/pos/payments/android-pgw/command", {
            ...input,
            bridgeResponse,
            bridgeSignature: signBridgePayload(bridgeResponse, secret),
          });
          assert.equal((await verified.json()).succeed, true);
          assert.equal(
            (
              await prisma.product.findUniqueOrThrow({
                where: { id: product.id },
              })
            ).stock,
            2,
          );
        },
      );
      await t.test("PGW settlement is scoped to this open shift", async () => {
        const response = await post("/pos/payments/android-pgw/command", {
          operation: "settlement",
          registerId: register.id,
          shiftId: shift.id,
        });
        assert.equal(response.status, 200);
        assert.equal(
          (await response.json()).command.requestId,
          `settlement_${shift.id}`,
        );
        assert.equal(
          (
            await post("/pos/payments/android-pgw/command", {
              operation: "settlement",
              registerId: register.id,
              shiftId: "foreign-shift",
            })
          ).status,
          422,
        );
      });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.$disconnect();
    }
  },
);
