/* One-time, explicitly scoped repair for a confirmed duplicate physical warehouse.
 * Dry run by default. Never merges overlapping products or rewrites count data.
 */
const { PrismaClient, Prisma } = require('@prisma/client');
const { writeFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

async function repair(db, { organizationId, sourceId, targetId, stocktakeId, apply = false, backupPath }) {
  if (!organizationId || !sourceId || !targetId || !stocktakeId || sourceId === targetId) throw new Error('Explicit distinct warehouse IDs and stocktake ID are required');
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "Stocktake" WHERE "id" = ${stocktakeId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "Warehouse" WHERE "id" IN (${sourceId}, ${targetId}) ORDER BY "id" FOR UPDATE`;
    const source = await tx.warehouse.findUniqueOrThrow({ where: { id: sourceId }, include: { organizations: true } });
    const target = await tx.warehouse.findUniqueOrThrow({ where: { id: targetId }, include: { organizations: true } });
    if (source.type !== 'CENTRAL' || target.type !== 'VENDOR_INTERNAL' || source.deletedAt || target.deletedAt || !target.isActive) throw new Error('Unexpected warehouse scope');
    for (const warehouse of [source, target]) {
      if (warehouse.organizations.length !== 1 || warehouse.organizations[0].organizationId !== organizationId) throw new Error('Warehouse must belong exclusively to the requested organization');
    }
    const session = await tx.stocktake.findUniqueOrThrow({ where: { id: stocktakeId }, include: { lines: { orderBy: { id: 'asc' } } } });
    if (session.organizationId !== organizationId || session.warehouseId !== targetId || session.status !== 'DRAFT') throw new Error('Unexpected active count');
    const rows = await tx.warehouseInventory.findMany({ where: { warehouseId: sourceId }, orderBy: { productId: 'asc' } });
    if (!rows.length && !source.isActive) return { alreadyRepaired: true };
    if (!rows.length) throw new Error('No inventory to repair');
    const ids = rows.map(row => row.productId);
    await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "WarehouseInventory" WHERE "warehouseId" IN (${sourceId}, ${targetId}) ORDER BY "productId" FOR UPDATE`;
    const products = await tx.product.findMany({ where: { id: { in: ids } }, orderBy: { id: 'asc' } });
    if (products.some(p => p.organizationId !== organizationId || p.managedByWarehouseId)) throw new Error('Foreign or centrally managed product detected');
    if (await tx.warehouseInventory.count({ where: { warehouseId: targetId, productId: { in: ids } } })) throw new Error('Overlapping products require manual reconciliation');
    if (await tx.stocktake.count({ where: { warehouseId: sourceId, status: { in: ['DRAFT', 'REVIEW'] } } })) throw new Error('Source has an active count');
    const references = await Promise.all([
      tx.warehouseStockRequest.count({ where: { warehouseId: sourceId } }),
      tx.stockDispatch.count({ where: { warehouseId: sourceId } }),
      tx.dispatchReturn.count({ where: { warehouseId: sourceId } }),
      tx.warehouseGoodsReceipt.count({ where: { warehouseId: sourceId } }),
    ]);
    if (references.some(Boolean)) throw new Error('Source has warehouse operations requiring separate reconciliation');
    const report = { organizationId, sourceId, targetId, stocktakeId, inventoryRows: rows.length, countedRows: session.lines.filter(l => l.counted !== null).length, sessionVersion: session.version, countHash: hash(session), stockHash: hash(products), applied: apply };
    if (!apply) return report;
    if (!backupPath) throw new Error('A backup path is required before applying');
    writeFileSync(backupPath, JSON.stringify({ report, source, target, rows, products, session }, null, 2), { flag: 'wx', mode: 0o600 });
    const moved = await tx.warehouseInventory.updateMany({ where: { warehouseId: sourceId, id: { in: rows.map(r => r.id) } }, data: { warehouseId: targetId } });
    if (moved.count !== rows.length) throw new Error('Inventory changed during repair');
    await tx.inventoryLedger.createMany({ data: rows.filter(r => r.quantity !== 0).flatMap(row => [
      { productId: row.productId, warehouseId: sourceId, change: -row.quantity, reason: 'TRANSFER_OUT', referenceType: 'WAREHOUSE_SCOPE_REPAIR', referenceId: row.id, note: `Duplicate physical warehouse registration corrected: ${sourceId} -> ${targetId}` },
      { productId: row.productId, warehouseId: targetId, change: row.quantity, reason: 'TRANSFER_IN', referenceType: 'WAREHOUSE_SCOPE_REPAIR', referenceId: row.id, note: `Duplicate physical warehouse registration corrected: ${sourceId} -> ${targetId}` },
    ]) });
    await tx.warehouse.update({ where: { id: sourceId }, data: { isActive: false } });
    const after = await tx.stocktake.findUniqueOrThrow({ where: { id: stocktakeId }, include: { lines: { orderBy: { id: 'asc' } } } });
    const productsAfter = await tx.product.findMany({ where: { id: { in: ids } }, orderBy: { id: 'asc' } });
    if (hash(after) !== report.countHash || hash(productsAfter) !== report.stockHash) throw new Error('Count or product changed unexpectedly; rolling back');
    return { ...report, backupPath, preservedCounts: true, preservedProductStock: true };
  }, { isolationLevel: 'Serializable', timeout: 60000 });
}
module.exports = { repair };
if (require.main === module) {
  const [organizationId, sourceId, targetId, stocktakeId, mode, backupPath] = process.argv.slice(2);
  const db = new PrismaClient();
  repair(db, { organizationId, sourceId, targetId, stocktakeId, apply: mode === '--apply', backupPath })
    .then(report => console.log(JSON.stringify(report)))
    .catch(error => { console.error(error.message); process.exitCode = 1; })
    .finally(() => db.$disconnect());
}
