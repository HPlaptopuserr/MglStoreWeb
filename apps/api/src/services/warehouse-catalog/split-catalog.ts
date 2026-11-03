import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { prisma, Prisma } from "@mgl/database";

type Tx = Prisma.TransactionClient;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

async function readState(tx: Tx, organizationId: string) {
  const organization = await tx.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const products = await tx.product.findMany({ where: { organizationId }, orderBy: { id: "asc" }, include: {
    warehouseInventories: { orderBy: { id: "asc" } }, images: { orderBy: { id: "asc" } },
  } });
  const ids = products.map(p => p.id);
  const [warehouses, receipts, requests, returns, dispatches, ledger, counts] = await Promise.all([
    tx.warehouse.findMany({ orderBy: { id: "asc" }, include: { organizations: { orderBy: { id: "asc" } } } }),
    tx.warehouseGoodsReceiptItem.findMany({ where: { productId: { in: ids } }, orderBy: { id: "asc" }, include: { receipt: { select: { warehouseId: true } } } }),
    tx.warehouseStockRequestItem.findMany({ where: { productId: { in: ids } }, orderBy: { id: "asc" }, include: { request: { select: { warehouseId: true } } } }),
    tx.dispatchReturnItem.findMany({ where: { productId: { in: ids } }, orderBy: { id: "asc" }, include: { return: { select: { warehouseId: true } } } }),
    tx.warehouseManualDispatchItem.findMany({ where: { productId: { in: ids } }, orderBy: { id: "asc" }, include: { dispatch: { select: { warehouseId: true } } } }),
    tx.inventoryLedger.findMany({ where: { productId: { in: ids } }, orderBy: { id: "asc" } }),
    tx.stocktake.count({ where: { organizationId, status: { in: ["DRAFT", "REVIEW"] } } }),
  ]);
  return { organization, products, warehouses, receipts, requests, returns, dispatches, ledger, counts };
}

