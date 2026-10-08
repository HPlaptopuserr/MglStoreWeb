import { Prisma, WarehouseType } from "@mgl/database";

/** Call inside the stock mutation transaction. The organization lock serializes
 * first-use creation across product imports, POS receipts and catalog edits. */
export async function resolveProductInventoryWarehouse(
  tx: Prisma.TransactionClient,
  organizationId: string | null,
  productId: string,
  createdById?: string | null,
  initializeUnassignedStock = false,
): Promise<string | null> {
  const product = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    select: { organizationId: true, managedByWarehouseId: true, stock: true },
  });
  // Explicitly managed distribution products keep their admin warehouse.
  if (product.managedByWarehouseId) return product.managedByWarehouseId;
  if (!organizationId) return null;
  if (product.organizationId !== organizationId) {
    throw new Error("Бараа энэ байгууллагад харьяалагдахгүй байна");
  }
  await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
  // An explicit shared catalog routes both portals to the same physical stock.
  // Distribution assignments alone must never enable this behavior.
  const catalogWarehouse = await tx.warehouse.findUnique({
    where: { catalogOrganizationId: organizationId },
    select: { id: true, isActive: true, deletedAt: true },
  });
  if (catalogWarehouse) {
    if (!catalogWarehouse.isActive || catalogWarehouse.deletedAt) {
      throw new Error("Холбогдсон агуулах идэвхгүй байна");
    }
    const otherInventory = await tx.warehouseInventory.findFirst({
      where: { productId, warehouseId: { not: catalogWarehouse.id } },
      select: { id: true },
    });
    if (otherInventory)
      throw new Error("Барааны агуулахын холбоосыг эхлээд тулгана уу");
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
  // Existing explicit distribution inventory remains valid. Legacy vendor
  // registrations are normalized by the guarded maintenance command.
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
        warehouse.deletedAt !== null ||
        !warehouse.organizations.some(
          (link) => link.organizationId === organizationId,
        ),
    )
  ) {
    throw new Error(
      "Барааны агуулахын холбоосыг засах шаардлагатай. Админд хандана уу.",
    );
  }
  if (inventories.length > 1) {
    throw new Error(
      "Бараа олон агуулахад байна. Агуулахыг тодорхой сонгоно уу.",
    );
  }
  if (inventories[0]) return inventories[0].warehouseId;
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
