/* Reversible incident repair. Default rehearses the entire repair and rolls back.
 * Split only unambiguous store+central records. Preserve store transactions and
 * central inventory IDs/quantities; remap central document references to a clone.
 */
const { PrismaClient } = require(require('node:path').resolve('packages/database/node_modules/@prisma/client'));
const { randomUUID } = require('node:crypto');
const db = new PrismaClient();
const apply = process.argv.includes('--apply');
const runId = randomUUID();
let report;
const rollback = new Error('REHEARSAL_COMPLETE');
async function run() {
  try {
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'");
      await tx.$executeRawUnsafe('LOCK TABLE "Organization", "Warehouse", "WarehouseOrganization", "Product", "ProductImage", "WarehouseInventory", "InventoryLedger", "WarehouseGoodsReceiptItem", "WarehouseStockRequestItem", "WarehouseManualDispatchItem", "DispatchReturnItem", "Stocktake", "StocktakeLine" IN SHARE ROW EXCLUSIVE MODE');
      await tx.$executeRawUnsafe(`CREATE TEMP TABLE isolation_plan ON COMMIT DROP AS
        SELECT p.id AS old_id, gen_random_uuid()::text AS new_id,
          c.id AS inventory_id, c."warehouseId" AS central_id,
          s.id AS store_inventory_id, s."warehouseId" AS store_id,
          s.quantity AS store_qty, c.quantity AS central_qty,
          p.stock AS old_stock, p."organizationId" AS org_id
        FROM "Product" p
        JOIN "WarehouseInventory" s ON s."productId"=p.id
        JOIN "Warehouse" sw ON sw.id=s."warehouseId" AND sw.type='VENDOR_INTERNAL' AND sw."isActive" AND sw."deletedAt" IS NULL
        JOIN "WarehouseInventory" c ON c."productId"=p.id
        JOIN "Warehouse" cw ON cw.id=c."warehouseId" AND cw.type='CENTRAL' AND cw."isActive" AND cw."deletedAt" IS NULL AND cw."catalogOrganizationId" IS NULL
        WHERE p."organizationId" IS NOT NULL AND p."managedByWarehouseId" IS NULL AND p."deletedAt" IS NULL
          AND (SELECT count(*) FROM "WarehouseInventory" i WHERE i."productId"=p.id)=2
          AND (SELECT count(*) FROM "WarehouseOrganization" o WHERE o."warehouseId"=sw.id)=1
          AND EXISTS(SELECT 1 FROM "WarehouseOrganization" o WHERE o."warehouseId"=sw.id AND o."organizationId"=p."organizationId")`);
      const groups = await tx.$queryRawUnsafe(`SELECT o.name, count(*)::int AS products,
        sum(m.store_qty)::int AS store_quantity, sum(m.central_qty)::int AS central_quantity
        FROM isolation_plan m JOIN "Organization" o ON o.id=m.org_id GROUP BY o.id,o.name ORDER BY o.name`);
      const count = groups.reduce((sum, row) => sum + row.products, 0);
      if (!count) { report = { runId, applied: false, products: 0 }; return; }
      // Every selected record must still equal the known physical warehouse sum.
      const invalid = await tx.$queryRawUnsafe('SELECT old_id FROM isolation_plan WHERE old_stock <> store_qty + central_qty OR store_qty < 0 OR central_qty < 0');
      if (invalid.length) throw new Error(`Unexpected stock totals: ${invalid.length}`);
      await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_InventoryIsolationBackup" (
        "runId" text NOT NULL, "tableName" text NOT NULL, "recordId" text NOT NULL,
        payload jsonb NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("runId", "tableName", "recordId"))`);
      const scopes = [
        ['Product', 't.id=m.old_id'],
        ['WarehouseInventory', 't."productId"=m.old_id'],
        ['InventoryLedger', 't."productId"=m.old_id AND t."warehouseId"=m.central_id'],
        ['WarehouseGoodsReceiptItem', 't."productId"=m.old_id AND EXISTS (SELECT 1 FROM "WarehouseGoodsReceipt" h WHERE h.id=t."receiptId" AND h."warehouseId"=m.central_id)'],
        ['WarehouseStockRequestItem', 't."productId"=m.old_id AND EXISTS (SELECT 1 FROM "WarehouseStockRequest" h WHERE h.id=t."requestId" AND h."warehouseId"=m.central_id)'],
        ['WarehouseManualDispatchItem', 't."productId"=m.old_id AND EXISTS (SELECT 1 FROM "WarehouseManualDispatch" h WHERE h.id=t."dispatchId" AND h."warehouseId"=m.central_id)'],
        ['DispatchReturnItem', 't."productId"=m.old_id AND EXISTS (SELECT 1 FROM "DispatchReturn" h WHERE h.id=t."returnId" AND h."warehouseId"=m.central_id)'],
        ['StocktakeLine', 't."productId"=m.old_id AND EXISTS (SELECT 1 FROM "Stocktake" h WHERE h.id=t."stocktakeId" AND h."warehouseId"=m.central_id)'],
      ];
      for (const [table, scope] of scopes) {
        await tx.$executeRawUnsafe(`INSERT INTO "_InventoryIsolationBackup" ("runId","tableName","recordId",payload)
          SELECT $1,$2,t.id,to_jsonb(t) FROM "${table}" t JOIN isolation_plan m ON ${scope}`, runId, table);
      }
      await tx.$executeRawUnsafe(`INSERT INTO "_InventoryIsolationBackup" ("runId","tableName","recordId",payload)
        SELECT $1,'mapping',old_id,to_jsonb(m) FROM isolation_plan m`, runId);
      await tx.$executeRawUnsafe(`INSERT INTO "Product"
        SELECT (jsonb_populate_record(NULL::"Product",to_jsonb(p)||jsonb_build_object(
          'id',m.new_id,'organizationId',NULL,'managedByWarehouseId',m.central_id,
          'stock',m.central_qty,'createdAt',now(),'updatedAt',now()))).*
        FROM "Product" p JOIN isolation_plan m ON p.id=m.old_id`);
      await tx.$executeRawUnsafe(`INSERT INTO "ProductImage" (id,"productId",url,"sortOrder")
        SELECT gen_random_uuid()::text,m.new_id,i.url,i."sortOrder" FROM "ProductImage" i JOIN isolation_plan m ON i."productId"=m.old_id`);
      for (const [table, scope] of scopes.slice(2)) {
        await tx.$executeRawUnsafe(`UPDATE "${table}" t SET "productId"=m.new_id FROM isolation_plan m WHERE ${scope}`);
      }
      await tx.$executeRawUnsafe('UPDATE "WarehouseInventory" t SET "productId"=m.new_id FROM isolation_plan m WHERE t.id=m.inventory_id');
      await tx.$executeRawUnsafe('UPDATE "Product" t SET stock=m.store_qty,"updatedAt"=now() FROM isolation_plan m WHERE t.id=m.old_id');
      await tx.$executeRawUnsafe(`INSERT INTO "InventoryLedger" (id,"productId","warehouseId",change,reason,note,"createdAt","referenceId","referenceType")
        SELECT gen_random_uuid()::text,m.old_id,m.store_id,0,'MANUAL_ADJUST',
        'Warehouse ownership repair. Store quantity preserved='||m.store_qty||'; removed central aggregate='||m.central_qty||'; central product='||m.new_id,
        now(),$1,'WAREHOUSE_STOCK_ISOLATION' FROM isolation_plan m`,runId);
      const failed = await tx.$queryRawUnsafe(`SELECT m.old_id FROM isolation_plan m
        JOIN "Product" p ON p.id=m.old_id JOIN "Product" n ON n.id=m.new_id
        JOIN "WarehouseInventory" s ON s.id=m.store_inventory_id JOIN "WarehouseInventory" c ON c.id=m.inventory_id
        WHERE p.stock<>m.store_qty OR n.stock<>m.central_qty OR s.quantity<>m.store_qty OR c.quantity<>m.central_qty
          OR s."productId"<>m.old_id OR c."productId"<>m.new_id OR p."organizationId"<>m.org_id OR n."organizationId" IS NOT NULL`);
      if (failed.length) throw new Error('Repair invariant failed');
      for (const [table, scope] of scopes.slice(2)) {
        const stale = await tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${table}" t JOIN isolation_plan m ON ${scope}`);
        if(stale[0].n) throw new Error(`Unmoved central references in ${table}`);
      }
      report = {runId, applied:apply, products:count, groups, backupTable:'_InventoryIsolationBackup', verified:true};
      if (!apply) throw rollback;
    }, {timeout:120000,maxWait:10000,isolationLevel:'Serializable'});
  } catch(error) { if(error!==rollback) throw error; }
  console.log(JSON.stringify(report));
}
run().catch(error=>{ console.error(error.message); process.exitCode=1; }).finally(()=>db.$disconnect());