/** Preserve BOTH portal baselines explicitly. Never transfer one side's quantity into the other. */
export async function splitVendorWarehouseCatalog(input: { organizationId: string; expectedFingerprint?: string; apply?: boolean; rollbackAfterValidation?: boolean }) {
  return prisma.$transaction(async tx => {
    if (input.apply) {
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${input.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Product" WHERE "organizationId"=${input.organizationId} ORDER BY id FOR UPDATE`;
    } else await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const before = await readState(tx, input.organizationId);
    const centralIds = new Set(before.warehouses.filter(w => w.type === "CENTRAL").map(w => w.id));
    const sources = (productId: string, managed: string | null, inventoryIds: string[]) => [...new Set([
      ...before.ledger.filter(r => r.productId === productId && r.warehouseId).map(r => r.warehouseId!),
      ...inventoryIds, ...(managed ? [managed] : []),
      ...before.receipts.filter(r => r.productId === productId).map(r => r.receipt.warehouseId),
      ...before.requests.filter(r => r.productId === productId).map(r => r.request.warehouseId),
      ...before.returns.filter(r => r.productId === productId).map(r => r.return.warehouseId),
      ...before.dispatches.filter(r => r.productId === productId).map(r => r.dispatch.warehouseId),
    ])].filter(id => centralIds.has(id));
    const products = before.products.map(product => ({ product,
      sources: sources(product.id, product.managedByWarehouseId, product.warehouseInventories.map(i => i.warehouseId)),
    })).filter(row => row.sources.length);
    const targets = before.warehouses.filter(w => w.type === "VENDOR_INTERNAL" && w.isActive && !w.deletedAt && w.organizations.length === 1 && w.organizations[0].organizationId === input.organizationId);
    const blockers: string[] = [];
    if (before.counts) blockers.push("Open stocktake requires reconciliation");
    if (targets.length > 1) blockers.push("Multiple vendor internal warehouses");
    for (const { product } of products) {
      const internalRows = product.warehouseInventories.filter(i => !centralIds.has(i.warehouseId));
      if (internalRows.length > 1 || internalRows.some(i => i.warehouseId !== targets[0]?.id || i.quantity !== product.stock))
        blockers.push(`${product.id}: vendor inventory does not match displayed stock`);
      if (product.managedByWarehouseId && !centralIds.has(product.managedByWarehouseId)) blockers.push(`${product.id}: non-central manager`);
    }
    const report = { organizationId: input.organizationId, organizationName: before.organization.name, products: products.length,
      warehouseCopies: products.reduce((sum, row) => sum + row.sources.length, 0), fingerprint: hash(before), blockers };
    if (!input.apply) return { ...report, applied: false, auditId: null };
    if (input.expectedFingerprint !== report.fingerprint) throw new Error("Preview is stale; no changes applied");
    if (blockers.length) throw new Error(blockers.join("; "));
    if (!products.length) return { ...report, applied: false, auditId: null };
    const compressed = gzipSync(Buffer.from(JSON.stringify(before)));
    const audit = await tx.auditLog.create({ data: { action: "MERCHANT_CONFIGURATION_CHANGED", meta: json({ operation: "SPLIT_CATALOG_PRESERVE_BOTH", version: 2, report }) } });
    const snapshotParts: string[] = [];
    for (let offset = 0; offset < compressed.length; offset += 100_000) {
      const part = compressed.subarray(offset, offset + 100_000);
      const row = await tx.auditLog.create({ data: { action: "MERCHANT_CONFIGURATION_CHANGED", meta: json({
        operation: "SPLIT_CATALOG_SNAPSHOT_PART", auditId: audit.id, offset,
        sha256: createHash("sha256").update(part).digest("hex"), payload: part.toString("base64"),
      }) } });
      snapshotParts.push(row.id);
    }
    const target = targets[0] ?? await tx.warehouse.create({ data: { name: `${before.organization.name} - Үндсэн агуулах`,
      address: before.organization.address || "Vendor inventory", type: "VENDOR_INTERNAL", organizations: { create: { organizationId: input.organizationId } } } });
    const mappings: { vendorProductId: string; warehouseProductId: string; warehouseId: string; stock: number }[] = [];
    for (const { product, sources: warehouseIds } of products) {
      for (const warehouseId of warehouseIds) {
        const inventory = product.warehouseInventories.find(i => i.warehouseId === warehouseId);
        const stock = inventory?.quantity ?? (product.managedByWarehouseId === warehouseId ? product.stock : 0);
        const { warehouseInventories: _inventories, images, ...scalar } = product;
        const clone = await tx.product.create({ data: { ...scalar, id: undefined, organizationId: null, managedByWarehouseId: warehouseId, stock,
          specifications: scalar.specifications === null ? Prisma.DbNull : scalar.specifications,
          images: { create: images.map(image => ({ url: image.url, sortOrder: image.sortOrder })) },
        } });
        if (inventory) await tx.warehouseInventory.update({ where: { id: inventory.id }, data: { productId: clone.id } });
        else await tx.warehouseInventory.create({ data: { warehouseId, productId: clone.id, quantity: stock } });
        const relink = async (table: "WarehouseGoodsReceiptItem" | "WarehouseStockRequestItem" | "DispatchReturnItem" | "WarehouseManualDispatchItem" | "InventoryLedger", ids: string[]) => {
          if (ids.length) await tx.$executeRaw(Prisma.sql`UPDATE ${Prisma.raw('"' + table + '"')} SET "productId"=${clone.id} WHERE id IN (${Prisma.join(ids)}) AND "productId"=${product.id}`);
        };
        await relink("WarehouseGoodsReceiptItem", before.receipts.filter(r => r.productId === product.id && r.receipt.warehouseId === warehouseId).map(r => r.id));
        await relink("WarehouseStockRequestItem", before.requests.filter(r => r.productId === product.id && r.request.warehouseId === warehouseId).map(r => r.id));
        await relink("DispatchReturnItem", before.returns.filter(r => r.productId === product.id && r.return.warehouseId === warehouseId).map(r => r.id));
        await relink("WarehouseManualDispatchItem", before.dispatches.filter(r => r.productId === product.id && r.dispatch.warehouseId === warehouseId).map(r => r.id));
        await relink("InventoryLedger", before.ledger.filter(r => r.productId === product.id && r.warehouseId === warehouseId).map(r => r.id));
        mappings.push({ vendorProductId: product.id, warehouseProductId: clone.id, warehouseId, stock });
      }
      if (!product.warehouseInventories.some(i => i.warehouseId === target.id))
        await tx.warehouseInventory.create({ data: { warehouseId: target.id, productId: product.id, quantity: product.stock } });
      await tx.$executeRaw`UPDATE "Product" SET "managedByWarehouseId"=NULL, "updatedAt"=${product.updatedAt.toISOString()}::timestamp WHERE id=${product.id} AND "organizationId"=${input.organizationId}`;
    }
    await tx.warehouse.updateMany({ where: { catalogOrganizationId: input.organizationId }, data: { catalogOrganizationId: null } });
    const after = await readState(tx, input.organizationId);
    const receiptIds = before.receipts.map(r => r.id);
    const receiptsAfter = await tx.warehouseGoodsReceiptItem.findMany({ where: { id: { in: receiptIds } }, orderBy: { id: "asc" }, include: { receipt: { select: { warehouseId: true } } } });
    const withoutProduct = (rows: typeof receiptsAfter) => rows.map(({ productId: _product, ...row }) => row);
    if (hash(withoutProduct(before.receipts)) !== hash(withoutProduct(receiptsAfter))) throw new Error("Receipt history changed; rolling back");
    const ledgerAfter = await tx.inventoryLedger.findMany({ where: { id: { in: before.ledger.map(row => row.id) } }, orderBy: { id: "asc" } });
    const ledgerBusinessData = (rows: typeof ledgerAfter) => rows.map(({ productId: _product, ...row }) => row);
    if (hash(ledgerBusinessData(before.ledger)) !== hash(ledgerBusinessData(ledgerAfter))) throw new Error("Inventory history changed; rolling back");
    const unchanged = (state: typeof before) => state.products.map(({ managedByWarehouseId: _manager, warehouseInventories: _inventory, ...product }) => product);
    if (hash(unchanged(before)) !== hash(unchanged(after))) throw new Error("Vendor business data changed; rolling back");
    for (const mapping of mappings) {
      const inventory = await tx.warehouseInventory.findUniqueOrThrow({ where: { warehouseId_productId: { warehouseId: mapping.warehouseId, productId: mapping.warehouseProductId } } });
      if (inventory.quantity !== mapping.stock) throw new Error("Warehouse stock changed; rolling back");
    }
    await tx.auditLog.update({ where: { id: audit.id }, data: { meta: json({ operation: "SPLIT_CATALOG_PRESERVE_BOTH", version: 2, snapshotEncoding: "gzip-base64-parts", snapshotParts, beforeFingerprint: hash(before), report, mappings, targetId: target.id, afterFingerprint: hash(after) }) } });
    if (input.rollbackAfterValidation) throw new Error("CATALOG_REHEARSAL_PASSED_ROLLED_BACK");
    return { ...report, applied: true, auditId: audit.id };
  }, { isolationLevel: "Serializable", timeout: 120000 });
}
