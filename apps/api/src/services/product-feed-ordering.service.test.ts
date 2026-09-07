import assert from "node:assert/strict";
import test from "node:test";
import { orderRecommendedProductFeed } from "./product-feed-ordering.service";

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
