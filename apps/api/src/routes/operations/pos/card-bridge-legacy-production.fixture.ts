import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express, { type Router as ExpressRouter } from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import { deriveBridgeSecret } from "../../../services/pos-bridge-keys";
import { signBridgePayload } from "../../../services/android-pgw-bridge";

type SavedAttempt = {
  id: string;
  registerId: string;
  organizationId: string;
  initiatedById: string;
  terminalId: string;
  amount: number;
  bridgeUrl: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "FAILED";
  providerPayload: Record<string, unknown>;
  transactionId: string | null;
  message: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Each caller is a separate node:test process, exercising production module constants. */
export function legacyBridgeProductionSuite(globalSecret: string) {
  const rootKey = "production-compatibility-test-authentication-key";
  process.env.APP_ENV = "production";
  process.env.JWT_SECRET = rootKey;
  process.env.POS_BRIDGE_SHARED_SECRET = globalSecret;
  let server: Server;
  let base: string;
  let saved: SavedAttempt | null;
  const restores: Array<() => void> = [];
  const stub = (target: object, key: string, value: unknown) => {
    const original: unknown = Reflect.get(target, key);
    Reflect.set(target, key, value);
    restores.push(() => {
      Reflect.set(target, key, original);
    });
  };
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${jwt.sign({ userId: "cashier", organizationId: "store" }, rootKey)}`,
  };
  const post = (path: string, body: unknown) =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  const authorization = (attemptId: string) => ({
    attemptId,
    registerId: "register",
    organizationId: "store",
    terminalId: "terminal-1",
    amount: 100,
    bridgeUrl: "http://127.0.0.1:7420",
    clientBridge: true,
  });

  before(async () => {
    const routes = (
      createRequire(__filename)("./card-payments.routes") as {
        default: ExpressRouter;
      }
    ).default;
    const runtime = createRequire(__filename)("./_shared") as {
      isProdLikeEnv: boolean;
      bridgeSharedSecret: string;
    };
    assert.equal(runtime.isProdLikeEnv, true);
    assert.equal(runtime.bridgeSharedSecret, globalSecret);
    const app = express();
    app.use(express.json());
    app.use(routes);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  afterEach(() => {
    while (restores.length) restores.pop()?.();
  });
  beforeEach(() => {
    saved = null;
    stub(
      prisma,
      "$transaction",
      async (operation: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        operation(prisma),
    );
    stub(prisma, "$executeRaw", async () => 0);
    stub(prisma, "$queryRaw", async () => []);
    stub(prisma.user, "findUnique", async () => ({
      id: "cashier",
      role: "USER",
      isActive: true,
      deletedAt: null,
    }));
    stub(prisma.organizationMember, "findFirst", async () => ({
      organizationId: "store",
      role: "OWNER",
      capabilities: [],
    }));
    stub(prisma.organizationMember, "count", async () => 1);
    stub(prisma.posRegister, "findUnique", async () => ({
      id: "register",
      organizationId: "store",
      cardEnabled: true,
      cardProviderType: "ANDROID_PGW",
      cardTerminalId: null,
      terminalBridgeUrl: "http://127.0.0.1:7420",
      isActive: true,
      activationStatus: "APPROVED",
      deletedAt: null,
      organization: { minuAgentEnabled: false },
    }));
    stub(prisma.posRegister, "update", async () => {
      throw new Error("Legacy authorization must not modify register settings");
    });
    stub(prisma.posBridgeBinding, "findUnique", async () => null);
    stub(prisma.posBridgeBinding, "upsert", async () => {
      throw new Error("Legacy authorization must not enroll a register");
    });
    stub(prisma.cardPaymentAttempt, "findUnique", async () => saved);
    stub(prisma.cardPaymentAttempt, "findFirst", async () => null);
    stub(
      prisma.cardPaymentAttempt,
      "create",
      async (input: {
        data: { id: string; providerPayload: Record<string, unknown> };
      }) => {
        saved = {
          id: input.data.id,
          registerId: "register",
          organizationId: "store",
          initiatedById: "cashier",
          terminalId: "terminal-1",
          amount: 100,
          bridgeUrl: "http://127.0.0.1:7420",
          status: "PENDING",
          providerPayload: input.data.providerPayload,
          transactionId: null,
          message: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return saved;
      },
    );
    stub(
      prisma.cardPaymentAttempt,
      "updateMany",
      async (input: {
        data: {
          status: SavedAttempt["status"];
          transactionId: string | null;
          message: string | null;
          providerPayload: Record<string, unknown>;
        };
      }) => {
        if (!saved) throw new Error("Missing legacy attempt");
        saved = { ...saved, ...input.data };
        return { count: 1 };
      },
    );
    stub(prisma.cardPaymentAttempt, "findUniqueOrThrow", async () => {
      assert.ok(saved);
      return saved;
    });
    stub(prisma.auditLog, "create", async () => ({}));
  });

  for (const endpoint of ["authorize", "authorize-v2"]) {
    test(`production unenrolled ${endpoint} keeps the legacy request contract without enrollment`, async () => {
      const response = await post(
        `/pos/payments/card/${endpoint}`,
        authorization(crypto.randomUUID()),
      );
      assert.equal(response.status, 201, await response.clone().text());
      const body = await response.json();
      assert.equal(body.status, "PENDING");
      assert.equal(body.bridgeRequestSignature, undefined);
      assert.ok(saved);
      assert.equal(saved.providerPayload.bridgeBindingId, undefined);
      const status = await fetch(
        `${base}/pos/payments/card/status/${body.attemptId}`,
        { headers },
      );
      assert.equal(status.status, 200);
      assert.equal((await status.json()).bridgeRequestSignature, undefined);
    });
  }

  for (const endpoint of ["client-bridge-result", "client-bridge-result-v2"]) {
    test(`an old production tab can submit unsigned approval through ${endpoint}`, async () => {
      const attemptId = crypto.randomUUID();
      assert.equal(
        (
          await post(
            "/pos/payments/card/authorize-v2",
            authorization(attemptId),
          )
        ).status,
        201,
      );
      const response = await post(`/pos/payments/card/${endpoint}`, {
        attemptId,
        result: { status: "APPROVED", rrn: "001234567890" },
      });
      assert.equal(response.status, 200, await response.clone().text());
      assert.equal((await response.json()).status, "APPROVED");
      assert.ok(saved);
      assert.equal(saved.transactionId, "001234567890");
    });
  }

  test("an old production tab can record an explicit preflight decline without forged manual approval", async () => {
    const attemptId = crypto.randomUUID();
    await post("/pos/payments/card/authorize-v2", authorization(attemptId));
    const response = await post("/pos/payments/card/client-bridge-result-v2", {
      attemptId,
      result: { status: "DECLINED", message: "Payment not started" },
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, "DECLINED");
  });

  test("an unenrolled browser cannot inject pairing metadata through its result", async () => {
    const attemptId = crypto.randomUUID();
    await post("/pos/payments/card/authorize-v2", authorization(attemptId));
    const response = await post("/pos/payments/card/client-bridge-result-v2", {
      attemptId,
      result: {
        status: "PENDING",
        bridgeBindingId: "browser-forged-enrollment",
      },
    });
    assert.equal(response.status, 200, await response.clone().text());
    const body = await response.json();
    assert.equal(body.bridgeRequestSignature, undefined);
    assert.ok(saved);
    assert.equal(saved.providerPayload.bridgeBindingId, undefined);
  });

  test("an archived missing request cannot be dispatched by an old production tab", async () => {
    stub(prisma, "$queryRaw", async () => [{ id: "archived-missing-attempt" }]);
    const response = await post(
      "/pos/payments/card/authorize-v2",
      authorization(crypto.randomUUID()),
    );
    assert.equal(response.status, 409, await response.clone().text());
    assert.equal((await response.json()).code, "CARD_PAYMENT_NOT_STARTED");
    assert.equal(saved, null);
  });

  function pairedFixture() {
    const salt = "enrolled-production-register-salt";
    const binding = {
      id: "binding",
      registerId: "register",
      credentialSalt: salt,
      revokedAt: null,
      activeCommandId: null,
      hasUnresolvedOperation: false,
    };
    stub(prisma.posBridgeBinding, "findUnique", async () => binding);
    return deriveBridgeSecret("register", salt, rootKey);
  }

  test("an explicitly paired production register emits its own signature and refuses an old unsigned approval", async () => {
    const pairedSecret = pairedFixture();
    const attemptId = crypto.randomUUID();
    const response = await post(
      "/pos/payments/card/authorize-v2",
      authorization(attemptId),
    );
    assert.equal(response.status, 201, await response.clone().text());
    const body = await response.json();
    assert.equal(
      body.bridgeRequestSignature,
      signBridgePayload(
        JSON.stringify({ attemptId, amount: 100, terminalId: "terminal-1" }),
        pairedSecret,
      ),
    );
    assert.ok(!JSON.stringify(body).includes(pairedSecret));
    const unsigned = await post("/pos/payments/card/client-bridge-result-v2", {
      attemptId,
      result: { status: "APPROVED" },
    });
    assert.equal(unsigned.status, 422);
    assert.ok(saved);
    assert.equal(saved.status, "PENDING");
  });

  test("paired production approval uses the register key even when no legacy global key is configured", async () => {
    const pairedSecret = pairedFixture();
    const attemptId = crypto.randomUUID();
    await post("/pos/payments/card/authorize-v2", authorization(attemptId));
    const result = {
      status: "APPROVED",
      provider: "ANDROID_PGW",
      attemptId,
      requestAmount: 100,
      requestedTerminalId: "terminal-1",
      rrn: "001234567890",
      bridgeBindingId: "terminal-cannot-replace-enrollment",
    };
    const bridgeResponse = JSON.stringify(result);
    const response = await post("/pos/payments/card/client-bridge-result-v2", {
      attemptId,
      result,
      bridgeResponse,
      bridgeSignature: signBridgePayload(bridgeResponse, pairedSecret),
    });
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal((await response.json()).status, "APPROVED");
    assert.ok(saved);
    assert.equal(saved.providerPayload.bridgeBindingId, "binding");
  });

  test("a paired production register preserves uncertainty on an unsigned browser preflight failure", async () => {
    pairedFixture();
    const attemptId = crypto.randomUUID();
    await post("/pos/payments/card/authorize-v2", authorization(attemptId));
    const response = await post("/pos/payments/card/client-bridge-result-v2", {
      attemptId,
      result: { status: "DECLINED" },
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, "PENDING");
  });

  if (globalSecret)
    test("unenrolled legacy signed bridge output does not require new binding envelope fields", async () => {
      const attemptId = crypto.randomUUID();
      await post("/pos/payments/card/authorize-v2", authorization(attemptId));
      const result = {
        status: "APPROVED",
        transactionId: "legacy-bank-reference",
      };
      const bridgeResponse = JSON.stringify(result);
      const response = await post(
        "/pos/payments/card/client-bridge-result-v2",
        {
          attemptId,
          result,
          bridgeResponse,
          bridgeSignature: signBridgePayload(bridgeResponse, globalSecret),
        },
      );
      assert.equal(response.status, 200);
      assert.equal((await response.json()).status, "APPROVED");
    });
}
