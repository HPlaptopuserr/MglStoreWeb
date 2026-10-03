import type { Prisma } from "@mgl/database";

/** An unassigned warehouse owns its catalog directly; it needs no business tenant. */
export function warehouseProductOwnerScope(
  warehouseId: string,
  organizationId: string | null,
): Prisma.ProductWhereInput {
  return organizationId
    ? { organizationId }
    : { organizationId: null, managedByWarehouseId: warehouseId };
}

export function warehouseProductReadScope(
  warehouseId: string,
  organizationIds: readonly string[],
): Prisma.ProductWhereInput {
  return {
    OR: [
      { managedByWarehouseId: warehouseId },
      { warehouseInventories: { some: { warehouseId } } },
      ...(organizationIds.length
        ? [{ organizationId: { in: [...organizationIds] } }]
        : []),
    ],
  };
}
