import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express, { type Router as ExpressRouter } from "express";
import { createRequire } from "node:module";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import {
  bridgeRootKey,
  deriveBridgeSecret,
} from "../../../services/pos-bridge-keys";
import { signBridgePayload } from "../../../services/android-pgw-bridge";

const secret = "pgw-route-test-only-secret";
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const original: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, original);
  });
}
let server: Server;
let base: string;
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${jwt.sign({ userId: "cashier", organizationId: "store" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
};
const card = {
  id: "attempt",
  registerId: "register",
  organizationId: "store",
  terminalId: "terminal-1",
  amount: 100,
  status: "PENDING",
  providerPayload: { provider: "ANDROID_PGW", mode: "client-bridge" },
  consumedAt: null,
  saleReference: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  bridgeUrl: "http://127.0.0.1:7420",
  transactionId: null,
  message: null,
};
const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

before(async () => {
  process.env.POS_BRIDGE_SHARED_SECRET = secret;
  const routes = (
    createRequire(__filename)("./card-payments.routes") as {
      default: ExpressRouter;
    }
  ).default;
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
  stub(
    prisma,
    "$transaction",
    async (operation: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      operation(prisma),
  );
  stub(prisma, "$executeRaw", async () => 0);
  stub(prisma.posBridgeBinding, "findUnique", async () => null);
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
  stub(prisma.cardPaymentAttempt, "findUnique", async () => ({ ...card }));
  stub(prisma.posRegister, "findUnique", async () => ({
    id: "register",
    organizationId: "store",
    cardEnabled: true,
    cardProviderType: "ANDROID_PGW",
    terminalBridgeUrl: "http://127.0.0.1:7420",
    cardTerminalId: null,
    isActive: true,
    activationStatus: "APPROVED",
    deletedAt: null,
  }));
  stub(prisma.auditLog, "create", async () => ({}));
});

function usePairedCard() {
  const salt = "paired-card-salt";
  stub(prisma.posBridgeBinding, "findUnique", async () => ({
    id: "paired-card",
    registerId: card.registerId,
    credentialSalt: salt,
    revokedAt: null,
  }));
  stub(prisma.cardPaymentAttempt, "findUnique", async () => ({
    ...card,
    providerPayload: {
      ...card.providerPayload,
      bridgeBindingId: "paired-card",
    },
  }));
  return deriveBridgeSecret(card.registerId, salt, bridgeRootKey());
}

test("browser-forged APPROVED and a modified signed response cannot approve a paired payment", async () => {
  const pairedSecret = usePairedCard();
  let writes = 0;
  stub(prisma.cardPaymentAttempt, "updateMany", async () => {
    writes += 1;
  });
  const endpoint = "/pos/payments/card/client-bridge-result-v2";
  const result = {
    status: "APPROVED",
    attemptId: card.id,
    requestAmount: 100,
    requestedTerminalId: card.terminalId,
    provider: "ANDROID_PGW",
  };
  assert.equal(
    (await post(endpoint, { attemptId: card.id, result })).status,
    422,
  );
  const text = JSON.stringify(result);
  assert.equal(
    (
      await post(endpoint, {
        attemptId: card.id,
        result,
        bridgeResponse: text.replace("100", "200"),
        bridgeSignature: signBridgePayload(text, pairedSecret),
      })
    ).status,
    422,
  );
  assert.equal(writes, 0);
});

for (const change of [
  { attemptId: "other" },
  { requestAmount: 200 },
  { requestedTerminalId: "other" },
  { provider: "MOCK" },
]) {
  test(`signed evidence must belong to the original payment: ${JSON.stringify(change)}`, async () => {
    const pairedSecret = usePairedCard();
    const result = {
      status: "APPROVED",
      attemptId: card.id,
      requestAmount: 100,
      requestedTerminalId: card.terminalId,
      provider: "ANDROID_PGW",
      ...change,
    };
    const text = JSON.stringify(result);
    assert.equal(
      (
        await post("/pos/payments/card/client-bridge-result-v2", {
          attemptId: card.id,
          result,
          bridgeResponse: text,
          bridgeSignature: signBridgePayload(text, pairedSecret),
        })
      ).status,
      422,
    );
  });
}

test("valid signed PGW approval conditionally updates the original attempt", async () => {
  const pairedSecret = usePairedCard();
  const result = {
    status: "APPROVED",
    attemptId: card.id,
    requestAmount: 100,
    requestedTerminalId: card.terminalId,
    provider: "ANDROID_PGW",
    rrn: "001234567890",
  };
  const text = JSON.stringify(result);
  let writes = 0;
  stub(
    prisma.cardPaymentAttempt,
    "updateMany",
    async (input: {
      where: { status: string; consumedAt: unknown };
      data: { status: string; transactionId: string };
    }) => {
      assert.equal(input.where.status, "PENDING");
      assert.equal(input.where.consumedAt, null);
      assert.equal(input.data.status, "APPROVED");
      assert.equal(input.data.transactionId, "001234567890");
      writes += 1;
      return { count: 1 };
    },
  );
  stub(prisma.cardPaymentAttempt, "findUniqueOrThrow", async () => ({
    ...card,
    status: "APPROVED",
  }));
  const response = await post("/pos/payments/card/client-bridge-result-v2", {
    attemptId: card.id,
    result,
    bridgeResponse: text,
    bridgeSignature: signBridgePayload(text, pairedSecret),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "APPROVED");
  assert.equal(writes, 1);
});

test("an unsigned browser transport failure cannot release the paired pending terminal payment", async () => {
  usePairedCard();
  const response = await post("/pos/payments/card/client-bridge-result-v2", {
    attemptId: card.id,
    result: { status: "DECLINED" },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "PENDING");
});

test("paired status returns only a request signature, never the bridge key", async () => {
  const pairedSecret = usePairedCard();
  const response = await fetch(`${base}/pos/payments/card/status/${card.id}`, {
    headers,
  });
  const body = await response.json();
  assert.equal(
    body.bridgeRequestSignature,
    signBridgePayload(
      JSON.stringify({
        attemptId: card.id,
        amount: 100,
        terminalId: card.terminalId,
      }),
      pairedSecret,
    ),
  );
  assert.ok(!JSON.stringify(body).includes(pairedSecret));
});

test("void derives the real RRN from an approved sale and ignores browser bank references", async () => {
  stub(prisma.cardPaymentAttempt, "findFirst", async () => ({
    ...card,
    status: "APPROVED",
    saleReference: "sale",
    providerPayload: { provider: "ANDROID_PGW", rrn: "001234567890" },
  }));
  const response = await post("/pos/payments/android-pgw/command", {
    registerId: "register",
    operation: "void",
    attemptId: card.id,
    rrn: "forged",
    requestId: "forged",
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.command, {
    operation: "void",
    requestId: "void_attempt",
    terminalId: card.terminalId,
    rrn: "001234567890",
  });
  assert.equal(
    body.signature,
    signBridgePayload(JSON.stringify(body.command), secret),
  );
});

test("void cannot target a pending or foreign-register payment", async () => {
  stub(
    prisma.cardPaymentAttempt,
    "findFirst",
    async (input: {
      where: { registerId: string; organizationId: string };
    }) => {
      assert.equal(input.where.registerId, "register");
      assert.equal(input.where.organizationId, "store");
      return { ...card };
    },
  );
  assert.equal(
    (
      await post("/pos/payments/android-pgw/command", {
        registerId: "register",
        operation: "void",
        attemptId: card.id,
      })
    ).status,
    422,
  );
});

test("settlement uses a stable open-shift identity and verifies the signed command result", async () => {
  stub(prisma.posShift, "findFirst", async () => ({ id: "shift" }));
  const input = {
    registerId: "register",
    operation: "settlement",
    shiftId: "shift",
  };
  const prepared = await post("/pos/payments/android-pgw/command", input);
  const { command } = await prepared.json();
  assert.equal(command.requestId, "settlement_shift");
  const bridgeResponse = JSON.stringify({
    command,
    status: "APPROVED",
    parsed: { totalAmount: 10000 },
  });
  const response = await post("/pos/payments/android-pgw/command", {
    ...input,
    bridgeResponse,
    bridgeSignature: signBridgePayload(bridgeResponse, secret),
  });
  assert.equal((await response.json()).succeed, true);
  const forged = JSON.stringify({
    command: { ...command, requestId: "another-shift" },
    status: "APPROVED",
  });
  assert.equal(
    (
      await post("/pos/payments/android-pgw/command", {
        ...input,
        bridgeResponse: forged,
        bridgeSignature: signBridgePayload(forged, secret),
      })
    ).status,
    422,
  );
});

test("cancel authorization is bound to the original pending attempt and never marks it declined", async () => {
  stub(prisma.cardPaymentAttempt, "findFirst", async () => ({ ...card }));
  const input = {
    registerId: "register",
    operation: "cancel",
    attemptId: card.id,
  };
  const { command } = await (
    await post("/pos/payments/android-pgw/command", input)
  ).json();
  assert.equal(command.attemptId, card.id);
  const bridgeResponse = JSON.stringify({
    command,
    status: "FAILED",
    message: "Cancellation requested",
  });
  const response = await post("/pos/payments/android-pgw/command", {
    ...input,
    bridgeResponse,
    bridgeSignature: signBridgePayload(bridgeResponse, secret),
  });
  assert.equal((await response.json()).succeed, false);
});

test("other organizations cannot obtain terminal command signatures", async () => {
  stub(prisma.organizationMember, "count", async () => 0);
  const response = await post("/pos/payments/android-pgw/command", {
    registerId: "register",
    operation: "settlement",
    shiftId: "shift",
  });
  assert.equal(response.status, 403);
});

test("only a signed definitive decline permits a new settlement identity", async () => {
  stub(prisma.posShift, "findFirst", async () => ({ id: "retry-shift" }));
  const input = {
    registerId: "register",
    operation: "settlement",
    shiftId: "retry-shift",
  };
  const { command } = await (
    await post("/pos/payments/android-pgw/command", input)
  ).json();
  const body = JSON.stringify({ command, status: "DECLINED" });
  const previousDecline = { body, signature: signBridgePayload(body, secret) };
  const first = await (
    await post("/pos/payments/android-pgw/command", {
      ...input,
      previousDecline,
    })
  ).json();
  const second = await (
    await post("/pos/payments/android-pgw/command", {
      ...input,
      previousDecline,
    })
  ).json();
  assert.notEqual(first.command.requestId, command.requestId);
  assert.equal(first.command.requestId, second.command.requestId);
  for (const status of ["APPROVED", "FAILED"]) {
    const wrong = JSON.stringify({ command, status });
    assert.equal(
      (
        await post("/pos/payments/android-pgw/command", {
          ...input,
          previousDecline: {
            body: wrong,
            signature: signBridgePayload(wrong, secret),
          },
        })
      ).status,
      422,
    );
  }
  assert.equal(
    (
      await post("/pos/payments/android-pgw/command", {
        ...input,
        previousDecline: { ...previousDecline, signature: "forged" },
      })
    ).status,
    422,
  );
});

test("paired register command uses its own key and reserves its guard before returning authorization", async () => {
  const binding = {
    id: "paired-binding",
    registerId: "register",
    credentialSalt: "paired-salt",
    revokedAt: null,
    activeCommandId: null as string | null,
    hasUnresolvedOperation: false,
  };
  const events: string[] = [];
  stub(prisma, "$executeRaw", async () => {
    events.push("locked");
    return 0;
  });
  stub(prisma.posBridgeBinding, "findUnique", async () => {
    events.push("key-read");
    return { ...binding };
  });
  stub(
    prisma.posBridgeBinding,
    "update",
    async (input: { data: { activeCommandId: string } }) => {
      events.push("reserved");
      binding.activeCommandId = input.data.activeCommandId;
      return binding;
    },
  );
  stub(prisma.posShift, "findFirst", async () => ({ id: "paired-shift" }));
  const response = await post("/pos/payments/android-pgw/command", {
    registerId: "register",
    operation: "settlement",
    shiftId: "paired-shift",
  });
  assert.equal(response.status, 200, await response.clone().text());
  const result = await response.json();
  const pairedSecret = deriveBridgeSecret(
    "register",
    "paired-salt",
    bridgeRootKey(),
  );
  assert.equal(
    result.signature,
    signBridgePayload(JSON.stringify(result.command), pairedSecret),
  );
  assert.notEqual(
    result.signature,
    signBridgePayload(JSON.stringify(result.command), secret),
  );
  assert.equal(binding.activeCommandId, "settlement_paired-shift");
  assert.deepEqual(events, ["locked", "key-read", "key-read", "reserved"]);
});

for (const guard of [
  { activeCommandId: "another-command", hasUnresolvedOperation: false },
  { activeCommandId: null, hasUnresolvedOperation: true },
]) {
  test(`paired terminal rejects a different unresolved financial command ${JSON.stringify(guard)}`, async () => {
    stub(prisma.posBridgeBinding, "findUnique", async () => ({
      id: "binding",
      registerId: "register",
      credentialSalt: "salt",
      revokedAt: null,
      ...guard,
    }));
    stub(prisma.posShift, "findFirst", async () => ({ id: "blocked-shift" }));
    const response = await post("/pos/payments/android-pgw/command", {
      registerId: "register",
      operation: "settlement",
      shiftId: "blocked-shift",
    });
    assert.equal(response.status, 409);
  });
}

test("original command replay remains readable while the bridge reports it unresolved", async () => {
  const binding = {
    id: "binding",
    registerId: "register",
    credentialSalt: "salt",
    revokedAt: null,
    activeCommandId: "settlement_original",
    hasUnresolvedOperation: true,
  };
  stub(prisma.posBridgeBinding, "findUnique", async () => ({ ...binding }));
  stub(prisma.posBridgeBinding, "update", async () => binding);
  stub(prisma.posShift, "findFirst", async () => ({ id: "original" }));
  assert.equal(
    (
      await post("/pos/payments/android-pgw/command", {
        registerId: "register",
        operation: "settlement",
        shiftId: "original",
      })
    ).status,
    200,
  );
});

for (const status of ["APPROVED", "DECLINED", "FAILED"]) {
  test(`verified ${status} command clears only a definitive matching guard`, async () => {
    const command = {
      operation: "settlement",
      requestId: "settlement_verified",
      terminalId: "terminal-1",
    };
    const binding = {
      id: "binding",
      registerId: "register",
      credentialSalt: "salt",
      revokedAt: null,
      activeCommandId: command.requestId,
      hasUnresolvedOperation: false,
    };
    stub(prisma.posBridgeBinding, "findUnique", async () => ({ ...binding }));
    stub(prisma.posShift, "findFirst", async () => ({ id: "verified" }));
    let cleared = false;
    stub(
      prisma.posBridgeBinding,
      "updateMany",
      async (input: {
        where: { id: string; activeCommandId: string; revokedAt: unknown };
        data: { activeCommandId: unknown };
      }) => {
        assert.deepEqual(input.where, {
          id: binding.id,
          activeCommandId: command.requestId,
          revokedAt: null,
        });
        assert.equal(input.data.activeCommandId, null);
        cleared = true;
        return { count: 1 };
      },
    );
    const bridgeResponse = JSON.stringify({ command, status });
    const response = await post("/pos/payments/android-pgw/command", {
      registerId: "register",
      operation: "settlement",
      shiftId: "verified",
      bridgeResponse,
      bridgeSignature: signBridgePayload(
        bridgeResponse,
        deriveBridgeSecret("register", "salt", bridgeRootKey()),
      ),
    });
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal((await response.json()).succeed, status === "APPROVED");
    assert.equal(cleared, status !== "FAILED");
  });
}

test("legacy key and another register's key cannot verify a paired terminal result", async () => {
  stub(prisma.posBridgeBinding, "findUnique", async () => ({
    id: "binding",
    registerId: "register",
    credentialSalt: "salt",
    revokedAt: null,
    activeCommandId: "settlement_isolated",
    hasUnresolvedOperation: false,
  }));
  stub(prisma.posShift, "findFirst", async () => ({ id: "isolated" }));
  const command = {
    operation: "settlement",
    requestId: "settlement_isolated",
    terminalId: "terminal-1",
  };
  const bridgeResponse = JSON.stringify({ command, status: "APPROVED" });
  for (const wrongSecret of [
    secret,
    deriveBridgeSecret("another-register", "salt", bridgeRootKey()),
  ]) {
    const response = await post("/pos/payments/android-pgw/command", {
      registerId: "register",
      operation: "settlement",
      shiftId: "isolated",
      bridgeResponse,
      bridgeSignature: signBridgePayload(bridgeResponse, wrongSecret),
    });
    assert.equal(response.status, 422);
  }
});

test("revoked pairing never falls back to the deployment-wide key", async () => {
  stub(prisma.posBridgeBinding, "findUnique", async () => ({
    id: "binding",
    registerId: "register",
    credentialSalt: "salt",
    revokedAt: new Date(),
  }));
  const response = await post("/pos/payments/android-pgw/command", {
    registerId: "register",
    operation: "settlement",
    shiftId: "shift",
  });
  assert.equal(response.status, 409);
});

test("a paired purchase cancellation does not replace its financial command guard", async () => {
  stub(prisma.posBridgeBinding, "findUnique", async () => ({
    id: "binding",
    registerId: "register",
    credentialSalt: "salt",
    revokedAt: null,
    activeCommandId: "existing-financial-command",
    hasUnresolvedOperation: true,
  }));
  stub(prisma.cardPaymentAttempt, "findFirst", async () => ({ ...card }));
  const response = await post("/pos/payments/android-pgw/command", {
    registerId: "register",
    operation: "cancel",
    attemptId: card.id,
  });
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).command.attemptId, card.id);
});

test("a late signed result cannot clear a newer command's guard", async () => {
  const binding = {
    id: "binding",
    registerId: "register",
    credentialSalt: "salt",
    revokedAt: null,
    activeCommandId: "newer-command",
    hasUnresolvedOperation: false,
  };
  stub(prisma.posBridgeBinding, "findUnique", async () => ({ ...binding }));
  stub(prisma.posShift, "findFirst", async () => ({ id: "older-shift" }));
  stub(
    prisma.posBridgeBinding,
    "updateMany",
    async (input: { where: { activeCommandId: string } }) => {
      const matches = binding.activeCommandId === input.where.activeCommandId;
      if (matches) binding.activeCommandId = "";
      return { count: matches ? 1 : 0 };
    },
  );
  const command = {
    operation: "settlement",
    requestId: "settlement_older-shift",
    terminalId: "terminal-1",
  };
  const bridgeResponse = JSON.stringify({ command, status: "APPROVED" });
  const response = await post("/pos/payments/android-pgw/command", {
    registerId: "register",
    operation: "settlement",
    shiftId: "older-shift",
    bridgeResponse,
    bridgeSignature: signBridgePayload(
      bridgeResponse,
      deriveBridgeSecret("register", "salt", bridgeRootKey()),
    ),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).succeed, true);
  assert.equal(binding.activeCommandId, "newer-command");
});
