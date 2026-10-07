/* Explicit maintenance command. Dry-run by default; does not match real admin warehouses.
 * A legacy candidate must have the generated name, one owner, exclusively owner
 * products, and no central warehouse operations. Any ambiguity aborts the batch.
 */
const { PrismaClient, Prisma } = require('@prisma/client');
const { writeFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const suffix = ' - Үндсэн агуулах';
async function normalize(db, { apply = false, backupPath, sourceIds } = {}) {
  return db.$transaction(async tx => {
    // A maintenance window at DB level: briefly block concurrent inventory/count
    // writes, including older API instances which do not take organization locks.
    await tx.$executeRawUnsafe('LOCK TABLE "Organization", "Warehouse", "WarehouseOrganization", "Product", "WarehouseInventory", "Stocktake", "StocktakeLine", "InventoryLedger" IN SHARE ROW EXCLUSIVE MODE');
    const sources = await tx.warehouse.findMany({
      where: { type: 'CENTRAL', deletedAt: null, isActive: true,
        name: { endsWith: suffix }, ...(sourceIds ? { id: { in: sourceIds } } : {}) },
      include: { organizations: { include: { organization: true } },
        inventories: { orderBy: { id: 'asc' } },
        _count: { select: { managedProducts: true, stockRequests: true, dispatches: true,
          dispatchReturns: true, goodsReceipts: true, manualDispatches: true,
          setupTokens: true, courierAssignments: true, deliveryPartnerships: true, deliveries: true } } },
      orderBy: { id: 'asc' },
    });
    const plans = [];
    for (const source of sources) {
      if (source.organizations.length !== 1 || Object.values(source._count).some(Boolean))
        throw new Error(`Not an exclusive vendor warehouse: ${source.id}`);
      const org = source.organizations[0].organization;
      const ids = source.inventories.map(r => r.productId);
      const foreign = await tx.product.count({ where: { id: { in: ids }, OR: [
        { organizationId: null }, { organizationId: { not: org.id } }, { managedByWarehouseId: { not: null } },
      ] } });
      if (foreign) throw new Error(`Foreign/managed products: ${source.id}`);
      const targets = await tx.warehouse.findMany({ where: {
        type: 'VENDOR_INTERNAL', isActive: true, deletedAt: null,
        organizations: { some: { organizationId: org.id } },
      }, include: { organizations: true } });
      if (targets.length > 1) throw new Error(`Multiple internal targets: ${org.id}`);
      const target = targets[0];
      if (source.name !== `${org.name}${suffix}` && target?.name !== source.name) throw new Error(`Generated name mismatch: ${source.id}`);
      if (target && (target.organizations.length !== 1 || target.organizations[0].organizationId !== org.id))
        throw new Error(`Shared target: ${target.id}`);
      if (target && await tx.warehouseInventory.count({ where: { warehouseId: target.id, productId: { in: ids } } }))
        throw new Error(`Overlapping products: ${source.id}`);
      if (target && await tx.stocktake.count({ where: { warehouseId: source.id, status: { in: ['DRAFT', 'REVIEW'] } } }))
        throw new Error(`Active source count needs reconciliation: ${source.id}`);
      plans.push({ source, target, organizationId: org.id });
    }
    const warehouseIds = plans.flatMap(p => [p.source.id, ...(p.target ? [p.target.id] : [])]);
    const productIds = plans.flatMap(p => p.source.inventories.map(r => r.productId));
    const counts = await tx.stocktake.findMany({ where: { warehouseId: { in: warehouseIds } },
      include: { lines: { orderBy: { id: 'asc' } } }, orderBy: { id: 'asc' } });
    const products = await tx.product.findMany({ where: { id: { in: productIds } }, orderBy: { id: 'asc' } });
    const report = { applied: apply, warehouses: plans.length,
      movedRows: plans.filter(p => p.target).reduce((n,p) => n + p.source.inventories.length, 0),
      convertedRows: plans.filter(p => !p.target).reduce((n,p) => n + p.source.inventories.length, 0),
      countHash: hash(counts), productHash: hash(products),
      plans: plans.map(p => ({ name: p.source.name, sourceId: p.source.id, targetId: p.target?.id ?? p.source.id,
        action: p.target ? 'merge' : 'convert', rows: p.source.inventories.length })) };
    if (!apply || !plans.length) return report;
    if (!backupPath) throw new Error('Backup path required');
    writeFileSync(backupPath, JSON.stringify({ report, plans, counts, products }), { flag: 'wx', mode: 0o600 });
    for (const { source, target } of plans) {
      if (!target) {
        if (source.inventories.length) await tx.inventoryLedger.createMany({ data: source.inventories.map(r => ({
          productId: r.productId, warehouseId: source.id, change: 0, reason: 'TRANSFER_IN',
          referenceType: 'WAREHOUSE_SCOPE_REPAIR', referenceId: r.id,
          note: `Vendor warehouse type corrected CENTRAL -> VENDOR_INTERNAL; quantity unchanged ${r.quantity}`,
        })) });
        await tx.warehouse.update({ where: { id: source.id }, data: { type: 'VENDOR_INTERNAL' } });
        continue;
      }
      // SQL preserves inventory snapshot timestamps and row IDs used by stocktakes.
      const moved = await tx.$executeRaw`UPDATE "WarehouseInventory" SET "warehouseId" = ${target.id} WHERE "warehouseId" = ${source.id}`;
      if (moved !== source.inventories.length) throw new Error('Inventory changed');
      const ledger = source.inventories.flatMap(r => [
        { productId: r.productId, warehouseId: source.id, change: -r.quantity, reason: 'TRANSFER_OUT', referenceType: 'WAREHOUSE_SCOPE_REPAIR', referenceId: r.id, note: `Vendor warehouse registration merge ${source.id} -> ${target.id}` },
        { productId: r.productId, warehouseId: target.id, change: r.quantity, reason: 'TRANSFER_IN', referenceType: 'WAREHOUSE_SCOPE_REPAIR', referenceId: r.id, note: `Vendor warehouse registration merge ${source.id} -> ${target.id}` },
      ]);
      if (ledger.length) await tx.inventoryLedger.createMany({ data: ledger });
      await tx.warehouse.update({ where: { id: source.id }, data: { isActive: false } });
    }
    const afterCounts = await tx.stocktake.findMany({ where: { warehouseId: { in: warehouseIds } },
      include: { lines: { orderBy: { id: 'asc' } } }, orderBy: { id: 'asc' } });
    const afterProducts = await tx.product.findMany({ where: { id: { in: productIds } }, orderBy: { id: 'asc' } });
    if (hash(afterCounts) !== report.countHash || hash(afterProducts) !== report.productHash)
      throw new Error('Count/product changed: rolling back');
    return { ...report, preservedCounts: true, preservedProducts: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120000, maxWait: 10000 });
}
module.exports = { normalize };
if (require.main === module) {
  const db = new PrismaClient();
  normalize(db, { apply: process.argv[2] === '--apply', backupPath: process.argv[3] })
    .then(r => console.log(JSON.stringify(r)))
    .catch(e => { console.error(e.message); process.exitCode = 1; })
    .finally(() => db.$disconnect());
}
