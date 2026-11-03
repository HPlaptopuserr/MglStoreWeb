import assert from "node:assert/strict";
import test from "node:test";
import { filterSearchOptions, searchDestination } from "./search-model";

const categories = [
  { id: "shoes", name: "Гутал, цүнх", slug: "shoes-bags" },
  { id: "clothes", name: "Эмэгтэй хувцас", slug: "women-clothes" },
];

test("all and new searches encode Mongolian queries and never inherit old filters", () => {
  assert.equal(
    searchDestination("all", " гутал "),
    `/products?${new URLSearchParams({ search: "гутал" })}`,
  );
  const url = new URL(
    searchDestination("new", "гутал")!,
    "https://example.com",
  );
  assert.equal(url.searchParams.get("sort"), "newest");
  assert.equal(url.searchParams.get("search"), "гутал");
  assert.equal(url.searchParams.has("category"), false);
});

test("organization searches use the directory instead of the product catalog", () => {
  assert.equal(
    searchDestination("organizations", " MGL Store "),
    "/organizations?search=MGL+Store",
  );
  assert.equal(searchDestination("organizations", ""), "/organizations");
});

test("category submit resolves unique or exact matches, leaving ambiguous results open", () => {
  assert.equal(
    searchDestination("categories", "гутал", categories),
    "/products?category=shoes",
  );
  assert.equal(
    searchDestination("categories", "Гутал, цүнх", categories),
    "/products?category=shoes",
  );
  assert.equal(searchDestination("categories", "", categories), null);
  assert.equal(searchDestination("categories", "missing", categories), null);
  assert.deepEqual(
    filterSearchOptions(categories, "  ГУТАЛ   цүнх ").map((item) => item.id),
    ["shoes"],
  );
});
