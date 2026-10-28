import assert from "node:assert/strict";
import test from "node:test";
import { createSale } from "./create-sale";
import { PosApiError } from "./_pos-client";
import type { SalePayload } from "../types/pos.types";

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
