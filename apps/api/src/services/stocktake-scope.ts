import type { Prisma } from "@mgl/database";
import { StocktakeError } from "./stocktake.policy";
type Tx = Prisma.TransactionClient;

export function stocktakeWarehouseFilter(
  organizationId: string,
): Prisma.WarehouseWhereInput {
  return {
    isActive: true,
    deletedAt: null,
    type: "VENDOR_INTERNAL",
    organizations: {
      some: { organizationId },
      every: { organizationId },
    },
  };
}

export async function assertStocktakeScope(
  tx: Tx,
  organizationId: string,
  warehouseId: string | null,
) {
  const organization = await tx.organization.findFirst({
    where: { id: organizationId, deletedAt: null, status: "ACTIVE" },
    select: { id: true, catalogWarehouse: { select: { id: true } } },
  });
  if (!organization)
    throw new StocktakeError("Байгууллага идэвхгүй байна", 403);
  if (
    warehouseId &&
    !(await tx.warehouse.findFirst({
      where: {
        id: warehouseId,
        ...stocktakeWarehouseFilter(organizationId),
      },
      select: { id: true },
    }))
  )
    throw new StocktakeError("Энэ агуулахад тооллого хийх эрхгүй байна", 403);
  return null;
}
