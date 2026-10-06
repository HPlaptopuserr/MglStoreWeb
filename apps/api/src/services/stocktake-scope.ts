import type { Prisma } from "@mgl/database";
import { StocktakeError } from "./stocktake.policy";
type Tx = Prisma.TransactionClient;
export async function assertStocktakeScope(
  tx: Tx,
  organizationId: string,
  warehouseId: string | null,
) {
  const organization = await tx.organization.findFirst({
    where: { id: organizationId, deletedAt: null, status: "ACTIVE" },
    select: { id: true },
  });
  if (!organization)
    throw new StocktakeError("Байгууллага идэвхгүй байна", 403);
  if (
    warehouseId &&
    !(await tx.warehouse.findFirst({
      where: {
        id: warehouseId,
        type: "VENDOR_INTERNAL",
        isActive: true,
        deletedAt: null,
        organizations: { some: { organizationId } },
      },
      select: { id: true },
    }))
  )
    throw new StocktakeError("Энэ агуулахад тооллого хийх эрхгүй байна", 403);
}
