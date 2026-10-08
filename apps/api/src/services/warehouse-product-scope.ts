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
  catalogOrganizationId?: string | null,
): Prisma.ProductWhereInput {
  if (catalogOrganizationId) return { organizationId: catalogOrganizationId };
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

/** Only an explicitly linked catalog overrides the existing warehouse behavior. */
export function warehouseCatalogOwner(warehouse: {
  catalogOrganizationId: string | null;
  organizations: readonly { organizationId: string }[];
}): string | null {
  return (
    warehouse.catalogOrganizationId ??
    warehouse.organizations[0]?.organizationId ??
    null
  );
}
