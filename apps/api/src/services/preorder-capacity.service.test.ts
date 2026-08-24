import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import {
  getPreorderParticipantIds,
  resolvePreorderCapacityProgress,
} from "./preorder-capacity.service";

test("preorder capacity counts one customer once across multiple orders", async () => {
  const db = {
    order: {
      findMany: async () => [
        {
          customerId: "customer-1",
          items: [{ productId: "product-1" }, { productId: "product-1" }],
        },
        {
          customerId: "customer-1",
          items: [{ productId: "product-1" }],
        },
        {
          customerId: "customer-2",
          items: [{ productId: "product-1" }],
        },
      ],
    },
  } as unknown as PrismaClient;

  const participants = await getPreorderParticipantIds(db, ["product-1"]);

  assert.deepEqual([...(participants.get("product-1") ?? new Set())].sort(), [
    "customer-1",
    "customer-2",
  ]);
});

test("preorder capacity becomes full at the configured participant count", () => {
  assert.deepEqual(resolvePreorderCapacityProgress(50, 49), {
    preorderParticipantCount: 49,
    preorderRemaining: 1,
    preorderIsFull: false,
  });
  assert.deepEqual(resolvePreorderCapacityProgress(50, 50), {
    preorderParticipantCount: 50,
    preorderRemaining: 0,
    preorderIsFull: true,
  });
});

test("preorder without a capacity stays open", () => {
  assert.deepEqual(resolvePreorderCapacityProgress(null, 12), {
    preorderParticipantCount: 12,
    preorderRemaining: null,
    preorderIsFull: false,
  });
});
