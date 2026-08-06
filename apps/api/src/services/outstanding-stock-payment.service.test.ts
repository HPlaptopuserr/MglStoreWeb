import assert from "node:assert/strict";
import test from "node:test";
import { PaymentStatus, StockRequestStatus } from "@mgl/database";
import { outstandingStockPaymentWhere } from "./outstanding-stock-payment.service";

test("outstanding payment lookup is scoped to the selected store", () => {
  const storeA = outstandingStockPaymentWhere("store-a");
  const storeB = outstandingStockPaymentWhere("store-b");

  assert.equal(storeA.organizationId, "store-a");
  assert.equal(storeB.organizationId, "store-b");
  assert.notDeepEqual(storeA, storeB);
  assert.deepEqual(storeA.request, {
    status: {
      notIn: [StockRequestStatus.CANCELLED, StockRequestStatus.REJECTED],
    },
  });
  assert.deepEqual(storeA.status, { not: PaymentStatus.CANCELLED });
});

test("the current payment can be excluded without widening store scope", () => {
  const where = outstandingStockPaymentWhere("store-a", "payment-current");

  assert.equal(where.organizationId, "store-a");
  assert.deepEqual(where.id, { not: "payment-current" });
});
