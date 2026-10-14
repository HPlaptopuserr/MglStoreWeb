import assert from "node:assert/strict";
import test from "node:test";
import {
  findOrganizationCatalogSearchPage,
  type CatalogSearchCandidate,
} from "./organization-catalog-search.service";

function product(id: string, name: string): CatalogSearchCandidate {
  return {
    id,
    name,
    sku: `${id}-MGL-001`,
    barcode: null,
    barcodeAliases: [],
    description: "Mgl Cafe Latte",
    classificationCode: "6212991",
    taxProductCode: null,
    marketplacePriority: 0,
    createdAt: new Date("2026-10-14"),
    businessCategory: null,
    organization: { id: "store", name: "Mgl Cafe Latte" },
  };
}

const rows = [
  product("coffee", "Mgl Cafe Latte"),
  product("other", "Matcha latte"),
  product("raisins", "uzem 500gr"),
];

test("shared MGL SKU and store metadata do not admit unrelated products", async () => {
  const result = await findOrganizationCatalogSearchPage(
    { where: {}, search: "Mgl Cafe Latte", offset: 0, limit: 24 },
    async () => rows,
  );
  assert.deepEqual(result, { ids: ["coffee"], total: 1 });
});

test("all terms filter before paging and no match returns zero", async () => {
  const find = (search: string, offset = 0) =>
    findOrganizationCatalogSearchPage(
      { where: {}, search, offset, limit: 1 },
      async () => rows,
    );
  assert.deepEqual(await find(" latte  CAFE "), { ids: ["coffee"], total: 1 });
  assert.deepEqual(await find("latte", 1), { ids: ["other"], total: 2 });
  assert.deepEqual(await find("missing latte"), { ids: [], total: 0 });
});

test("SKU, barcode and barcode aliases remain searchable with leading zeros", async () => {
  const coded = {
    ...rows[0],
    barcode: "00123456789",
    barcodeAliases: ["00987654321"],
  };
  for (const search of [
    "coffee-MGL-001",
    coded.barcode,
    coded.barcodeAliases[0],
  ]) {
    const result = await findOrganizationCatalogSearchPage(
      { where: {}, search, offset: 0, limit: 24 },
      async () => [coded, rows[1]],
    );
    assert.deepEqual(result, { ids: ["coffee"], total: 1 });
  }
});
