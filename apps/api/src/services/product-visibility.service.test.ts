import assert from "node:assert/strict";
import test from "node:test";
import { hasPublicProductState } from "./product-visibility.service";

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
