import assert from "node:assert/strict";
import test from "node:test";
import { resolveMarketplaceProductPricing } from "@mgl/types";

test("preorder products keep the base price for public customers", () => {
  const pricing = resolveMarketplaceProductPricing("100000", {
    supplyType: "CHINA_PREORDER",
    isMember: false,
    isStoreOwner: false,
  });
  assert.equal(pricing.price, 100_000);
  assert.equal(pricing.active, false);
});

test("preorder products receive a 5 percent member discount", () => {
  const pricing = resolveMarketplaceProductPricing("100000", {
    supplyType: "CHINA_PREORDER",
    isMember: true,
    isStoreOwner: false,
  });
  assert.equal(pricing.price, 95_000);
  assert.equal(pricing.label, "Гишүүн -5%");
});

test("store owners receive 10 percent even without membership", () => {
  const pricing = resolveMarketplaceProductPricing("100000", {
    supplyType: "CHINA_PREORDER",
    isMember: false,
    isStoreOwner: true,
  });
  assert.equal(pricing.price, 90_000);
  assert.equal(pricing.label, "Дэлгүүрийн эзэн -10%");
});

test("configured discounts stay member-only for in-stock products", () => {
  assert.equal(
    resolveMarketplaceProductPricing(50_000, {
      supplyType: "IN_STOCK",
      memberDiscountPercent: 20,
      isMember: true,
      isStoreOwner: false,
    }).price,
    40_000,
  );
  assert.equal(
    resolveMarketplaceProductPricing(50_000, {
      supplyType: "IN_STOCK",
      memberDiscountPercent: 20,
      isMember: false,
      isStoreOwner: false,
    }).price,
    50_000,
  );
});
