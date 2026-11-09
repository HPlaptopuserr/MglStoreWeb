import assert from "node:assert/strict";
import test from "node:test";
import {
  createRestaurantCardAttempt,
  createRestaurantCardSale,
} from "./restaurant-pos-api";

const input = {
  amount: 16000,
  registerId: "cashier-register",
  organizationId: "restaurant",
};

test("standalone approval is saved as a CARD sale with its payment reference", async (t) => {
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string | URL, init?: RequestInit) => {
      requests.push({
        url: String(url),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      return Response.json(
        requests.length === 1
          ? {
              attemptId: "manual-attempt",
              status: "APPROVED",
              transactionId: "manual-card-manual-attempt",
            }
          : { id: "sale", paymentMethod: "CARD" },
      );
    },
  );
  const attempt = await createRestaurantCardAttempt({
    ...input,
    standaloneCard: true,
  });
  assert.equal(attempt.status, "APPROVED");
  assert.ok(requests[0].url.endsWith("/pos/payments/card/authorize-v2"));
  const sale = await createRestaurantCardSale({
    ...input,
    shiftId: "shift",
    branchId: "branch",
    restaurantTicketId: "ticket",
    clientSaleId: "sale-request",
    total: input.amount,
    note: "",
    lines: [],
    cardAttemptId: attempt.attemptId,
    cardTransactionId: attempt.transactionId,
  });
  assert.equal(sale.paymentMethod, "CARD");
  assert.equal(requests[1].body.paymentMethod, "CARD");
  assert.deepEqual(requests[1].body.paymentBreakdown, [
    {
      method: "CARD",
      amount: 16000,
      attemptId: "manual-attempt",
      transactionId: "manual-card-manual-attempt",
    },
  ]);
});

test("configured terminals retain existing authorization and bridge requests", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string | URL, init?: RequestInit) => {
      assert.ok(String(url).endsWith("/pos/payments/card/authorize"));
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(body.clientBridge, true);
      assert.equal(body.terminalId, "connected-terminal");
      return Response.json({
        attemptId: "terminal-attempt",
        status: "PENDING",
      });
    },
  );
  const attempt = await createRestaurantCardAttempt({
    ...input,
    terminalId: "connected-terminal",
    clientBridge: true,
  });
  assert.equal(attempt.status, "PENDING");
});

test("registration errors are surfaced instead of reporting success", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ message: "Ээлж хаалттай" }, { status: 409 }),
  );
  await assert.rejects(
    createRestaurantCardAttempt({ ...input, standaloneCard: true }),
    /Ээлж хаалттай/,
  );
});
