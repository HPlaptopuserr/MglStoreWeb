import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@mgl/database";
import { inventoryValuation } from "./inventory-valuation";

test("valuation uses exact purchase cost and reports only missing stocked costs", () => {
  const result = inventoryValuation([
    { quantity: 3, product: { costPrice: new Prisma.Decimal("0.10") } },
    { quantity: 2, product: { costPrice: new Prisma.Decimal("12.34") } },
    { quantity: 5, product: { costPrice: null } },
    { quantity: 1, product: { costPrice: new Prisma.Decimal(-1) } },
    { quantity: 0, product: { costPrice: null } },
    { quantity: 2, product: { costPrice: new Prisma.Decimal(0) } },
  ]);
  assert.deepEqual(result, { totalCost: "24.98", missingCostCount: 2 });
  assert.deepEqual(inventoryValuation([]), {
    totalCost: "0.00",
    missingCostCount: 0,
  });
});
