const assert = require("node:assert/strict");
const test = require("node:test");
const {
  assertNoInventoryDuplicates,
  missingInventoryIndexes,
} = require("./check-inventory-guards.cjs");

const counts = [
  { check_name: "warehouse_sku_duplicates", duplicate_groups: 0 },
  { check_name: "active_stocktake_duplicates", duplicate_groups: 0 },
];
const indexes = [
  [
    "Product_warehouse_owned_sku_key",
    "Product",
    ["managedByWarehouseId", "sku"],
  ],
  ["Stocktake_active_direct_key", "Stocktake", ["organizationId"]],
  [
    "Stocktake_active_warehouse_key",
    "Stocktake",
    ["organizationId", "warehouseId"],
  ],
].map(([index_name, table_name, columns]) => ({
  index_name,
  table_name,
  columns,
  is_unique: true,
  is_valid: true,
  is_partial: true,
}));

test("inventory preflight blocks existing duplicate SKU or open stocktake groups", () => {
  assert.doesNotThrow(() => assertNoInventoryDuplicates(counts));
  for (const row of counts)
    assert.throws(
      () =>
        assertNoInventoryDuplicates(
          counts.map((item) =>
            item === row ? { ...item, duplicate_groups: 5 } : item,
          ),
        ),
      /release blocked/,
    );
});
test("missing or malformed duplicate counts fail closed", () => {
  for (const rows of [
    [],
    counts.slice(1),
    [{ ...counts[0], duplicate_groups: "0" }, counts[1]],
  ])
    assert.throws(() => assertNoInventoryDuplicates(rows), /valid/);
});
test("all required inventory indexes must be unique, valid and partial on the expected columns", () => {
  assert.deepEqual(missingInventoryIndexes(indexes), []);
  assert.equal(missingInventoryIndexes([]).length, 3);
  for (const change of [
    { is_unique: false },
    { is_valid: false },
    { is_partial: false },
    { table_name: "Other" },
    { columns: ["sku", "managedByWarehouseId"] },
  ]) {
    assert.deepEqual(
      missingInventoryIndexes([
        { ...indexes[0], ...change },
        ...indexes.slice(1),
      ]),
      [indexes[0].index_name],
    );
  }
});
