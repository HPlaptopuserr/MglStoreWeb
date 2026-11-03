import { createHash } from "node:crypto";
import { prisma, Prisma } from "@mgl/database";

type Tx = Prisma.TransactionClient;
const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export class CatalogSeparationConflict extends Error {}

async function snapshot(tx: Tx, organizationId: string) {
  const organization = await tx.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const products = await tx.product.findMany({
    where: { organizationId }, orderBy: { id: "asc" },
    include: {
      warehouseInventories: { orderBy: { id: "asc" } },
      _count: { select: { warehouseReceiptItems: true, manualDispatchItems: true, stockRequestItems: true, returnItems: true } },
    },
  });
  const warehouses = await tx.warehouse.findMany({
    where: { OR: [
      { catalogOrganizationId: organizationId },
      { organizations: { some: { organizationId } } },
      { id: { in: products.flatMap(p => [p.managedByWarehouseId, ...p.warehouseInventories.map(i => i.warehouseId)].filter((id): id is string => id !== null)) } },
    ] }, orderBy: { id: "asc" },
    include: { organizations: { orderBy: { id: "asc" } } },
  });
  const openCounts = await tx.stocktake.count({ where: { organizationId, status: { in: ["DRAFT", "REVIEW"] } } });
  return { organization, products, warehouses, openCounts };
}

function plan(before: Awaited<ReturnType<typeof snapshot>>) {
  const { products, warehouses, organization, openCounts } = before;
  const internal = warehouses.filter(w => w.type === "VENDOR_INTERNAL" && w.isActive && !w.deletedAt &&
    w.organizations.length === 1 && w.organizations[0].organizationId === organization.id);
  const blockers: string[] = [];
  if (organization.deletedAt || organization.status !== "ACTIVE") blockers.push("Inactive organization");
  if (openCounts) blockers.push("Open stocktake must be completed first");
  if (internal.length > 1) blockers.push("Multiple vendor internal warehouses require reconciliation");
  const targetId = internal.length === 1 ? internal[0].id : null;
  const affected = products.filter(p => p.managedByWarehouseId !== null || p.warehouseInventories.some(i => i.warehouseId !== targetId));
  for (const product of affected) {
    if (product.warehouseInventories.length > 1) blockers.push(`${product.id}: multiple inventory rows`);
    if (product.warehouseInventories.length === 1 && product.warehouseInventories[0].quantity !== product.stock)
      blockers.push(`${product.id}: product and inventory stock differ`);
    if (Object.values(product._count).some(Boolean)) blockers.push(`${product.id}: warehouse documents require a separate reversal/return migration`);
    for (const id of [product.managedByWarehouseId, ...product.warehouseInventories.map(i => i.warehouseId)]) {
      if (!id || id === targetId) continue;
      const warehouse = warehouses.find(w => w.id === id);
      if (!warehouse || warehouse.type !== "CENTRAL") blockers.push(`${product.id}: ambiguous source warehouse`);
      if (warehouse?.catalogOrganizationId && warehouse.catalogOrganizationId !== organization.id)
        blockers.push(`${product.id}: source catalog belongs to another vendor`);
    }
  }
  return { organizationId: organization.id, organizationName: organization.name, productCount: products.length,
    affectedProductIds: affected.map(p => p.id), targetId, blockers,
    sharedWarehouseIds: warehouses.filter(w => w.catalogOrganizationId === organization.id).map(w => w.id),
    fingerprint: fingerprint(before) };
}

