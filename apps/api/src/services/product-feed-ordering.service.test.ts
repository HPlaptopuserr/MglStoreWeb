import assert from "node:assert/strict";
import test from "node:test";
import {
  hasConnectedStorefront,
  orderRecommendedProductFeed,
} from "./product-feed-ordering.service";

type Product = {
  id: string;
  marketplacePriority: number;
  organizationId: string;
  businessCategoryId: string;
  rank: number;
};

test("keeps priority products first and diversifies category and organization", () => {
  const products: Product[] = [
    {
      id: "a",
      marketplacePriority: 10,
      organizationId: "org-1",
      businessCategoryId: "cat-1",
      rank: 10,
    },
    {
      id: "b",
      marketplacePriority: 10,
      organizationId: "org-1",
      businessCategoryId: "cat-1",
      rank: 9,
    },
    {
      id: "c",
      marketplacePriority: 10,
      organizationId: "org-2",
      businessCategoryId: "cat-2",
      rank: 8,
    },
    {
      id: "d",
      marketplacePriority: 0,
      organizationId: "org-3",
      businessCategoryId: "cat-3",
      rank: 100,
    },
  ];

  const ordered = orderRecommendedProductFeed(
    products,
    (product) => product.rank,
  );

  assert.deepEqual(
    ordered.map(({ id }) => id),
    ["a", "c", "b", "d"],
  );
});

test("falls back without dropping products when diversity is impossible", () => {
  const products: Product[] = [
    {
      id: "a",
      marketplacePriority: 0,
      organizationId: "org-1",
      businessCategoryId: "cat-1",
      rank: 2,
    },
    {
      id: "b",
      marketplacePriority: 0,
      organizationId: "org-1",
      businessCategoryId: "cat-1",
      rank: 1,
    },
  ];

  assert.deepEqual(
    orderRecommendedProductFeed(products, (product) => product.rank).map(
      ({ id }) => id,
    ),
    ["a", "b"],
  );
});

test("connected storefronts precede marketplace priority and diversity alternatives", () => {
  const products: Product[] = [
    {
      id: "other",
      marketplacePriority: 100,
      organizationId: "other",
      businessCategoryId: "other",
      rank: 100,
    },
    {
      id: "ready-a",
      marketplacePriority: 0,
      organizationId: "ready",
      businessCategoryId: "same",
      rank: 2,
    },
    {
      id: "ready-b",
      marketplacePriority: 0,
      organizationId: "ready",
      businessCategoryId: "same",
      rank: 1,
    },
  ];
  const ordered = orderRecommendedProductFeed(
    products,
    (p) => p.rank,
    (p) => p.organizationId === "ready",
  );
  assert.deepEqual(
    ordered.map((p) => p.id),
    ["ready-a", "ready-b", "other"],
  );
  assert.equal(products[0].id, "other", "input remains unchanged");
});

test("storefront connection requires email, phone and an enabled seller merchant", () => {
  const connected = {
    email: "shop@example.com",
    phone: "99112233",
    qpayEnabled: true,
    qpayMerchantId: "seller",
  };
  assert.equal(hasConnectedStorefront(connected), true);
  assert.equal(
    hasConnectedStorefront({
      email: connected.email,
      phone: connected.phone,
      webQpayEnabled: true,
      webQpayMerchantId: "web-seller",
    }),
    true,
  );
  for (const incomplete of [
    { ...connected, email: null },
    { ...connected, email: "   " },
    { ...connected, phone: "  " },
    { ...connected, qpayEnabled: false },
    { ...connected, qpayMerchantId: null },
    { ...connected, qpayMerchantId: " " },
    {},
  ]) {
    assert.equal(hasConnectedStorefront(incomplete), false);
  }
});
