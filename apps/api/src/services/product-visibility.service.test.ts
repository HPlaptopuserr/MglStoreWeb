import assert from "node:assert/strict";
import test from "node:test";
import {
  hasPublicProductCatalogQuality,
  hasPublicProductState,
} from "./product-visibility.service";

const activeOrganization = { status: "ACTIVE", deletedAt: null };

test("active storefront products remain public regardless of review workflow", () => {
  assert.equal(
    hasPublicProductState({
      isActive: true,
      deletedAt: null,
      organization: activeOrganization,
    }),
    true,
  );
});

test("inactive, deleted, or closed storefront products are not public", () => {
  assert.equal(
    hasPublicProductState({
      isActive: false,
      deletedAt: null,
      organization: activeOrganization,
    }),
    false,
  );
  assert.equal(
    hasPublicProductState({
      isActive: true,
      deletedAt: new Date(),
      organization: activeOrganization,
    }),
    false,
  );
  assert.equal(
    hasPublicProductState({
      isActive: true,
      deletedAt: null,
      organization: { status: "SUSPENDED", deletedAt: null },
    }),
    false,
  );
});

test("public catalog requires a usable name, price, and image", () => {
  assert.equal(
    hasPublicProductCatalogQuality({
      name: "Бүтээгдэхүүн",
      price: 5_000,
      images: [{ id: "image-1" }],
    }),
    true,
  );
  assert.equal(
    hasPublicProductCatalogQuality({
      name: "   ",
      price: 5_000,
      images: [{ id: "image-1" }],
    }),
    false,
  );
  assert.equal(
    hasPublicProductCatalogQuality({
      name: "Бүтээгдэхүүн",
      price: 5_000,
      images: [],
    }),
    false,
  );
  assert.equal(
    hasPublicProductCatalogQuality({
      name: "Бүтээгдэхүүн",
      price: 0,
      images: [{ id: "image-1" }],
    }),
    false,
  );
});
