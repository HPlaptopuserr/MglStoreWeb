import { test } from "node:test";
import { strict as assert } from "node:assert";
import { rankMasterCatalog } from "./master-catalog-search.service";
const rows = [
  {
    id: "milk",
    canonicalName: "Сүү 1 л",
    barcode: "8651234567890",
    brand: "Fresh",
    categoryName: "Сүүн бүтээгдэхүүн",
    description: null,
    aliases: [{ value: "Old milk" }],
  },
  {
    id: "cola",
    canonicalName: "Coca Cola 330 мл",
    barcode: "4890000000001",
    brand: "Coca Cola",
    categoryName: "Ундаа",
    description: null,
    aliases: [],
  },
];
test("shared search ranks exact barcode and retains aliases, brands and categories", () => {
  assert.equal(rankMasterCatalog(rows, "8651234567890")[0], "milk");
  assert.equal(rankMasterCatalog(rows, "Old milk")[0], "milk");
  assert.equal(rankMasterCatalog(rows, "Fresh")[0], "milk");
  assert.equal(rankMasterCatalog(rows, "Ундаа")[0], "cola");
  assert.equal(rankMasterCatalog(rows, "cola coca")[0], "cola");
  assert.deepEqual(rankMasterCatalog(rows, "zzzzzzzzzzz"), []);
  assert.deepEqual(rankMasterCatalog(rows, ""), ["milk", "cola"]);
});
