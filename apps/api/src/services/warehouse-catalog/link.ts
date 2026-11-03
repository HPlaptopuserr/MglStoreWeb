export class WarehouseCatalogConflict extends Error {}

export interface LinkWarehouseCatalogInput {
  warehouseId: string;
  organizationId: string;
  apply?: boolean;
}

/** Catalog merging is disabled: warehouse and vendor identities must stay separate. */
export async function linkWarehouseCatalog(_input: LinkWarehouseCatalogInput): Promise<never> {
  throw new WarehouseCatalogConflict("Vendor болон агуулах тусдаа барааны сантай байна. Барааны сан нэгтгэх боломжгүй.");
}
