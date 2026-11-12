import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchInventoryForExport } from "./inventory.api";
import { catalogItem } from "./catalog-test-fixtures";

test("export fetches all 1,096 matching items across 11 pages with the same warehouse and filters", async () => {
  const originalFetch = globalThis.fetch;
  const pages: number[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.ok(url.pathname.endsWith("/warehouses/central/inventory"));
    assert.equal(url.searchParams.get("search"), "цай");
    assert.equal(url.searchParams.get("status"), "healthy");
    assert.equal(url.searchParams.get("limit"), "100");
    assert.ok(init?.signal);
    const page = Number(url.searchParams.get("page"));
    pages.push(page);
    const count = page === 11 ? 96 : 100;
    return Response.json({
      inventory: Array.from({ length: count }, (_, index) =>
        catalogItem(String((page - 1) * 100 + index)),
      ),
      pagination: { total: 1096, totalPages: 11 },
    });
  };
  try {
    const items = await fetchInventoryForExport(
      { warehouseId: "central", search: "цай", status: "healthy" },
      new AbortController().signal,
    );
    assert.equal(items.length, 1096);
    assert.equal(new Set(items.map((item) => item.id)).size, 1096);
    assert.deepEqual(
      pages,
      Array.from({ length: 11 }, (_, index) => index + 1),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("export rejects duplicate rows instead of downloading an incomplete catalog", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      inventory: [catalogItem("same")],
      pagination: { total: 2, totalPages: 2 },
    });
  try {
    await assert.rejects(
      fetchInventoryForExport(
        { warehouseId: "central", search: "", status: "all" },
        new AbortController().signal,
      ),
      /өөрчлөгдсөн/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
