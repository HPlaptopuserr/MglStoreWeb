const fs = require("node:fs");
const path = require("node:path");

const migrationName = "20261104110000_approved_warehouse_sku_repair";

/** The frozen SQL migration is the single source of the explicitly approved IDs. */
function approvedSkuPlan() {
  const sql = fs.readFileSync(
    path.join(
      __dirname,
      "../prisma/migrations",
      migrationName,
      "migration.sql",
    ),
    "utf8",
  );
  const match = /\$approved_sku_plan\$([\s\S]*?)\$approved_sku_plan\$/.exec(
    sql,
  );
  if (!match) throw new Error("Approved SKU repair manifest is missing");
  const plan = JSON.parse(match[1]);
  if (
    !Array.isArray(plan) ||
    plan.length !== 5 ||
    new Set(plan.map((row) => row.id)).size !== 5 ||
    plan.some(
      (row) =>
        ["id", "warehouse_id", "old_sku", "new_sku"].some(
          (key) => typeof row[key] !== "string" || !row[key],
        ) || row.old_sku === row.new_sku,
    )
  )
    throw new Error("Approved SKU repair manifest is invalid");
  return plan;
}

/** Predict only this approved pending migration; unrelated duplicates still block. */
async function projectedApprovedSkuDuplicates(client) {
  const applied = await client.$queryRaw`SELECT id FROM "_prisma_migrations"
    WHERE migration_name = ${migrationName} AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  if (applied.length) return null;
  const manifest = JSON.stringify(approvedSkuPlan());
  const invalid = await client.$queryRaw`
    WITH plan AS (SELECT * FROM jsonb_to_recordset(${manifest}::jsonb)
      AS p(id text, warehouse_id text, old_sku text, new_sku text))
    SELECT COUNT(*)::integer AS count FROM "Product" p JOIN plan ON plan.id = p.id
    WHERE p."organizationId" IS NOT NULL OR p."managedByWarehouseId" IS DISTINCT FROM plan.warehouse_id
      OR p."deletedAt" IS NOT NULL OR NOT p."isActive"
      OR (p.sku IS DISTINCT FROM plan.old_sku AND p.sku IS DISTINCT FROM plan.new_sku)`;
  if (invalid[0].count)
    throw new Error(
      "Approved SKU repair no longer matches current product identities",
    );
  const rows = await client.$queryRaw`
    WITH plan AS (SELECT * FROM jsonb_to_recordset(${manifest}::jsonb)
      AS p(id text, warehouse_id text, old_sku text, new_sku text)),
    identities AS (
      SELECT p."managedByWarehouseId" AS warehouse_id,
        CASE WHEN p.sku = plan.old_sku THEN plan.new_sku ELSE p.sku END AS sku
      FROM "Product" p LEFT JOIN plan ON plan.id = p.id
      WHERE p."organizationId" IS NULL AND p."managedByWarehouseId" IS NOT NULL AND p.sku IS NOT NULL
    ) SELECT COUNT(*)::integer AS count FROM (
      SELECT warehouse_id, sku FROM identities GROUP BY warehouse_id, sku HAVING COUNT(*) > 1
    ) duplicates`;
  return rows[0].count;
}

module.exports = {
  migrationName,
  approvedSkuPlan,
  projectedApprovedSkuDuplicates,
};
