import { Prisma, WarehouseType } from "@mgl/database";
import { assertWarehouseProductsOwned, WarehouseProductOwnershipError } from "./warehouse-product-ownership";

export class ProductInventoryConflictError extends Error {
  readonly status = 409;
}

/** Acquire before product mutations when a transaction also resolves vendor stock. */
export async function lockOrganizationInventory(
  tx: Pick<Prisma.TransactionClient, "$queryRaw">,
  organizationId: string | null,
): Promise<void> {
  if (organizationId) {
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
  }
}

/** Call inside the stock mutation transaction. The organization lock serializes
 * first-use creation across product imports, POS receipts and catalog edits. */
export async function resolveProductInventoryWarehouse(
  tx: Prisma.TransactionClient,
  organizationId: string | null,
  productId: string,
  createdById?: string | null,
  initializeUnassignedStock = false,
): Promise<string | null> {
  await lockOrganizationInventory(tx, organizationId);
  await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
  const product = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    select: { organizationId: true, managedByWarehouseId: true, stock: true },
  });
  if (product.organizationId !== organizationId) {
    throw new ProductInventoryConflictError("Бараа энэ байгууллагад харьяалагдахгүй байна");
  }
  const verifyWarehouse = async (warehouseId: string) => {
    try {
      await assertWarehouseProductsOwned(tx, warehouseId, [productId]);
    } catch (error) {
      if (error instanceof WarehouseProductOwnershipError) {
        throw new ProductInventoryConflictError(error.message);
      }
      throw error;
    }
    return warehouseId;
  };
  if (product.managedByWarehouseId) {
    const managedWarehouse = await tx.warehouse.findUnique({
      where: { id: product.managedByWarehouseId },
      select: { type: true, catalogOrganizationId: true },
    });
    if (organizationId && managedWarehouse?.type === WarehouseType.CENTRAL &&
      managedWarehouse.catalogOrganizationId !== organizationId) {
      throw new ProductInventoryConflictError("Энэ бараа төв агуулахын бүртгэлд байна. Дэлгүүрийн өөрийн барааг сонгоно уу.");
    }
    return verifyWarehouse(product.managedByWarehouseId);
  }
  if (!organizationId) return null;
  // An explicit shared catalog routes both portals to the same physical stock.
  // Distribution assignments alone must never enable this behavior.
  const catalogWarehouse = await tx.warehouse.findUnique({
    where: { catalogOrganizationId: organizationId },
    select: { id: true, isActive: true, deletedAt: true },
  });
  if (catalogWarehouse) {
    if (!catalogWarehouse.isActive || catalogWarehouse.deletedAt) {
      throw new ProductInventoryConflictError("Холбогдсон агуулах идэвхгүй байна");
    }
    const otherInventory = await tx.warehouseInventory.findFirst({
      where: { productId, warehouseId: { not: catalogWarehouse.id } },
      select: { id: true },
    });
    if (otherInventory)
      throw new ProductInventoryConflictError("Барааны агуулахын холбоосыг эхлээд тулгана уу");
    await verifyWarehouse(catalogWarehouse.id);
    await tx.product.update({
      where: { id: productId },
      data: { managedByWarehouseId: catalogWarehouse.id },
    });
    await tx.warehouseInventory.upsert({
      where: {
        warehouseId_productId: { warehouseId: catalogWarehouse.id, productId },
      },
      create: {
        warehouseId: catalogWarehouse.id,
        productId,
        quantity: initializeUnassignedStock ? product.stock : 0,
      },
      update: {},
    });
    return catalogWarehouse.id;
  }
  // Legacy distribution links require an evidence-backed ownership repair;
  // customer assignments must never route a store sale into central stock.
  const inventories = await tx.warehouseInventory.findMany({
    where: { productId },
    select: {
      warehouseId: true,
      warehouse: {
        select: {
          type: true,
          isActive: true,
          deletedAt: true,
          organizations: { select: { organizationId: true } },
        },
      },
    },
  });
  if (
    inventories.some(
      ({ warehouse }) =>
        !warehouse.isActive ||
        warehouse.type !== WarehouseType.VENDOR_INTERNAL ||
        warehouse.deletedAt !== null ||
        warehouse.organizations.length !== 1 ||
        !warehouse.organizations.some(
          (link) => link.organizationId === organizationId,
        ),
    )
  ) {
    throw new ProductInventoryConflictError(
      "Барааны агуулахын холбоосыг засах шаардлагатай. Админд хандана уу.",
    );
  }
  if (inventories.length > 1) {
    throw new ProductInventoryConflictError(
      "Бараа олон агуулахад байна. Агуулахыг тодорхой сонгоно уу.",
    );
  }
  if (inventories[0]) return verifyWarehouse(inventories[0].warehouseId);
  const assignment = await tx.warehouseOrganization.findFirst({
    where: {
      organizationId,
      warehouse: {
        type: WarehouseType.VENDOR_INTERNAL,
        isActive: true,
        deletedAt: null,
      },
    },
    orderBy: [{ assignedAt: "asc" }, { warehouseId: "asc" }],
    select: { warehouseId: true },
  });
  const initialize = async (warehouseId: string) => {
    await verifyWarehouse(warehouseId);
    // POS may encounter older products whose stock was kept directly on Product.
    // Preserve that baseline before adjustStock applies the new movement.
    if (initializeUnassignedStock && product.stock !== 0) {
      await tx.warehouseInventory.create({
        data: { warehouseId, productId, quantity: product.stock },
      });
    }
    return warehouseId;
  };
  if (assignment) return initialize(assignment.warehouseId);
  const organization = await tx.organization.findFirstOrThrow({
    where: { id: organizationId, deletedAt: null },
    select: { name: true, address: true },
  });
  const warehouse = await tx.warehouse.create({
    data: {
      name: `${organization.name} - Үндсэн агуулах`,
      address: organization.address || "Vendor барааны үндсэн агуулах",
      type: WarehouseType.VENDOR_INTERNAL,
      createdById: createdById ?? null,
      organizations: {
        create: { organizationId, assignedById: createdById ?? null },
      },
    },
    select: { id: true },
  });
  return initialize(warehouse.id);
}
