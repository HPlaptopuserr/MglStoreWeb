import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import archiveRoutes from "./checkout-recovery-archive.routes";
import cardRoutes from "./card-payments.routes";
import { JWT_SECRET } from "./_shared";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled = process.env.MISSING_CARD_ARCHIVE_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_card_recovery_test_");

test("a missing request archive blocks a later old-tab authorization while preserving existing payments", { skip: !enabled }, async () => {
  const app = express();
  app.use(express.json(), archiveRoutes, cardRoutes);
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const key = randomUUID();
    const org = await prisma.organization.create({ data: { name: "Missing card test", slug: key, taxId: key, status: "ACTIVE" } });
    const user = await prisma.user.create({ data: { email: `${key}@missing-card.invalid` } });
    await prisma.organizationMember.create({ data: { organizationId: org.id, userId: user.id, role: "STAFF", capabilities: ["POS_CASHIER"], isPrimary: true } });
    const branch = await prisma.branch.create({ data: { organizationId: org.id, name: "Test", address: "Test" } });
    const register = await prisma.posRegister.create({ data: { organizationId: org.id, branchId: branch.id, name: "Manual test", isActive: true, activationStatus: "APPROVED", cardEnabled: false } });
    const headers = { Authorization: `Bearer ${jwt.sign({ userId: user.id, organizationId: org.id }, JWT_SECRET)}`, "Content-Type": "application/json" };
    const post = (path: string, body: object) => fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
    const attemptId = randomUUID();
    const clientSaleId = randomUUID();
    const snapshot = JSON.stringify({ clientSaleId, registerId: register.id, cart: [{ productId: "preserved" }], paymentEntries: [{ id: "entry", method: "CARD", status: "pending", amount: 25100, attemptId }] });
    const archiveBody = { organizationId: org.id, registerId: register.id, clientSaleId, reason: "MISSING_CARD_ATTEMPT", snapshot };
    const archived = await post("/pos/payments/recovery/archive", archiveBody);
    assert.equal(archived.status, 200, await archived.clone().text());
    const proof = await archived.json() as { archiveId: string };
    const retry = await post("/pos/payments/recovery/archive", archiveBody);
    assert.deepEqual(await retry.json(), proof);
    const rejected = await post("/pos/payments/card/authorize-v2", { organizationId: org.id, registerId: register.id, attemptId, amount: 25100 });
    assert.equal(rejected.status, 409, await rejected.clone().text());
    assert.equal(await prisma.cardPaymentAttempt.count({ where: { id: attemptId } }), 0);
    const realId = randomUUID();
    const created = await post("/pos/payments/card/authorize-v2", { organizationId: org.id, registerId: register.id, attemptId: realId, amount: 25100 });
    assert.equal(created.status, 201, await created.clone().text());
    const realSnapshot = JSON.stringify({ clientSaleId, registerId: register.id, paymentEntries: [{ method: "CARD", status: "pending", amount: 25100, attemptId: realId }] });
    assert.equal((await post("/pos/payments/recovery/archive", { ...archiveBody, snapshot: realSnapshot })).status, 409);
    const existing = await post("/pos/payments/card/authorize-v2", { organizationId: org.id, registerId: register.id, attemptId: realId, amount: 25100 });
    assert.equal(existing.status, 200, await existing.clone().text());
    assert.equal(await prisma.cardPaymentAttempt.count({ where: { id: realId } }), 1);
    for (let run = 0; run < 5; run += 1) {
      const racingId = randomUUID();
      const checkoutId = randomUUID();
      const racingSnapshot = JSON.stringify({ clientSaleId: checkoutId, registerId: register.id, paymentEntries: [{ method: "CARD", status: "pending", amount: 100, attemptId: racingId }] });
      const [archiveResult, authorizeResult] = await Promise.all([
        post("/pos/payments/recovery/archive", { ...archiveBody, clientSaleId: checkoutId, snapshot: racingSnapshot }),
        post("/pos/payments/card/authorize-v2", { organizationId: org.id, registerId: register.id, attemptId: racingId, amount: 100 }),
      ]);
      assert.ok((archiveResult.status === 200 && authorizeResult.status === 409) ||
        (archiveResult.status === 409 && authorizeResult.status === 201),
      `archive=${archiveResult.status}, authorize=${authorizeResult.status}`);
      assert.equal(await prisma.cardPaymentAttempt.count({ where: { id: racingId } }), authorizeResult.status === 201 ? 1 : 0);
    }

  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
});
