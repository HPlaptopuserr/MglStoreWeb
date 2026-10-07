import { Prisma, WarehouseType } from "@mgl/database";

/** Call inside the stock mutation transaction. The organization lock serializes
 * first-use creation across product imports, POS receipts and catalog edits. */
export async function resolveProductInventoryWarehouse(
  tx: Prisma.TransactionClient,
  organizationId: string | null,
  productId: string,
  createdById?: string | null,
): Promise<string | null> {
  const product = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    select: { organizationId: true, managedByWarehouseId: true },
  });
  // Explicitly managed distribution products keep their admin warehouse.
  if (product.managedByWarehouseId) return product.managedByWarehouseId;
  if (!organizationId) return null;
  if (product.organizationId !== organizationId) {
    throw new Error("Бараа энэ байгууллагад харьяалагдахгүй байна");
  }
  await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
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
  if (assignment) return assignment.warehouseId;
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
  return warehouse.id;
}
