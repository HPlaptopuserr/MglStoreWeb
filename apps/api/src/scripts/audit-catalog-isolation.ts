import "../config/env";
import { prisma, Prisma } from "@mgl/database";

/** Read-only deployment gate. No repair, relinking, or inventory writes. */
async function main() {
  const report = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const conflicts = await tx.$queryRaw<Array<{ kind: string; count: number }>>(Prisma.sql`
      SELECT 'mixed_product_ownership' AS kind, COUNT(*)::integer AS count
      FROM "Product" WHERE "deletedAt" IS NULL
        AND "organizationId" IS NOT NULL AND "managedByWarehouseId" IS NOT NULL
      UNION ALL
      SELECT 'legacy_shared_catalog', COUNT(*)::integer FROM "Warehouse"
        WHERE "deletedAt" IS NULL AND "catalogOrganizationId" IS NOT NULL
      UNION ALL
      SELECT 'invalid_inventory_ownership', COUNT(*)::integer
      FROM "WarehouseInventory" i JOIN "Product" p ON p.id=i."productId"
      JOIN "Warehouse" w ON w.id=i."warehouseId"
      WHERE p."deletedAt" IS NULL AND (
        (
          (w.type='CENTRAL' AND p."organizationId" IS NULL AND p."managedByWarehouseId"=w.id)
          OR (w.type='VENDOR_INTERNAL' AND p."managedByWarehouseId" IS NULL
            AND p."organizationId" IS NOT NULL
            AND (SELECT COUNT(*) FROM "WarehouseOrganization" a WHERE a."warehouseId"=w.id)=1
            AND EXISTS (SELECT 1 FROM "WarehouseOrganization" a WHERE a."warehouseId"=w.id AND a."organizationId"=p."organizationId"))
        )
      ) IS NOT TRUE
      UNION ALL
      SELECT 'inactive_warehouse_nonzero_stock', COUNT(*)::integer
      FROM "WarehouseInventory" i JOIN "Product" p ON p.id=i."productId"
      JOIN "Warehouse" w ON w.id=i."warehouseId"
      WHERE p."deletedAt" IS NULL AND i.quantity <> 0
        AND (NOT w."isActive" OR w."deletedAt" IS NOT NULL)
    `);
    const inactiveZeroInventoryRows = await tx.warehouseInventory.count({
      where: { quantity: 0, product: { deletedAt: null }, warehouse: { OR: [{ isActive: false }, { deletedAt: { not: null } }] } },
    });
    return { inactiveZeroInventoryRows, ownershipChecksPassed: conflicts.every(row => row.count === 0), conflicts };
  });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ownershipChecksPassed) process.exitCode = 2;
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Catalog audit failed");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
