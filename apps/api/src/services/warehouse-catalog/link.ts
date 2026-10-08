import { Prisma, prisma } from "@mgl/database";
import { catalogIdentityConflicts } from "./policy";

export class WarehouseCatalogConflict extends Error {}

export interface LinkWarehouseCatalogInput {
  warehouseId: string;
  organizationId: string;
  apply?: boolean;
}

/** Explicit, opt-in maintenance operation. Does not change operator access,
 * distribution assignments, product IDs, orders, or historical ledger entries. */
export async function linkWarehouseCatalog(input: LinkWarehouseCatalogInput) {
  const { warehouseId, organizationId, apply = false } = input;
  if (!warehouseId || !organizationId)
    throw new WarehouseCatalogConflict("Агуулах, байгууллагын ID шаардлагатай");
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "Warehouse" WHERE "id" = ${warehouseId} FOR UPDATE`;
      const [warehouse, organization] = await Promise.all([
        tx.warehouse.findFirst({
          where: {
            id: warehouseId,
            deletedAt: null,
            isActive: true,
            type: "CENTRAL",
          },
        }),
        tx.organization.findFirst({
          where: { id: organizationId, deletedAt: null, status: "ACTIVE" },
        }),
      ]);
      if (!warehouse || !organization)
        throw new WarehouseCatalogConflict(
          "Идэвхтэй төв агуулах эсвэл байгууллага олдсонгүй",
        );
      if (
        warehouse.catalogOrganizationId &&
        warehouse.catalogOrganizationId !== organizationId
      ) {
        throw new WarehouseCatalogConflict(
          "Агуулах өөр байгууллагын сантай холбогдсон байна",
        );
      }
      const otherLink = await tx.warehouse.findUnique({
        where: { catalogOrganizationId: organizationId },
      });
      if (otherLink && otherLink.id !== warehouseId)
        throw new WarehouseCatalogConflict(
          "Байгууллага өөр агуулахын сантай холбогдсон байна",
        );

      const products = await tx.product.findMany({
        where: {
          OR: [{ organizationId }, { managedByWarehouseId: warehouseId }],
        },
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
          organizationId: true,
          managedByWarehouseId: true,
          stock: true,
          sku: true,
          barcode: true,
          barcodeAliases: true,
          masterProductId: true,
          deletedAt: true,
          warehouseInventories: {
            include: {
              warehouse: {
                select: {
                  type: true,
                  isActive: true,
                  deletedAt: true,
                  organizations: { select: { organizationId: true } },
                },
              },
            },
          },
        },
      });
      const conflicts = catalogIdentityConflicts(products);
      if (conflicts.length)
        throw new WarehouseCatalogConflict(
          `Давхардсан барааг эхлээд тулгана уу: ${conflicts.slice(0, 10).join("; ")}`,
        );
      const ids = products.map((product) => product.id);
      if (ids.length)
        await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`;
      const sourceWarehouseIds = new Set<string>();
      for (const product of products) {
        if (
          product.managedByWarehouseId &&
          product.managedByWarehouseId !== warehouseId
        ) {
          throw new WarehouseCatalogConflict(
            `${product.name}: өөр төв агуулахын удирдлагатай бараа`,
          );
        }
        if (product.warehouseInventories.length > 1)
          throw new WarehouseCatalogConflict(
            `${product.name}: олон агуулахын үлдэгдлийг эхлээд тулгана уу`,
          );
        const inventory = product.warehouseInventories[0];
        if (!inventory) continue;
        if (inventory.quantity !== product.stock)
          throw new WarehouseCatalogConflict(
            `${product.name}: бараа болон агуулахын үлдэгдэл зөрүүтэй`,
          );
        if (inventory.warehouseId === warehouseId) continue;
        const source = inventory.warehouse;
        if (
          source.type !== "VENDOR_INTERNAL" ||
          !source.isActive ||
          source.deletedAt ||
          source.organizations.length !== 1 ||
          source.organizations[0].organizationId !== organizationId
        ) {
          throw new WarehouseCatalogConflict(
            `${product.name}: өөр байгууллагын агуулахын үлдэгдлийг шилжүүлэх боломжгүй`,
          );
        }
        sourceWarehouseIds.add(inventory.warehouseId);
      }
      if (
        await tx.warehouseInventory.count({
          where: { warehouseId, productId: { notIn: ids } },
        })
      ) {
        throw new WarehouseCatalogConflict(
          "Агуулахад бусад эзэмшигчийн бараа байна. Эхлээд тулгалт хийнэ үү",
        );
      }
      if (
        await tx.stocktake.count({
          where: {
            status: { in: ["DRAFT", "REVIEW"] },
            OR: [
              { organizationId },
              { warehouseId: { in: [warehouseId, ...sourceWarehouseIds] } },
            ],
          },
        })
      ) {
        throw new WarehouseCatalogConflict(
          "Нээлттэй тооллого байна. Тооллогоо дуусгасны дараа холбоно уу",
        );
      }
      const report = {
        applied: apply,
        warehouseId,
        warehouseName: warehouse.name,
        organizationId,
        organizationName: organization.name,
        productCount: products.length,
        movedInventoryCount: products.filter(
          (p) =>
            p.warehouseInventories[0] &&
            p.warehouseInventories[0].warehouseId !== warehouseId,
        ).length,
        initializedInventoryCount: products.filter(
          (p) => !p.warehouseInventories.length,
        ).length,
      };
      if (!apply) return report;
      // Preserve the original ownership and inventory locations durably in the
      // same transaction. A repeat run must never replace the original snapshot.
      await tx.auditLog.upsert({
        where: { id: `warehouse-catalog-link:${warehouseId}` },
        create: {
          id: `warehouse-catalog-link:${warehouseId}`,
          action: "WAREHOUSE_CATALOG_LINKED",
          meta: JSON.parse(JSON.stringify({
            report,
            previousCatalogOrganizationId: warehouse.catalogOrganizationId,
            products,
          })) as Prisma.InputJsonValue,
        },
        update: {},
      });
      await tx.warehouse.update({
        where: { id: warehouseId },
        data: { catalogOrganizationId: organizationId },
      });
      for (const product of products) {
        await tx.product.update({
          where: { id: product.id },
          data: { organizationId, managedByWarehouseId: warehouseId },
        });
        const inventory = product.warehouseInventories[0];
        if (inventory?.warehouseId === warehouseId) continue;
        if (inventory) {
          await tx.warehouseInventory.update({
            where: { id: inventory.id },
            data: { warehouseId },
          });
          if (inventory.quantity !== 0)
            await tx.inventoryLedger.create({
              data: {
                productId: product.id,
                warehouseId: inventory.warehouseId,
                change: -inventory.quantity,
                reason: "TRANSFER_OUT",
                referenceType: "SHARED_CATALOG_LINK",
                referenceId: warehouseId,
                note: `Shared catalog linked to ${warehouseId}`,
              },
            });
        } else {
          await tx.warehouseInventory.create({
            data: {
              warehouseId,
              productId: product.id,
              quantity: product.stock,
            },
          });
        }
        if (product.stock !== 0)
          await tx.inventoryLedger.create({
            data: {
              productId: product.id,
              warehouseId,
              change: product.stock,
              reason: "TRANSFER_IN",
              referenceType: "SHARED_CATALOG_LINK",
              referenceId: warehouseId,
              note: inventory
                ? `Shared catalog transferred from ${inventory.warehouseId}`
                : "Existing product stock assigned to shared catalog",
            },
          });
      }
      return report;
    },
    { isolationLevel: "Serializable", timeout: 60_000 },
  );
}