/** Explicit per-vendor migration; no name matching, merging, cloning, or stock recalculation. */
export async function separateVendorCatalog(input: { organizationId: string; apply?: boolean; expectedFingerprint?: string }) {
  return prisma.$transaction(async tx => {
    if (input.apply) {
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${input.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Product" WHERE "organizationId"=${input.organizationId} ORDER BY id FOR UPDATE`;
      await tx.$queryRaw`SELECT i.id FROM "WarehouseInventory" i JOIN "Product" p ON p.id=i."productId" WHERE p."organizationId"=${input.organizationId} ORDER BY i.id FOR UPDATE OF i`;
    } else await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const before = await snapshot(tx, input.organizationId);
    const report = plan(before);
    if (!input.apply) return { ...report, applied: false, auditId: null };
    if (!input.expectedFingerprint || input.expectedFingerprint !== report.fingerprint)
      throw new CatalogSeparationConflict("Data changed since preview; run the read-only preview again");
    if (report.blockers.length) throw new CatalogSeparationConflict(report.blockers.join("; "));
    if (!report.affectedProductIds.length && !report.sharedWarehouseIds.length)
      return { ...report, applied: false, auditId: null };
    const audit = await tx.auditLog.create({ data: { action: "MERCHANT_CONFIGURATION_CHANGED",
      meta: json({ operation: "VENDOR_CATALOG_SEPARATION", version: 1, before, report }) } });
    let targetId = report.targetId;
    if (!targetId && report.affectedProductIds.length) {
      const target = await tx.warehouse.create({ data: {
        name: `${before.organization.name} - Үндсэн агуулах`, address: before.organization.address || "Vendor inventory",
        type: "VENDOR_INTERNAL", organizations: { create: { organizationId: input.organizationId } },
      } });
      targetId = target.id;
    }
    for (const product of before.products.filter(p => report.affectedProductIds.includes(p.id))) {
      if (!targetId) throw new CatalogSeparationConflict("Missing target");
      const inventory = product.warehouseInventories[0];
      if (inventory && inventory.warehouseId !== targetId) {
        await tx.warehouseInventory.update({ where: { id: inventory.id }, data: { warehouseId: targetId } });
        if (inventory.quantity !== 0) await tx.inventoryLedger.createMany({ data: [
          { productId: product.id, warehouseId: inventory.warehouseId, change: -inventory.quantity, reason: "TRANSFER_OUT", referenceType: "VENDOR_CATALOG_SEPARATION", referenceId: audit.id },
          { productId: product.id, warehouseId: targetId, change: inventory.quantity, reason: "TRANSFER_IN", referenceType: "VENDOR_CATALOG_SEPARATION", referenceId: audit.id },
        ] });
      } else if (!inventory) {
        await tx.warehouseInventory.create({ data: { productId: product.id, warehouseId: targetId, quantity: product.stock } });
        if (product.stock !== 0) await tx.inventoryLedger.create({ data: {
          productId: product.id, warehouseId: targetId, change: product.stock, reason: "TRANSFER_IN",
          referenceType: "VENDOR_CATALOG_SEPARATION", referenceId: audit.id,
        } });
      }
      // Keep every business field and timestamp, including stock and product identity.
      await tx.$executeRaw`UPDATE "Product" SET "managedByWarehouseId"=NULL WHERE id=${product.id} AND "organizationId"=${input.organizationId}`;
    }
    await tx.warehouse.updateMany({ where: { catalogOrganizationId: input.organizationId }, data: { catalogOrganizationId: null } });
    const after = await snapshot(tx, input.organizationId);
    const businessProducts = (value: typeof before) => value.products.map(({ managedByWarehouseId: _owner, warehouseInventories: _inventory, _count, ...product }) => product);
    if (fingerprint(businessProducts(before)) !== fingerprint(businessProducts(after)))
      throw new CatalogSeparationConflict("Product preservation check failed; transaction rolled back");
    if (plan(after).affectedProductIds.length) throw new CatalogSeparationConflict("Separation incomplete; transaction rolled back");
    await tx.auditLog.update({ where: { id: audit.id }, data: { meta: json({
      operation: "VENDOR_CATALOG_SEPARATION", version: 1, before, afterFingerprint: fingerprint(after), report, targetId,
    }) } });
    return { ...report, targetId, applied: true, auditId: audit.id };
  }, { isolationLevel: "Serializable", timeout: 60000 });
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CatalogSeparationConflict("Invalid backup record");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string") throw new CatalogSeparationConflict("Invalid backup field");
  return value;
}
function records(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new CatalogSeparationConflict("Invalid backup list");
  return value.map(record);
}

/** Restore only an unchanged separation; never overwrite intervening sales or edits. */
export async function rollbackVendorSeparation(auditId: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "AuditLog" WHERE id=${auditId} FOR UPDATE`;
    const audit = await tx.auditLog.findUniqueOrThrow({ where: { id: auditId } });
    const meta = record(audit.meta);
    if (meta.operation !== "VENDOR_CATALOG_SEPARATION" || meta.version !== 1) throw new CatalogSeparationConflict("Not a separation backup");
    if (meta.rolledBack === true) return { restored: true, alreadyRestored: true };
    const before = record(meta.before);
    const organizationId = text(record(before.organization).id);
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${organizationId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Product" WHERE "organizationId"=${organizationId} ORDER BY id FOR UPDATE`;
    const current = await snapshot(tx, organizationId);
    if (fingerprint(current) !== text(meta.afterFingerprint)) throw new CatalogSeparationConflict("Data changed after separation; automatic rollback refused");
    for (const product of records(before.products)) {
      const productId = text(product.id);
      const managedByWarehouseId = product.managedByWarehouseId === null ? null : text(product.managedByWarehouseId);
      const inventory = records(product.warehouseInventories)[0];
      if (inventory) {
        await tx.$executeRaw`UPDATE "WarehouseInventory" SET "warehouseId"=${text(inventory.warehouseId)}, "updatedAt"=${text(inventory.updatedAt)}::timestamp WHERE id=${text(inventory.id)} AND "productId"=${productId}`;
      } else {
        // These rows did not exist before the migration; quantities are protected by the fingerprint.
        await tx.warehouseInventory.deleteMany({ where: { productId } });
      }
      await tx.$executeRaw`UPDATE "Product" SET "managedByWarehouseId"=${managedByWarehouseId} WHERE id=${productId} AND "organizationId"=${organizationId}`;
    }
    for (const warehouse of records(before.warehouses)) {
      if (warehouse.catalogOrganizationId === organizationId) {
        await tx.$executeRaw`UPDATE "Warehouse" SET "catalogOrganizationId"=${organizationId}, "updatedAt"=${text(warehouse.updatedAt)}::timestamp WHERE id=${text(warehouse.id)}`;
      }
    }
    const targetId = meta.targetId === null ? null : text(meta.targetId);
    if (targetId && !records(before.warehouses).some(w => w.id === targetId)) {
      if (await tx.warehouseInventory.count({ where: { warehouseId: targetId } })) throw new CatalogSeparationConflict("Target warehouse changed");
      await tx.warehouse.update({ where: { id: targetId }, data: { isActive: false } });
    }
    const movements = await tx.inventoryLedger.findMany({ where: { referenceType: "VENDOR_CATALOG_SEPARATION", referenceId: auditId } });
    if (movements.length) await tx.inventoryLedger.createMany({ data: movements.map(row => ({
      productId: row.productId, warehouseId: row.warehouseId, change: -row.change,
      reason: row.change > 0 ? "TRANSFER_OUT" : "TRANSFER_IN", referenceType: "VENDOR_CATALOG_SEPARATION_ROLLBACK", referenceId: auditId,
    })) });
    await tx.auditLog.update({ where: { id: auditId }, data: { meta: json({ ...meta, rolledBack: true }) } });
    return { restored: true, alreadyRestored: false };
  }, { isolationLevel: "Serializable", timeout: 60000 });
}
