import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogItem } from "./catalog-test-fixtures";
import { groupCatalogItems } from "./catalog-data";

test("catalog filters stock without discarding low stock; excludes inactive products", () => {
  const inactive = catalogItem("inactive");
  inactive.product.isActive = false;
  const items = [
    catalogItem("available"),
    catalogItem("low", { quantity: 1 }),
    catalogItem("out", { quantity: 0 }),
    inactive,
  ];
  assert.deepEqual(
    groupCatalogItems(items, true).flatMap((group) =>
      group.items.map((item) => item.id),
    ),
    ["available", "low"],
  );
  assert.equal(groupCatalogItems(items, false)[0].items.length, 3);
  assert.equal(items.length, 4);
});

test("catalog groups by full category path and preserves unclassified items", () => {
  const tea = catalogItem("tea");
  tea.product.businessCategory = {
    id: "tea",
    name: "Цай",
    parent: { id: "drinks", name: "Ундаа" },
  };
  const groups = groupCatalogItems([tea, catalogItem("other")], false);
  assert.deepEqual(
    new Set(groups.map((group) => group.name)),
    new Set(["Ундаа / Цай", "Ангилалгүй"]),
  );
});
