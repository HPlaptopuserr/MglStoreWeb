import { prisma, type Prisma } from "@mgl/database";

/** Procurement access only: this never grants warehouse management access. */
export async function procurementWarehouseWhere(
  organizationId: string,
): Promise<Prisma.WarehouseWhereInput> {
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null, status: "ACTIVE" },
    select: { type: true },
  });
  if (!organization) return { id: { in: [] } };
  return {
    type: "CENTRAL",
    isActive: true,
    deletedAt: null,
    // All active vendors can procure. Preserve explicit assignments for other
    // organization types without exposing their internal warehouse inventory.
    ...(organization.type === "VENDOR"
      ? {}
      : { organizations: { some: { organizationId } } }),
  };
}

export async function canProcureFromWarehouse(
  organizationId: string,
  warehouseId: string,
): Promise<boolean> {
  const scope = await procurementWarehouseWhere(organizationId);
  return Boolean(
    await prisma.warehouse.findFirst({
      where: { AND: [scope, { id: warehouseId }] },
      select: { id: true },
    }),
  );
}
