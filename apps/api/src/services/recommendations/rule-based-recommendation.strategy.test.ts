import assert from "node:assert/strict";
import test from "node:test";
import { RuleBasedRecommendationStrategy } from "./rule-based-recommendation.strategy";
import type { RecommendationCandidate } from "./recommendation.types";

function candidate(
  overrides: Partial<RecommendationCandidate["features"]>,
): RecommendationCandidate {
  return {
    inventoryId: "inventory-1",
    productId: "product-1",
    product: {
      id: "product-1",
      name: "Test product",
      sku: "TEST-1",
      price: "1000",
      images: [],
      category: null,
      businessCategory: null,
    },
    features: {
      availableStock: 100,
      organizationStock: 0,
      personalRequestedQuantity90d: 0,
      personalRequestCount90d: 0,
      networkRequestedQuantity90d: 0,
      networkRequestCount90d: 0,
      networkOrganizationCount90d: 0,
      ...overrides,
    },
  };
}

const context = {
  organizationId: "organization-1",
  warehouseId: "warehouse-1",
  limit: 8,
};

test("does not expose a network recommendation below the privacy threshold", async () => {
  const strategy = new RuleBasedRecommendationStrategy();
  const results = await strategy.score(
    [
      candidate({
        networkRequestedQuantity90d: 200,
        networkRequestCount90d: 10,
        networkOrganizationCount90d: 2,
      }),
    ],
    context,
  );
  assert.equal(results.length, 0);
});

test("supports cold-start recommendations from privacy-safe network demand", async () => {
  const strategy = new RuleBasedRecommendationStrategy();
  const [result] = await strategy.score(
    [
      candidate({
        networkRequestedQuantity90d: 180,
        networkRequestCount90d: 20,
        networkOrganizationCount90d: 6,
      }),
    ],
    context,
  );
  assert.equal(result.reason, "NETWORK_TRENDING");
  assert.equal(result.suggestedQuantity, 5);
  assert.match(result.explanation, /6 дэлгүүр/);
});

test("caps the suggested quantity by available warehouse stock", async () => {
  const strategy = new RuleBasedRecommendationStrategy();
  const constrained = candidate({
    availableStock: 4,
    personalRequestedQuantity90d: 90,
    personalRequestCount90d: 5,
  });
  const [result] = await strategy.score([constrained], context);
  assert.equal(result.suggestedQuantity, 4);
  assert.equal(result.reason, "STOCK_REPLENISHMENT");
});
