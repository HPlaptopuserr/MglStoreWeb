import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express, { type Router as ExpressRouter } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import { deriveBridgeSecret } from "../../../services/pos-bridge-keys";
import { signBridgePayload } from "../../../services/android-pgw-bridge";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled =
  process.env.BRIDGE_PAIRING_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_bridge_pairing_test_");
type Claim = {
  bindingId: string;
  registerId: string;
  deviceId: string;
  secret: string;
};

test(
  "dedicated pairing root works with unchanged short JWT, signed heartbeat and payment",
  { skip: !enabled },
  async (t) => {
    const jwtKey = "existing-short-jwt";
    const dedicatedKey = "dedicated-pairing-integration-test-root-secret";
    process.env.APP_ENV = "production";
    process.env.JWT_SECRET = jwtKey;
    process.env.POS_BRIDGE_PAIRING_SECRET = dedicatedKey;
    delete process.env.POS_BRIDGE_SHARED_SECRET;
    const load = createRequire(__filename);
    const pairRoutes = (
      load("./bridge-pairing.routes") as { default: ExpressRouter }
    ).default;
    const cardRoutes = (
      load("./card-payments.routes") as { default: ExpressRouter }
    ).default;
    const app = express();
    app.use(express.json());
    app.use(pairRoutes);
    app.use(cardRoutes);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const id = crypto.randomUUID();
      const organization = await prisma.organization.create({
        data: {
          name: "Dedicated-root test",
          slug: `dedicated-${id}`,
          taxId: `dedicated-${id}`,
          status: "ACTIVE",
        },
      });
      const admin = await prisma.user.create({
        data: { email: `admin-${id}@pairing.invalid`, role: "ADMIN" },
      });
      const cashier = await prisma.user.create({
        data: { email: `cashier-${id}@pairing.invalid`, role: "USER" },
      });
      await prisma.organizationMember.create({
        data: {
          userId: cashier.id,
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
          name: "Dedicated PAX",
          mode: "RETAIL",
          isActive: true,
          activationStatus: "APPROVED",
        },
      });
      const headers = (userId: string) => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt.sign({ userId, organizationId: organization.id }, jwtKey)}`,
      });
      const adminHeaders = headers(admin.id);
      const post = (
        path: string,
        body: unknown,
        auth?: Record<string, string>,
      ) =>
        fetch(`${base}${path}`, {
          method: "POST",
          headers: auth || { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      let claim: Claim;

      await t.test(
        "Admin token remains valid and the new claim selects the dedicated root",
        async () => {
          const issued = await post(
            `/admin/pos-registers/${register.id}/bridge/pairing-code`,
            {},
            adminHeaders,
          );
          assert.equal(issued.status, 201, await issued.clone().text());
          const { code } = (await issued.json()) as { code: string };
          const paired = await post("/pos/bridge/pair", {
            code,
            deviceId: "dedicated-test-device",
          });
          assert.equal(paired.status, 200, await paired.clone().text());
          claim = (await paired.json()) as Claim;
          const binding = await prisma.posBridgeBinding.findUniqueOrThrow({
            where: { registerId: register.id },
          });
          assert.match(binding.credentialSalt || "", /^v2:[a-f0-9]{64}$/);
          assert.equal(
            claim.secret,
            deriveBridgeSecret(
              register.id,
              binding.credentialSalt!,
              dedicatedKey,
            ),
          );
          assert.notEqual(
            claim.secret,
            deriveBridgeSecret(register.id, binding.credentialSalt!, jwtKey),
          );
          assert.equal(process.env.JWT_SECRET, jwtKey);
          assert.equal(
            (
              await fetch(`${base}/admin/pos-registers/${register.id}/bridge`, {
                headers: adminHeaders,
              })
            ).status,
            200,
          );
        },
      );

      const heartbeat = () =>
        JSON.stringify({
          bindingId: claim.bindingId,
          deviceId: claim.deviceId,
          timestamp: Date.now(),
          terminalConnected: true,
          serialPath: "COM3",
          terminalId: "000001",
          bridgeVersion: "2",
          error: null,
          hasUnresolvedOperation: false,
        });
      await t.test(
        "the dedicated-root device reports an authenticated heartbeat",
        async () => {
          const body = heartbeat();
          const response = await post("/pos/bridge/heartbeat", {
            body,
            signature: signBridgePayload(body, claim.secret),
          });
          assert.equal(response.status, 200, await response.clone().text());
          const status = (await (
            await fetch(`${base}/admin/pos-registers/${register.id}/bridge`, {
              headers: adminHeaders,
            })
          ).json()) as { state: string };
          assert.equal(status.state, "CONNECTED");
        },
      );

      await t.test(
        "missing dedicated configuration is retryable 503, not permanent device revocation",
        async () => {
          const body = heartbeat();
          const signature = signBridgePayload(body, claim.secret);
          delete process.env.POS_BRIDGE_PAIRING_SECRET;
          const unavailable = await post("/pos/bridge/heartbeat", {
            body,
            signature,
          });
          assert.equal(
            unavailable.status,
            503,
            await unavailable.clone().text(),
          );
          process.env.POS_BRIDGE_PAIRING_SECRET = dedicatedKey;
          const restored = await post("/pos/bridge/heartbeat", {
            body,
            signature,
          });
          assert.equal(restored.status, 200, await restored.clone().text());
          assert.equal(
            (
              await prisma.posBridgeBinding.findUniqueOrThrow({
                where: { registerId: register.id },
              })
            ).revokedAt,
            null,
          );
        },
      );

      await t.test("a bad device signature remains unauthorized", async () => {
        const body = heartbeat();
        const response = await post("/pos/bridge/heartbeat", {
          body,
          signature: signBridgePayload(body, "wrong-key"),
        });
        assert.equal(response.status, 401);
      });

      await t.test(
        "payment authorization and approval use the dedicated key without rotating authentication",
        async () => {
          const attemptId = crypto.randomUUID();
          const response = await post(
            "/pos/payments/card/authorize-v2",
            {
              attemptId,
              amount: 100,
              terminalId: "terminal-1",
              registerId: register.id,
              organizationId: organization.id,
              clientBridge: true,
            },
            headers(cashier.id),
          );
          assert.equal(response.status, 201, await response.clone().text());
          const body = (await response.json()) as {
            bridgeRequestSignature: string;
          };
          assert.equal(
            body.bridgeRequestSignature,
            signBridgePayload(
              JSON.stringify({
                attemptId,
                amount: 100,
                terminalId: "terminal-1",
              }),
              claim.secret,
            ),
          );
          const result = {
            status: "APPROVED",
            provider: "ANDROID_PGW",
            attemptId,
            requestAmount: 100,
            requestedTerminalId: "terminal-1",
            rrn: "001234567890",
          };
          const bridgeResponse = JSON.stringify(result);
          const approved = await post(
            "/pos/payments/card/client-bridge-result-v2",
            {
              attemptId,
              result,
              bridgeResponse,
              bridgeSignature: signBridgePayload(bridgeResponse, claim.secret),
            },
            headers(cashier.id),
          );
          assert.equal(approved.status, 200, await approved.clone().text());
          assert.equal(
            ((await approved.json()) as { status: string }).status,
            "APPROVED",
          );
          assert.equal(process.env.JWT_SECRET, jwtKey);
          assert.equal(
            (
              await fetch(`${base}/admin/pos-registers/${register.id}/bridge`, {
                headers: adminHeaders,
              })
            ).status,
            200,
          );
        },
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.$disconnect();
    }
  },
);
