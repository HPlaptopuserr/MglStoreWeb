import assert from "node:assert/strict";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import express from "express";
import { prisma } from "@mgl/database";
import router from "./payments-report";

test("payments report scopes both queries to the organization/project and validates the year", async () => {
  const originals = {
    transaction: prisma.$transaction,
    schedules: prisma.barilgaPaymentSchedule.findMany,
    payments: prisma.barilgaPayment.findMany,
  };
  const queries: unknown[] = [];
  Reflect.set(
    prisma,
    "$transaction",
    async (callback: (tx: typeof prisma) => Promise<unknown>) =>
      callback(prisma),
  );
  Reflect.set(
    prisma.barilgaPaymentSchedule,
    "findMany",
    async (query: unknown) => {
      queries.push(query);
      return [];
    },
  );
  Reflect.set(prisma.barilgaPayment, "findMany", async (query: unknown) => {
    queries.push(query);
    return [];
  });
  const app = express();
  app.use((_req, res, next) => {
    res.locals.buildingScope = { id: "allowed-organization" };
    next();
  }, router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/admin/payments-report`;
  try {
    assert.equal(
      (await fetch(`${base}?year=2026&project=selected-project`)).status,
      200,
    );
    assert.equal(queries.length, 2);
    for (const query of queries) {
      const where = (
        query as {
          where: {
            reservation: {
              status: unknown;
              unit: { floor: { block: { project: unknown } } };
            };
          };
        }
      ).where;
      assert.deepEqual(where.reservation.unit.floor.block.project, {
        deletedAt: null,
        organization: { id: "allowed-organization" },
        id: "selected-project",
      });
      assert.deepEqual(where.reservation.status, {
        in: ["ACTIVE", "CONVERTED"],
      });
    }
    assert.equal((await fetch(`${base}?year=invalid`)).status, 400);
    assert.equal((await fetch(`${base}?year=2101`)).status, 400);
    assert.equal(queries.length, 2);
  } finally {
    Reflect.set(prisma, "$transaction", originals.transaction);
    Reflect.set(prisma.barilgaPaymentSchedule, "findMany", originals.schedules);
    Reflect.set(prisma.barilgaPayment, "findMany", originals.payments);
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
