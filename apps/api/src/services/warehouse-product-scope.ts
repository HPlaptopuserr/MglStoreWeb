import type { Prisma } from "@mgl/database";

/** Distribution assignments and legacy shared links never confer ownership. */
export function warehouseProductOwnerScope(
  warehouseId: string,
  _organizationId?: string | null,
): Prisma.ProductWhereInput {
  return { organizationId: null, managedByWarehouseId: warehouseId };
}

export function warehouseProductReadScope(
  warehouseId: string,
  _organizationIds: readonly string[] = [],
  _catalogOrganizationId?: string | null,
): Prisma.ProductWhereInput {
  return warehouseProductOwnerScope(warehouseId);
}

/** Warehouse products are never created under a vendor organization. */
export function warehouseCatalogOwner(_warehouse: {
  catalogOrganizationId: string | null;
  organizations: readonly { organizationId: string }[];
}): null {
  return null;
}

/** Central warehouse inventory must never leak through legacy vendor ownership. */
export function vendorProductReadScope(): Prisma.ProductWhereInput {
  return {
    managedByWarehouseId: null,
    warehouseInventories: { none: { warehouse: { type: "CENTRAL" } } },
  };
}
