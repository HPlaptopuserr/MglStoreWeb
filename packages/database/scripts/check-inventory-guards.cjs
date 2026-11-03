const { PrismaClient } = require("@prisma/client");

const requiredIndexes = {
  Product_warehouse_owned_sku_key: ["Product", ["managedByWarehouseId", "sku"]],
  Stocktake_active_direct_key: ["Stocktake", ["organizationId"]],
  Stocktake_active_warehouse_key: [
    "Stocktake",
    ["organizationId", "warehouseId"],
  ],
};

function assertNoInventoryDuplicates(rows) {
  for (const name of [
    "warehouse_sku_duplicates",
    "active_stocktake_duplicates",
  ]) {
    const count = rows.find((row) => row.check_name === name)?.duplicate_groups;
    if (!Number.isSafeInteger(count) || count < 0)
      throw new Error(
        `Inventory preflight did not return a valid ${name} count.`,
      );
    if (count > 0)
      throw new Error(
        `Inventory release blocked: ${name} has ${count} duplicate group(s). Review existing records before deployment; no records were changed.`,
      );
  }
}

function missingInventoryIndexes(rows) {
  return Object.entries(requiredIndexes).flatMap(([name, [table, columns]]) => {
    const row = rows.find((candidate) => candidate.index_name === name);
    return row?.table_name === table &&
      row.is_unique &&
      row.is_valid &&
      row.is_partial &&
      Array.isArray(row.columns) &&
      row.columns.length === columns.length &&
      columns.every((column, index) => row.columns[index] === column)
      ? []
      : [name];
  });
}

async function checkInventoryGuards({ requireIndexes = false } = {}) {
  const client = new PrismaClient();
  try {
    const duplicates = await client.$queryRaw`
      SELECT 'warehouse_sku_duplicates' AS check_name, COUNT(*)::integer AS duplicate_groups
      FROM (
        SELECT "managedByWarehouseId", sku FROM "Product"
        WHERE "organizationId" IS NULL AND "managedByWarehouseId" IS NOT NULL AND sku IS NOT NULL
        GROUP BY "managedByWarehouseId", sku HAVING COUNT(*) > 1
      ) duplicates
      UNION ALL
      SELECT 'active_stocktake_duplicates', COUNT(*)::integer
      FROM (
        SELECT "organizationId", "warehouseId" FROM "Stocktake"
        WHERE status IN ('DRAFT', 'REVIEW')
        GROUP BY "organizationId", "warehouseId" HAVING COUNT(*) > 1
      ) duplicates`;
    assertNoInventoryDuplicates(duplicates);
    if (requireIndexes) {
      const indexes = await client.$queryRaw`
        SELECT i.relname AS index_name, t.relname AS table_name,
          ix.indisunique AS is_unique, ix.indisvalid AS is_valid,
          ix.indpred IS NOT NULL AS is_partial,
          ARRAY(SELECT a.attname::text FROM unnest(ix.indkey) WITH ORDINALITY AS key(attnum, ord)
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = key.attnum
            WHERE key.ord <= ix.indnkeyatts ORDER BY key.ord) AS columns
        FROM pg_index ix
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_class t ON t.oid = ix.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = current_schema() AND i.relname IN (
          'Product_warehouse_owned_sku_key', 'Stocktake_active_direct_key', 'Stocktake_active_warehouse_key'
        )`;
      const missing = missingInventoryIndexes(indexes);
      if (missing.length)
        throw new Error(
          `Required inventory unique indexes are missing or invalid: ${missing.join(", ")}`,
        );
    }
    console.log(
      `Inventory release checks passed${requireIndexes ? ": unique indexes verified" : ": no duplicate identities"}.`,
    );
  } finally {
    await client.$disconnect();
  }
}

module.exports = {
  assertNoInventoryDuplicates,
  missingInventoryIndexes,
  checkInventoryGuards,
};
