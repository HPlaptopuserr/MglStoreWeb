import assert from "node:assert/strict";
import test from "node:test";
import { createSale } from "./create-sale";
import { PosApiError } from "./_pos-client";
import type { SalePayload } from "../types/pos.types";

test("a missing sale or product never completes cash, credit or transaction-only payments locally", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response('{"message":"Бараа олдсонгүй"}', { status: 404 });
  const base: SalePayload = {
    clientSaleId: "missing-product",
    organizationId: "org",
    registerId: "register",
    shiftId: "shift",
    branchId: "branch",
    paymentMethod: "CASH",
    lines: [
      {
        productId: "missing",
        qty: 1,
        priceType: "UNIT",
        unitPrice: 1000,
        discountAmount: 0,
        taxRate: 0,
      },
    ],
  };
  const variants: SalePayload[] = [
    base,
    { ...base, paymentBreakdown: [{ method: "CASH", amount: 1000 }] },
    {
      ...base,
      paymentMethod: "CREDIT",
      paymentBreakdown: [{ method: "CREDIT", amount: 1000 }],
    },
    {
      ...base,
      paymentMethod: "CARD",
      paymentBreakdown: [
        { method: "CARD", amount: 1000, transactionId: "paid-transaction" },
      ],
    },
  ];
  try {
    for (const payload of variants) {
      await assert.rejects(
        createSale(payload),
        (error: unknown) =>
          error instanceof PosApiError && error.status === 404,
      );
    }
  } finally {
    globalThis.fetch = previous;
  }
});

test("successful sales return the server receipt and retain the idempotency key", async () => {
  const previous = globalThis.fetch;
  const receipt = { id: "server-sale", receiptNo: "server-receipt" };
  globalThis.fetch = async (_url, options) => {
    const body: unknown = JSON.parse(String(options?.body));
    assert.ok(body && typeof body === "object" && "clientSaleId" in body);
    assert.equal(body.clientSaleId, "same-sale-on-retry");
    return Response.json(receipt);
  };
  try {
    assert.deepEqual(
      await createSale({
        clientSaleId: "same-sale-on-retry",
        branchId: "branch",
        shiftId: "shift",
        paymentMethod: "CASH",
        lines: [],
      }),
      receipt,
    );
  } finally {
    globalThis.fetch = previous;
  }
});

test("missing sale endpoint never produces a mock receipt for an existing card or QR payment", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response('{"message":"Not found"}', { status: 404 });
  const base: SalePayload = {
    clientSaleId: "recovery-paid",
    organizationId: "org",
    registerId: "register",
    shiftId: "shift",
    branchId: "branch",
    paymentMethod: "CARD",
    lines: [
      {
        productId: "product",
        qty: 2,
        priceType: "UNIT",
        unitPrice: 19570,
        discountAmount: 0,
        taxRate: 0,
      },
    ],
  };
  try {
    await assert.rejects(
      createSale({
        ...base,
        paymentBreakdown: [
          { method: "CARD", amount: 39140, attemptId: "paid-attempt" },
        ],
      }),
      (error: unknown) => error instanceof PosApiError && error.status === 404,
    );
    await assert.rejects(
      createSale({
        ...base,
        paymentMethod: "QR",
        paymentBreakdown: [
          { method: "QR", amount: 39140, invoiceId: "paid-invoice" },
        ],
      }),
      (error: unknown) => error instanceof PosApiError && error.status === 404,
    );
  } finally {
    globalThis.fetch = previous;
  }
});
