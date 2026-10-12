import type { Prisma } from "@mgl/database";

/** An unassigned warehouse owns its catalog directly; it needs no business tenant. */
export function warehouseProductOwnerScope(
  warehouseId: string,
  organizationId: string | null,
): Prisma.ProductWhereInput {
  return organizationId
    ? { organizationId }
    : { managedByWarehouseId: warehouseId };
}

export function warehouseProductReadScope(
  warehouseId: string,
  _organizationIds: readonly string[],
  catalogOrganizationId?: string | null,
): Prisma.ProductWhereInput {
  if (catalogOrganizationId) return { organizationId: catalogOrganizationId };
  return {
    OR: [
      { managedByWarehouseId: warehouseId },
      { warehouseInventories: { some: { warehouseId } } },
    ],
  };
}

/** Distribution customers are not catalog owners. Sharing requires an explicit link. */
export function warehouseCatalogOwner(warehouse: {
  catalogOrganizationId: string | null;
  organizations: readonly { organizationId: string }[];
}): string | null {
  return warehouse.catalogOrganizationId ?? null;
}
